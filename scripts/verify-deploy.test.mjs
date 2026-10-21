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

import {
  DEFAULT_PROVE_URL,
  proveVerification,
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
