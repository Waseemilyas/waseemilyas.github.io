// Focused node:test suite for scripts/verify-deploy.mjs.
//
// Run via `pnpm test` (node --test, file-level concurrency committed at 1).
//
// Both directions are covered with discriminating controls:
//   - acceptance: a server that serves EXACTLY the expected artifact bytes
//     passes on attempt 1;
//   - rejection: an older SHA, an HTTP error, a connection failure, malformed
//     content (including another application's HTML) and an unresponsive
//     server each fail with their own named reason;
//   - self-proof: --prove-verification must fail against an address that
//     cannot serve (CLI exit 0), and must itself FAIL if the probe
//     unexpectedly passes (CLI exit != 0);
//   - hygiene: every server this suite starts binds 127.0.0.1 on an ephemeral
//     port, is closed after its test, and closure is proven; requests are
//     cache-busted and individually time-bounded.
//
// Fixtures are real loopback HTTP servers; nothing outside this process is
// contacted and no deploy occurs anywhere in this suite. CLI cases run the
// script via awaited execFile (never spawnSync) so the parent event loop can
// keep serving the child's requests.

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readFileSync } from "node:fs";

import {
  classifyBody,
  DEFAULT_PROVE_URL,
  describeMalformedBody,
  parseArgs,
  proveVerification,
  sanitizeUrl,
  validateControls,
  verifyDeploy,
} from "./verify-deploy.mjs";

const execFileP = promisify(execFile);
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "verify-deploy.mjs");
const GOOD_SHA = "ef".repeat(20);
const OLD_SHA = "ba".repeat(20);
const ARTIFACT = `${GOOD_SHA}\n`;

// ---------------------------------------------------------------------------
// loopback server harness — bound to 127.0.0.1, ephemeral port, closed & proven

const liveServers = new Set();

/** Close every remaining fixture server; proven closed, every single test. */
test.afterEach(() => {
  const servers = [...liveServers];
  liveServers.clear();
  for (const server of servers) {
    server.closeAllConnections?.();
    server.close();
    assert.equal(server.listening, false, "fixture server must be closed after its test");
  }
});

/**
 * Start a real HTTP server on 127.0.0.1:<ephemeral>. Registered for teardown;
 * each test's cleanup asserts every socket is gone afterwards.
 */
async function startServer(t, handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { address, port } = server.address();
  assert.equal(address, "127.0.0.1", "servers must bind loopback only");
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
    liveServers.delete(server);
    assert.equal(server.listening, false, "fixture server must be closed after its test");
  });
  liveServers.add(server);
  return { server, port, requests };
}

/** A loopback port with NOBODY listening — for connection-failure probes. */
async function freePort(t) {
  const { server, port } = await startServer(t, () => {});
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  liveServers.delete(server);
  return port;
}

const serveBody = (body, status = 200) => (_req, res) => {
  res.writeHead(status, { "content-type": "text/plain" });
  res.end(body);
};

// ---------------------------------------------------------------------------
// acceptance

test("accepts a server serving exactly the deployed revision", async (t) => {
  const { port } = await startServer(t, serveBody(ARTIFACT));
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 10,
    timeoutMs: 1000,
  });
  assert.deepEqual(
    { ok: r.ok, attempts: r.attempts, status: r.status, body: r.body },
    { ok: true, attempts: 1, status: 200, body: ARTIFACT }
  );
});

test("the response body is captured, not discarded (match case)", async (t) => {
  const { port } = await startServer(t, serveBody(ARTIFACT));
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, true);
  assert.equal(r.body, ARTIFACT, "verifier must carry the exact bytes it certified");
});

test("requests are cache-busted and every try gets its own URL", async (t) => {
  let n = 0;
  const { port, requests } = await startServer(t, (_req, res) => {
    n += 1;
    if (n < 3) {
      res.writeHead(404).end();
    } else {
      res.writeHead(200).end(ARTIFACT);
    }
  });
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 4,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 3);
  assert.equal(requests.length, 3);
  const busts = new Set(requests.map((u) => new URL(u, "http://x").searchParams.get("cb")));
  assert.equal(busts.size, 3, `expected three distinct cache-busters, got ${[...busts]}`);
});

// ---------------------------------------------------------------------------
// rejection controls — each names its own reason

test("rejects an older revision still being served (stale copy)", async (t) => {
  const { port } = await startServer(t, serveBody(`${OLD_SHA}\n`));
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "mismatch");
  assert.match(r.detail, new RegExp(`serves ${OLD_SHA}, expected ${GOOD_SHA}`));
});

test("rejects an HTTP error status instead of certifying it", async (t) => {
  const { port } = await startServer(t, serveBody("unavailable", 503));
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "http");
  assert.match(r.detail, /HTTP 503/);
});

