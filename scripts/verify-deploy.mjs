#!/usr/bin/env node
// Post-deploy production verification for waseemilyas.uk.
//
// Proves that the custom production domain is serving EXACTLY the revision
// that was just deployed, by fetching `/revision.txt` — the machine-readable
// artifact every production build emits (exactly the built 40-char commit SHA
// plus one newline) — capturing the response body, and comparing it
// byte-for-byte against the expected revision. Status codes alone certify
// nothing here: the body IS the claim.
//
// Pages/CDN propagation is asynchronous, so requests are cache-busted and
// retried within bounded limits; exhausted retries, timeouts, HTTP errors,
// malformed bodies and stale revisions all leave this script non-zero so the
// workflow goes red with a concise diagnostic. Nothing secret is ever printed:
// URLs are sanitised of userinfo, and diagnostics NEVER include response
// content — a malformed body is reported only by safe metadata (byte count
// and classification), because another application answering on that URL
// could put credentials in its response.
//
// Self-proving mode (--prove-verification) runs the verifier against an
// address that cannot serve, states up front that failure is the required
// outcome, performs no deploy, and FAILS if the probe unexpectedly passes —
// so the gate's ability to fail is itself checked on every run.
//
// Dependency-free: Node built-ins only (global fetch).
//
// Usage:
//   node scripts/verify-deploy.mjs --url https://waseemilyas.uk/revision.txt \
//        [--revision <40-char sha>] [--attempts N] [--backoff-ms N] [--timeout-ms N]
//   node scripts/verify-deploy.mjs --prove-verification [--prove-url http://127.0.0.1:9/revision.txt]
//
// --revision defaults to the same resolution as the build
// (SITE_REVISION > GITHUB_SHA > git rev-parse HEAD).

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { assertRevision, resolveRevision } from "./revision.mjs";

export const DEFAULT_URL = "https://waseemilyas.uk/revision.txt";
export const DEFAULT_PROVE_URL = "http://127.0.0.1:9/revision.txt"; // loopback discard port: refuses connections

/** Hide any userinfo credentials before a URL is printed anywhere. */
export function sanitizeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.username || u.password) {
      u.username = "***";
      u.password = "***";
    }
    return u.toString();
  } catch {
    return "<unparseable-url>";
  }
}

/** Cache-bust so CDNs cannot answer with a cached earlier revision. */
export function cacheBustUrl(rawUrl, token) {
  const u = new URL(rawUrl);
  u.searchParams.set("cb", String(token));
  return u.toString();
}

/**
 * Describe a malformed body WITHOUT reproducing any of it. Diagnostics must
 * never emit response content: a malformed body means something other than
 * our own artifact answered, and that something could include secrets.
 */
export function describeMalformedBody(bodyText) {
  const bytes = Buffer.byteLength(bodyText);
  const shape =
    bodyText.length === 0
      ? "empty"
      : /^[0-9a-f]+\n?$/.test(bodyText)
        ? "hex-like but wrong length/termination"
        : "non-revision content";
  return `${bytes} byte(s), ${shape}; content withheld from diagnostics`;
}

/**
 * One bounded fetch of the revision artifact.
 * Resolves { status, body } on ANY HTTP response; rejects { name, message }
 * on transport-level failure (connection refused, DNS, abort/timeout…).
 */
