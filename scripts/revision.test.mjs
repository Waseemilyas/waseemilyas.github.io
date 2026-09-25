// Focused node:test suite for scripts/revision.mjs.
//
// The revision contract is safety-critical for the deploy proof, so every
// branch of the resolver carries a discriminating control: explicit override,
// GitHub Actions authority, truthful local git derivation, and the three hard
// failures (missing, invalid, contradictory) that must never publish an
// ambiguous value.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { assertRevision, REVISION_RE, resolveRevision } from "./revision.mjs";

const SHA_A = "11".repeat(20);
const SHA_B = "22".repeat(20);
const okGit = () => `${SHA_A}\n`;
const deadGit = () => {
  throw new Error("fatal: not a git repository");
};

test("REVISION_RE accepts exactly 40 lowercase hex characters", () => {
  assert.match(SHA_A, REVISION_RE);
  assert.doesNotMatch("A".repeat(40), REVISION_RE); // uppercase refused
  assert.doesNotMatch(SHA_A.slice(0, 39), REVISION_RE); // short SHA refused
  assert.doesNotMatch(`${SHA_A} `, REVISION_RE); // untrimmed refused by regex…
  // …and by the resolver, which trims before comparing.
});

test("explicit SITE_REVISION wins over both GITHUB_SHA and local git", () => {
  const r = resolveRevision({ env: { SITE_REVISION: SHA_B }, readGitHead: okGit });
  assert.deepEqual(r, { revision: SHA_B, source: "SITE_REVISION" });
});

test("GITHUB_SHA is the CI authority when no explicit override is set", () => {
  const r = resolveRevision({ env: { GITHUB_SHA: SHA_A }, readGitHead: okGit });
  assert.deepEqual(r, { revision: SHA_A, source: "GITHUB_SHA" });
});

test("a local build derives HEAD truthfully without any environment value", () => {
  const r = resolveRevision({ env: {}, readGitHead: okGit });
  assert.deepEqual(r, { revision: SHA_A, source: "git HEAD" });
});

test("equal SITE_REVISION and GITHUB_SHA are accepted (no false contradiction)", () => {
  const r = resolveRevision({ env: { SITE_REVISION: SHA_A, GITHUB_SHA: SHA_A }, readGitHead: okGit });
  assert.equal(r.revision, SHA_A);
});

for (const [label, env] of [
  ["contradictory inputs", { SITE_REVISION: SHA_A, GITHUB_SHA: SHA_B }],
  ["invalid SITE_REVISION", { SITE_REVISION: "release-2026-08-22" }],
  ["short GITHUB_SHA", { GITHUB_SHA: SHA_A.slice(0, 7) }],
]) {
  test(`hard failure: ${label}`, () => {
    assert.throws(() => resolveRevision({ env, readGitHead: okGit }), /revision:/);
  });
}

test("hard failure: unusable local git context refuses to guess", () => {
  assert.throws(() => resolveRevision({ env: {}, readGitHead: deadGit }), /could not read git HEAD|Set SITE_REVISION/);
});

test("assertRevision trims surrounding whitespace but nothing else", () => {
  assert.equal(assertRevision(`  ${SHA_A}  `), SHA_A);
  assert.throws(() => assertRevision(""), /empty or missing/);
});

// ---------------------------------------------------------------------------
// blank-but-present variables are errors, never absences (final-review fix 2)

for (const [label, env] of [
  ["blank SITE_REVISION (empty string)", { SITE_REVISION: "" }],
  ["whitespace SITE_REVISION", { SITE_REVISION: "   " }],
  ["blank GITHUB_SHA (empty string)", { GITHUB_SHA: "" }],
  ["whitespace GITHUB_SHA", { GITHUB_SHA: " \t " }],
  ["blank SITE_REVISION alongside a valid GITHUB_SHA", { SITE_REVISION: "", GITHUB_SHA: SHA_A }],
  ["blank GITHUB_SHA alongside a valid SITE_REVISION", { SITE_REVISION: SHA_A, GITHUB_SHA: "" }],
]) {
  test(`hard failure, no fallthrough: ${label}`, () => {
    // The git seam throws if consulted: proving the resolver fails on the
    // blank value itself and never silently falls through to the next source.
    assert.throws(
      () => resolveRevision({ env, readGitHead: deadGit }),
      /is set but blank/
    );
  });
}

test("genuinely unset keys still fall through (blank detection has no false positive)", () => {
  const r = resolveRevision({ env: {}, readGitHead: okGit });
  assert.deepEqual(r, { revision: SHA_A, source: "git HEAD" });
});

// Without an install this control would die on MODULE_NOT_FOUND and the
// regex assertion would report a baffling mismatch; skip loudly instead.
test("build-facing control: the real Eleventy build fails on a blank SITE_REVISION", {
  skip: existsSync("node_modules/@11ty/eleventy/cmd.cjs")
    ? false
    : "eleventy not installed — run pnpm install",
}, async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const execFileP = promisify(execFile);
  const outDir = mkdtempSync(join(tmpdir(), "portfolio-blank-rev-"));
  try {
    await assert.rejects(
      execFileP(
        process.execPath,
        ["node_modules/@11ty/eleventy/cmd.cjs", "--output", outDir],
        { env: { ...process.env, SITE_REVISION: "" }, timeout: 60000 }
      ),
      (err) => {
        assert.notEqual(err.code, 0, "the build must exit non-zero");
        assert.match(`${err.stdout}\n${err.stderr}`, /SITE_REVISION is set but blank/);
        return true;
      }
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