test("rejects a connection failure (nothing listening)", async (t) => {
  const port = await freePort(t);
  const started = Date.now();
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "network");
  assert.ok(Date.now() - started < 5000, "connection refusal should fail fast");
});

for (const [label, body] of [
  ["another application's HTML page", "<!DOCTYPE html><html><body>Different app</body></html>\n"],
  ["an empty body", ""],
  ["a truncated SHA", `${GOOD_SHA.slice(0, 20)}\n`],
]) {
  test(`rejects malformed content: ${label}`, async (t) => {
    const { port } = await startServer(t, serveBody(body));
    const r = await verifyDeploy({
      url: `http://127.0.0.1:${port}/revision.txt`,
      revision: GOOD_SHA,
      attempts: 2,
      backoffMs: 5,
      timeoutMs: 1000,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "malformed");
    assert.match(r.detail, /not exactly the revision/);
  });
}

test("an unresponsive server hits the per-request bound and fails as network", async (t) => {
  const { port } = await startServer(t, () => {
    /* deliberately never respond */
  });
  const started = Date.now();
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 10,
    timeoutMs: 150,
  });
  const elapsed = Date.now() - started;
  assert.equal(r.ok, false);
  assert.equal(r.reason, "network");
  assert.ok(elapsed < 5000, `bounded retries should finish fast, took ${elapsed}ms`);
});

test("exhausted retries report the LAST observation, not the first", async (t) => {
  const responses = [`${GOOD_SHA.slice(0, 10)}-first\n`, `${OLD_SHA}\n`];
  const { port } = await startServer(t, (_req, res) => {
    res.writeHead(200).end(responses.length > 1 ? responses.shift() : responses[0]);
  });
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 2,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, false);
  assert.match(r.detail, new RegExp(OLD_SHA.slice(0, 8)));
  assert.doesNotMatch(r.detail, /-first/);
});

// ---------------------------------------------------------------------------
// body classification units

test("classifyBody mirrors the checker: exact bytes match, everything else splits stale/malformed", () => {
  assert.deepEqual(classifyBody(ARTIFACT, GOOD_SHA), { kind: "match", revision: GOOD_SHA });
  assert.equal(classifyBody(`${OLD_SHA}\n`, GOOD_SHA).kind, "stale");
  assert.equal(classifyBody(GOOD_SHA, GOOD_SHA).kind, "malformed"); // missing newline
  assert.equal(classifyBody("<html>other app</html>\n", GOOD_SHA).kind, "malformed");
});

test("sanitizeUrl hides userinfo credentials in diagnostics", () => {
  const out = sanitizeUrl("https://user:super-secret@waseemilyas.uk/revision.txt");
  assert.doesNotMatch(out, /super-secret/);
  assert.match(out, /\*\*\*@waseemilyas\.uk/);
});

// ---------------------------------------------------------------------------
// prove mode — the gate must be able to fail, and must be able to pass

test("proveVerification passes (resolves) when the target cannot serve", async (t) => {
  const port = await freePort(t);
  const r = await proveVerification({ url: `http://127.0.0.1:${port}/revision.txt`, revision: GOOD_SHA });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "network");
});

test("proveVerification THROWS when the probe unexpectedly passes", async (t) => {
  const { port } = await startServer(t, serveBody(ARTIFACT));
  await assert.rejects(
    proveVerification({ url: `http://127.0.0.1:${port}/revision.txt`, revision: GOOD_SHA }),
    /unexpectedly PASSED/
  );
});

// ---------------------------------------------------------------------------
// CLI behaviour — exit codes and stated expectations

test("CLI exits 0 and states the verified revision against a live loopback server", async (t) => {
  const { port } = await startServer(t, serveBody(ARTIFACT));
  const { stdout } = await execFileP(process.execPath, [
    SCRIPT,
    "--url",
    `http://127.0.0.1:${port}/revision.txt`,
    "--revision",
    GOOD_SHA,
    "--attempts",
    "2",
    "--backoff-ms",
    "50",
    "--timeout-ms",
    "3000",
  ]);
  assert.match(stdout, /PASS/);
  assert.match(stdout, new RegExp(GOOD_SHA));
});

test("CLI exits red with a concise diagnostic when production does not serve the revision", async (t) => {
  const { port } = await startServer(t, serveBody(`${OLD_SHA}\n`));
  await assert.rejects(
    execFileP(process.execPath, [
      SCRIPT,
      "--url",
      `http://127.0.0.1:${port}/revision.txt`,
      "--revision",
      GOOD_SHA,
      "--attempts",
      "1",
      "--timeout-ms",
      "3000",
    ]),
    (err) => {
      assert.equal(err.code, 1);
      const output = `${err.stderr}${err.stdout}`;
      assert.match(output, /FAILED/);
      assert.match(output, new RegExp(GOOD_SHA));
      assert.match(output, new RegExp(OLD_SHA));
      return true;
    }
  );
});