async function fetchAttempt(url, timeoutMs, fetchImpl) {
  try {
    const res = await fetchImpl(url, {
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const body = await res.text();
    return { status: res.status, body };
  } catch (err) {
    throw Object.assign(new Error(`${err?.name ?? "Error"}: ${err?.message ?? err}`), {
      name: err?.name ?? "Error",
    });
  }
}

/**
 * Classify a captured response body against the expected revision.
 * Mirrors the rendered-site checker exactly: the body must be EXACTLY the
 * 40-char SHA followed by one newline. Anything else is either malformed
 * (wrong shape — e.g. another application's HTML) or stale (a well-formed
 * older revision).
 */
export function classifyBody(bodyText, expectedRevision) {
  if (bodyText === `${expectedRevision}\n`) return { kind: "match", revision: expectedRevision };
  const body = bodyText.endsWith("\n") ? bodyText.slice(0, -1) : bodyText;
  if (!/^[0-9a-f]{40}$/.test(body) || bodyText !== `${body}\n`) return { kind: "malformed" };
  return { kind: "stale", got: body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Validate the retry controls BEFORE the retry loop runs. Attempts must be a
 * positive integer; timeout must be a finite positive number of milliseconds;
 * backoff must be finite and non-negative. Rejecting zero/NaN/negative here is
 * what guarantees the loop always executes at least once and therefore always
 * has a concrete failure to report — no null dereference on exhaustion.
 */
export function validateControls({ attempts, backoffMs, timeoutMs }) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(
      `invalid --attempts ${JSON.stringify(attempts)}: expected a positive integer`
    );
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `invalid --timeout-ms ${JSON.stringify(timeoutMs)}: expected a finite positive number of milliseconds`
    );
  }
  if (!Number.isFinite(backoffMs) || backoffMs < 0) {
    throw new Error(
      `invalid --backoff-ms ${JSON.stringify(backoffMs)}: expected a finite non-negative number of milliseconds`
    );
  }
  return { attempts, backoffMs, timeoutMs };
}

/**
 * Verify that `url` serves exactly `revision`.
 *
 * @param {object} options
 * @param {string} options.url revision-artifact URL to probe
 * @param {string} options.revision expected full 40-char SHA
 * @param {number} [options.attempts] total tries across all failure classes (default 6)
 * @param {number} [options.backoffMs] wait between tries (default 2000)
 * @param {number} [options.timeoutMs] per-request timeout (default 10000)
 * @param {typeof fetch} [options.fetchImpl] injectable fetch (tests)
 * @param {(ms: number) => Promise<void>} [options.sleepImpl] injectable delay (tests)
 * @returns {Promise<{ok:true, attempts:number, status:number, body:string}
 *                 |{ok:false, reason:"network"|"http"|"mismatch"|"malformed",
 *                   attempts:number, detail:string}>}
 */
export async function verifyDeploy({
  url,
  revision,
  attempts = 6,
  backoffMs = 2000,
  timeoutMs = 10000,
  fetchImpl = fetch,
  sleepImpl = sleep,
} = {}) {
  assertRevision(revision, "expected revision");
  validateControls({ attempts, backoffMs, timeoutMs });
  let last = null;
  for (let i = 1; i <= attempts; i++) {
    const busted = cacheBustUrl(url, `${Date.now()}-${i}`);
    let res = null;
    try {
      res = await fetchAttempt(busted, timeoutMs, fetchImpl);
    } catch (err) {
      last = { reason: "network", detail: `attempt ${i}: request failed (${err.message})` };
    }
    if (res) {
      if (res.status !== 200) {
        last = { reason: "http", detail: `attempt ${i}: HTTP ${res.status}, ${Buffer.byteLength(res.body)} bytes` };
      } else {
        const cls = classifyBody(res.body, revision);
        if (cls.kind === "match") {
          return { ok: true, attempts: i, status: res.status, body: res.body };
        }
        last =
          cls.kind === "malformed"
            ? { reason: "malformed", detail: `attempt ${i}: body is not exactly the revision plus one newline (${describeMalformedBody(res.body)})` }
            : { reason: "mismatch", detail: `attempt ${i}: server serves ${cls.got}, expected ${revision} (stale copy?)` };
      }
    }
    if (i < attempts) await sleepImpl(backoffMs);
  }
  return { ok: false, reason: last.reason, attempts, detail: `${last.detail}; after ${attempts} attempt(s)` };
}

/**
 * The verifier's own proof: run it against an address that cannot serve and
 * require failure. Performs no deploy. Throws if the probe unexpectedly
 * passes (which would mean the gate cannot fail and certifies nothing).
 */
export async function proveVerification({
  url = DEFAULT_PROVE_URL,
  revision,
  attempts = 3,
  backoffMs = 250,
  timeoutMs = 3000,
  fetchImpl = fetch,
  sleepImpl = sleep,
} = {}) {
  console.log(
    `verify-deploy: PROVE MODE — expecting verification to FAIL against ${sanitizeUrl(url)}; failure is the required outcome; no deploy occurs.`
  );
  const result = await verifyDeploy({
    url,
    revision,
    attempts,
    backoffMs,
    timeoutMs,
    fetchImpl,
    sleepImpl,
  });
  if (result.ok) {
    throw new Error(
      `probe against ${sanitizeUrl(url)} unexpectedly PASSED — the verifier accepted a target that must not serve, so its failures prove nothing`
    );
  }
  console.log(
    `verify-deploy: PROVE MODE PASS — probe failed as required (${result.reason}: ${result.detail}); the gate can fail, and no deploy occurred.`
  );
  return result;
}

export function parseArgs(argv) {
  // A flag that is present must have a value; a following "--…" token or the
  // end of argv is a missing value, rejected loudly rather than silently
  // treated as unset.
  const flag = (name) => {
    const i = argv.indexOf(name);
    if (i < 0) return undefined;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`flag ${name} requires a value`);
    }
    return value;
  };
  const numFlag = (name) => {
    const raw = flag(name);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) {
      throw new Error(`flag ${name} value ${JSON.stringify(raw)} is not a number`);
    }
    return n;
  };
  const has = (name) => argv.includes(name);
  return {
    prove: has("--prove-verification"),
    proveUrl: flag("--prove-url"),
    url: flag("--url"),
    revision: flag("--revision"),
    attempts: numFlag("--attempts"),
    backoffMs: numFlag("--backoff-ms"),
    timeoutMs: numFlag("--timeout-ms"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.prove) {
    await proveVerification({
      url: args.proveUrl ?? args.url ?? DEFAULT_PROVE_URL,
      revision: args.revision ? assertRevision(args.revision, "--revision") : resolveRevision().revision,
      attempts: args.attempts,
      backoffMs: args.backoffMs,
      timeoutMs: args.timeoutMs,
    });
    return;
  }

  let expected;
  try {
    expected = args.revision ? assertRevision(args.revision, "--revision") : resolveRevision().revision;
  } catch (err) {
    console.error(`verify-deploy: ${err.message}`);
    process.exit(1);
  }

  const target = args.url ?? DEFAULT_URL;
  console.log(`verify-deploy: verifying ${sanitizeUrl(target)} serves revision ${expected}…`);
  const result = await verifyDeploy({
    url: target,
    revision: expected,
    attempts: args.attempts,
    backoffMs: args.backoffMs,
    timeoutMs: args.timeoutMs,
  });

  if (result.ok) {
    console.log(
      `verify-deploy: PASS — ${sanitizeUrl(target)} served the exact deployed revision ${expected} (HTTP ${result.status}, attempt ${result.attempts}/${args.attempts ?? 6}).`
    );
    return;
  }
  console.error(`verify-deploy: FAILED — ${sanitizeUrl(target)} does not serve revision ${expected}.`);
  console.error(`verify-deploy: ${result.reason}: ${result.detail}`);
  process.exit(1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((err) => {
    console.error(`verify-deploy: FAILED — ${err.message}`);
    process.exit(1);
  });
}
