// Focused node:test suite for scripts/content-guard.mjs.
//
// Verifies that AGENTS.md §1 content guardrails are strictly enforced,
// that each guard fires on synthetic planted violations, and that the
// grandfathered carve-out behaves as documented.
//
// Fixtures use only obviously synthetic placeholders (synthetic domains,
// example networks, fake IDs). No private or real client details ever appear.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkContent,
  runContentGuard,
  walkSourceFiles,
} from "./content-guard.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "content-guard.mjs");

function makeFixture(t) {
  const root = mkdtempSync(join(os.tmpdir(), "content-guard-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  mkdirSync(join(root, "src", "_data"), { recursive: true });
  mkdirSync(join(root, "src", "notes"), { recursive: true });

  writeFileSync(
    join(root, "src", "index.njk"),
    "<h1>Waseem Ilyas</h1><p>Contact: waseem@automancer.uk</p>\n"
  );
  writeFileSync(
    join(root, "src", "notes", "index.njk"),
    "<h2>Notes</h2><p>Reflections on automation.</p>\n"
  );
  writeFileSync(
    join(root, "src", "_data", "site.json"),
    JSON.stringify({ email: "waseem@automancer.uk" }, null, 2)
  );

  return { root, srcDir: join(root, "src") };
}

// ---------------------------------------------------------------------------
// positive controls

test("clean fixture passes with zero violations", () => {
  const fx = makeFixture(test);
  const { violations, stats } = runContentGuard({ dir: fx.srcDir });
  assert.deepEqual(violations, []);
  assert.equal(stats.files, 3);
});

test("repository src/ tree passes content guard with zero violations", () => {
  const { violations, stats } = runContentGuard({ dir: "src" });
  assert.deepEqual(violations, []);
  assert.ok(stats.files >= 30, `expected at least 30 source files, got ${stats.files}`);
});

// ---------------------------------------------------------------------------
// negative controls — synthetic planted violations

test("planted currency violations fail guard/currency", () => {
  for (const amount of ["£500", "$1,200", "€350", "450 GBP", "1000 USD", "£10k"]) {
    const violations = checkContent("test.njk", `<p>Cost was ${amount}</p>`);
    assert.equal(
      violations.length,
      1,
      `expected 1 violation for "${amount}", got: ${JSON.stringify(violations)}`
    );
    assert.equal(violations[0].check, "guard/currency");
    assert.match(violations[0].message, /currency amount found/);
  }
});

test("planted filesystem paths fail guard/filesystem-paths", () => {
  for (const path of [
    "/opt/internal-tool/cache",
    "/home/synthetic-user/repo",
    "/Users/synthetic-dev/secrets",
    "/etc/synthetic-config.conf",
    "C:\\Users\\synthetic\\data",
  ]) {
    const violations = checkContent("test.njk", `<p>Located at ${path}</p>`);
    assert.equal(
      violations.length,
      1,
      `expected 1 violation for "${path}", got: ${JSON.stringify(violations)}`
    );
    assert.equal(violations[0].check, "guard/filesystem-paths");
    assert.match(violations[0].message, /internal filesystem path/);
  }
});

test("planted IPv4 address fails guard/network-ip", () => {
  const violations = checkContent("test.njk", "<p>Server at 192.168.1.105</p>");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/network-ip");
  assert.match(violations[0].message, /IP address found: "192\.168\.1\.105"/);
});

test("planted internal mesh/VPN domains fail guard/network-domain", () => {
  for (const domain of ["server.ts.net", "database.internal", "gateway.local", "router.lan"]) {
    const violations = checkContent("test.njk", `<a href="http://${domain}">Link</a>`);
    assert.equal(
      violations.length,
      1,
      `expected 1 violation for "${domain}", got: ${JSON.stringify(violations)}`
    );
    assert.equal(violations[0].check, "guard/network-domain");
    assert.match(violations[0].message, /internal network domain found/);
  }
});

test("planted non-allowlisted email fails guard/email-allowlist", () => {
  const violations = checkContent(
    "contact.njk",
    "<p>Reach client staff at person@synthetic-enterprise.example</p>"
  );
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/email-allowlist");
  assert.match(violations[0].message, /non-allowlisted email found: "person@synthetic-enterprise\.example"/);
});

test("allowlisted emails pass guard/email-allowlist", () => {
  const content = "<p>waseem@automancer.uk and contact@waseemilyas.uk</p>";
  const violations = checkContent("contact.njk", content);
  assert.deepEqual(violations, []);
});

test("planted private key marker fails guard/credentials", () => {
  const keyHeader = "-----BEGIN " + "PRIVATE KEY-----";
  const violations = checkContent("config.txt", `${keyHeader}\nABCDEF==\n`);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/credentials");
  assert.match(violations[0].message, /private key block detected/);
});

test("planted secret tokens fail guard/credentials", () => {
  const fakePat = "ghp_" + "Zq8kL2mNpQ7rStUvWxYz0AbCdEfGhIjKlMnOp";
  const violations = checkContent("setup.sh", `export TOKEN=${fakePat}`);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/credentials");
  assert.match(violations[0].message, /secret token marker detected/);
});

test("planted credential assignment fails guard/credentials", () => {
  const snippet = "pass" + "word: \"synthetic-val\"";
  const violations = checkContent("sample.js", `const cfg = { ${snippet} };`);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/credentials");
  assert.match(violations[0].message, /credential assignment pattern/);
});

test("planted credential/client markers in comments fail guard/comment-secrets", () => {
  const fakeComment1 = "<!-- " + "internal-only draft notes" + " -->";
  const fakeComment2 = `{# client: Synthetic Client Name #}`;

  const v1 = checkContent("page.njk", fakeComment1);
  assert.equal(v1.length, 1);
  assert.equal(v1[0].check, "guard/comment-secrets");

  const v2 = checkContent("page.njk", fakeComment2);
  assert.equal(v2.length, 1);
  assert.equal(v2[0].check, "guard/comment-secrets");
});

test("planted commercial rate and margin terms fail guard/commercial-terms", () => {
  for (const phrase of [
    "standard day rate applies",
    "the daily rate was fixed",
    "hourly rate of work",
    "monthly retainer fee",
    "contract value under discussion",
    "operating profit margin",
  ]) {
    const violations = checkContent("work.md", `<p>${phrase}</p>`);
    assert.equal(
      violations.length,
      1,
      `expected violation for phrase "${phrase}", got: ${JSON.stringify(violations)}`
    );
    assert.equal(violations[0].check, "guard/commercial-terms");
    assert.match(violations[0].message, /commercial rate\/fee\/margin term/);
  }
});

test("planted commercial revenue disclosures fail guard/commercial-revenue", () => {
  for (const phrase of [
    "annual revenue reached high targets",
    "company revenue reported quarterly",
    "client revenue grew significantly",
  ]) {
    const violations = checkContent("about.md", `<p>${phrase}</p>`);
    assert.equal(
      violations.length,
      1,
      `expected violation for phrase "${phrase}", got: ${JSON.stringify(violations)}`
    );
    assert.equal(violations[0].check, "guard/commercial-revenue");
    assert.match(violations[0].message, /commercial revenue disclosure/);
  }
});

// ---------------------------------------------------------------------------
// grandfathered carve-out (AGENTS.md §1)

test("grandfathered timeline.json allows pre-existing business revenue", () => {
  const text = JSON.stringify({
    milestones: [{ body: "Grew it to approximately 25% of business revenue." }],
  });
  const violations = checkContent("src/_data/timeline.json", text);
  assert.deepEqual(violations, []);
});

test("non-exempted violations in grandfathered timeline.json STILL fail", () => {
  const text = JSON.stringify({
    milestones: [
      {
        body: "Grew it to approximately 25% of business revenue.",
        path: "/opt/automancer/secret-path",
      },
    ],
  });
  const violations = checkContent("src/_data/timeline.json", text);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].check, "guard/filesystem-paths");
});

// ---------------------------------------------------------------------------
// CLI behaviour

test("CLI exits 0 on valid directory", () => {
  const fx = makeFixture(test);
  const r = spawnSync(process.execPath, [SCRIPT, "--dir", fx.srcDir], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /content-guard: OK/);
  assert.match(r.stdout, /3 source files scanned/);
});

test("CLI exits 1 and names violation on dirty directory", () => {
  const fx = makeFixture(test);
  writeFileSync(join(fx.srcDir, "bad.njk"), "<p>Price is £450</p>\n");
  const r = spawnSync(process.execPath, [SCRIPT, "--dir", fx.srcDir], {
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  const out = `${r.stderr}${r.stdout}`;
  assert.match(out, /content-guard: FAILED/);
  assert.match(out, /\[guard\/currency\]/);
});