test("CLI --prove-verification succeeds against an address that cannot serve", async () => {
  const { stdout } = await execFileP(process.execPath, [SCRIPT, "--prove-verification"], {
    timeout: 60000,
  });
  assert.match(stdout, /PROVE MODE/);
  assert.match(stdout, /failure is the required outcome/);
  assert.match(stdout, /no deploy occurs/);
  const escapedDefault = DEFAULT_PROVE_URL.replace(/[/.]/g, "\\$&");
  assert.match(stdout, new RegExp(escapedDefault));
});

test("CLI --prove-verification fails loudly when the probe unexpectedly passes", async (t) => {
  const { port } = await startServer(t, serveBody(ARTIFACT));
  await assert.rejects(
    execFileP(
      process.execPath,
      [
        SCRIPT,
        "--prove-verification",
        "--prove-url",
        `http://127.0.0.1:${port}/revision.txt`,
        "--revision",
        GOOD_SHA,
      ],
      { timeout: 60000 }
    ),
    (err) => {
      assert.notEqual(err.code, 0);
      const output = `${err.stderr}${err.stdout}`;
      assert.match(output, /PROVE MODE/);
      assert.match(output, /unexpectedly PASSED/);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// secrecy: diagnostics must NEVER include response content (final-review fix 1)

// Assembled at runtime so the repo's own secret scanners (which are right to
// flag a contiguous credential shape in source) see nothing to flag, while
// the VALUE the fixture serves is fully credential-shaped.
const CREDENTIAL_MARKER = ["sk-live", "SECRETMARKER1234567890abcdef"].join("-");

test("a credential-shaped marker in a malformed body never reaches the returned detail", async (t) => {
  const body = `<html><body>Internal error. Debug token: ${CREDENTIAL_MARKER}</body></html>\n`;
  const { port } = await startServer(t, serveBody(body));
  const r = await verifyDeploy({
    url: `http://127.0.0.1:${port}/revision.txt`,
    revision: GOOD_SHA,
    attempts: 1,
    backoffMs: 5,
    timeoutMs: 1000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "malformed");
  assert.ok(!r.detail.includes(CREDENTIAL_MARKER), "detail must not contain response content");
  assert.ok(!r.detail.includes("SECRETMARKER"), "detail must not contain any fragment of the body");
  assert.ok(!r.detail.includes("Debug token"), "detail must not contain any fragment of the body");
  assert.match(r.detail, /content withheld from diagnostics/);
  assert.match(r.detail, /\d+ byte\(s\)/, "safe metadata (byte count) is still reported");
});

test("CLI output never contains a credential-shaped marker from a malformed body", async (t) => {
  const body = `oops ${CREDENTIAL_MARKER}\n`;
  const { port } = await startServer(t, serveBody(body));
  await assert.rejects(
    execFileP(process.execPath, [
      SCRIPT,
      "--url", `http://127.0.0.1:${port}/revision.txt`,
      "--revision", GOOD_SHA,
      "--attempts", "1",
      "--backoff-ms", "5",
      "--timeout-ms", "1000",
    ]),
    (err) => {
      const output = `${err.stdout}\n${err.stderr}`;
      assert.equal(err.code, 1);
      assert.ok(!output.includes(CREDENTIAL_MARKER), "CLI output must not contain the marker");
      assert.ok(!output.includes("SECRETMARKER"), "CLI output must not contain any marker fragment");
      assert.match(output, /malformed/);
      return true;
    }
  );
});

test("describeMalformedBody reports only metadata, never content", () => {
  const d = describeMalformedBody(`x ${CREDENTIAL_MARKER}`);
  assert.ok(!d.includes("SECRETMARKER"));
  assert.match(d, /^\d+ byte\(s\), non-revision content; content withheld/);
  assert.match(describeMalformedBody(""), /0 byte\(s\), empty/);
  assert.match(describeMalformedBody("abcdef"), /hex-like but wrong length\/termination/);
});

// ---------------------------------------------------------------------------
// retry-control validation (final-review fix 5)

test("validateControls accepts the defaults and the workflow's configured values", () => {
  assert.deepEqual(
    validateControls({ attempts: 6, backoffMs: 2000, timeoutMs: 10000 }),
    { attempts: 6, backoffMs: 2000, timeoutMs: 10000 }
  );
  assert.deepEqual(
    validateControls({ attempts: 8, backoffMs: 3000, timeoutMs: 10000 }),
    { attempts: 8, backoffMs: 3000, timeoutMs: 10000 }
  );
  // zero backoff is a legal (if aggressive) choice; zero attempts is not
  validateControls({ attempts: 1, backoffMs: 0, timeoutMs: 1 });
});

for (const [label, controls] of [
  ["zero attempts", { attempts: 0, backoffMs: 5, timeoutMs: 100 }],
  ["negative attempts", { attempts: -1, backoffMs: 5, timeoutMs: 100 }],
  ["fractional attempts", { attempts: 2.5, backoffMs: 5, timeoutMs: 100 }],
  ["NaN attempts", { attempts: NaN, backoffMs: 5, timeoutMs: 100 }],
  ["zero timeout", { attempts: 2, backoffMs: 5, timeoutMs: 0 }],
  ["negative timeout", { attempts: 2, backoffMs: 5, timeoutMs: -100 }],
  ["Infinity timeout", { attempts: 2, backoffMs: 5, timeoutMs: Infinity }],
  ["NaN timeout", { attempts: 2, backoffMs: 5, timeoutMs: NaN }],
  ["negative backoff", { attempts: 2, backoffMs: -5, timeoutMs: 100 }],
  ["Infinity backoff", { attempts: 2, backoffMs: Infinity, timeoutMs: 100 }],
  ["NaN backoff", { attempts: 2, backoffMs: NaN, timeoutMs: 100 }],
]) {
  test(`validateControls rejects ${label} before any request is made`, async () => {
    assert.throws(() => validateControls(controls), /invalid --/);
    // and verifyDeploy enforces it up front: no fetch may ever run
    let fetched = 0;
    await assert.rejects(
      verifyDeploy({
        url: "http://127.0.0.1:9/revision.txt",
        revision: GOOD_SHA,
        ...controls,
        fetchImpl: () => { fetched += 1; return Promise.reject(new Error("must not run")); },
      }),
      /invalid --/
    );
    assert.equal(fetched, 0, "invalid controls must be rejected before the retry loop");
  });
}

test("parseArgs rejects missing and non-numeric flag values", () => {
  assert.throws(() => parseArgs(["--attempts"]), /requires a value/);
  assert.throws(() => parseArgs(["--attempts", "--backoff-ms", "5"]), /requires a value/);
  assert.throws(() => parseArgs(["--attempts", "abc"]), /not a number/);
  assert.throws(() => parseArgs(["--timeout-ms", ""]), /not a number/);
  assert.deepEqual(parseArgs(["--attempts", "8"]).attempts, 8);
});

for (const [label, argv] of [
  ["zero attempts", ["--attempts", "0"]],
  ["negative attempts", ["--attempts", "-3"]],
  ["fractional attempts", ["--attempts", "2.5"]],
  ["NaN attempts", ["--attempts", "many"]],
  ["missing attempts value", ["--attempts"]],
]) {
  test(`CLI rejects ${label} with a concise error and exit 1`, async () => {
    await assert.rejects(
      execFileP(process.execPath, [
        SCRIPT,
        "--url", "http://127.0.0.1:9/revision.txt",
        "--revision", GOOD_SHA,
        ...argv,
      ]),
      (err) => {
        assert.equal(err.code, 1);
        assert.match(`${err.stderr}`, /invalid --attempts|not a number|requires a value/);
        return true;
      }
    );
  });
}

// ---------------------------------------------------------------------------
// workflow budget parity (final-review fix 8): the values deploy.yml actually
// configures are accepted by the validator and fit the job's 600 s timeout.

test("deploy.yml's configured verifier controls are valid and fit the job budget", () => {
  const workflow = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", ".github", "workflows", "deploy.yml"),
    "utf8"
  );
  const num = (flag) => {
    const m = workflow.match(new RegExp(`--${flag}\\s+(\\d+)`));
    assert.ok(m, `deploy.yml must pass --${flag} explicitly`);
    return Number(m[1]);
  };
  const attempts = num("attempts");
  const backoffMs = num("backoff-ms");
  const timeoutMs = num("timeout-ms");
  validateControls({ attempts, backoffMs, timeoutMs });
  const worstCaseMs = attempts * timeoutMs + (attempts - 1) * backoffMs;
  const jobBudgetMs = 10 * 60 * 1000; // timeout-minutes: 10 on the deploy job
  assert.ok(
    worstCaseMs <= jobBudgetMs / 2,
    `worst-case verifier time ${worstCaseMs}ms must stay safely under half the ${jobBudgetMs}ms job budget`
  );
  assert.match(
    workflow,
    /worst case = attempts × timeout \+ \(attempts − 1\) × backoff/,
    "the budget calculation must be documented beside the workflow step"
  );
});
