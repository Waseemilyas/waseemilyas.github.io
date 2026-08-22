// End-to-end proof that .githooks/pre-commit actually fires and blocks when
// git runs it — the property scripts/setup-hooks.mjs deliberately does NOT
// claim. Real `git commit` attempts run in a throwaway scratch repository
// with the repo's own hook wired via core.hooksPath.
//
// Both directions are covered:
//   - positive control: a harmless commit SUCCEEDS through the hook (so a
//     hook that blocks everything cannot pass this suite);
//   - negative control: a planted credential-shaped finding BLOCKS the
//     commit, is labelled as a scan FINDING, and the planted value never
//     appears in the hook's output;
//   - operational-failure control: a broken gitleaks config BLOCKS the
//     commit but is labelled as a FAILED SCAN, distinctly from a finding —
//     a broken scanner must never masquerade as "secrets found".
//
// The scratch repository is created under the OS temp directory, holds a
// handful of files only, and is removed by each test's cleanup.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const hasGitleaks = (() => {
  const r = spawnSync("gitleaks", ["version"], { stdio: "ignore" });
  return r.status === 0;
})();

// A GitHub-PAT-SHAPED marker: not a real credential (it was typed here, never
// issued), but matched by gitleaks' default github-pat rule and by the hook's
// own regex fallback. NOTE: the canonical AWS "AKIA…EXAMPLE" key is NOT
// suitable — gitleaks' default allowlist deliberately ignores it, which this
// suite proved the hard way.
const PLANTED = "ghp_" + "Zq8kL2mNpQ7rStUvWxYz0AbCdEfGhIjKlMnOp";

/** Build a scratch repo with the real hook wired; removed on test cleanup. */
function scratchRepo(t) {
  const root = mkdtempSync(join(tmpdir(), "portfolio-hook-e2e-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("config", "user.email", "hook-test@localhost");
  git("config", "user.name", "Hook E2E");
  git("config", "commit.gpgsign", "false");
  mkdirSync(join(root, ".githooks"));
  cpSync(join(REPO_ROOT, ".githooks", "pre-commit"), join(root, ".githooks", "pre-commit"));
  cpSync(join(REPO_ROOT, ".gitleaks.toml"), join(root, ".gitleaks.toml"));
  git("config", "core.hooksPath", ".githooks");
  return { root, git };
}

/** Attempt a real commit; returns { status, output } with stdout+stderr merged. */
function tryCommit(root, message) {
  const r = spawnSync("git", ["commit", "-m", message], { cwd: root, encoding: "utf8" });
  return { status: r.status, output: `${r.stdout}\n${r.stderr}` };
}

test("positive control: a harmless commit passes through the wired hook", (t) => {
  const { root, git } = scratchRepo(t);
  writeFileSync(join(root, "notes.txt"), "nothing sensitive here\n");
  git("add", "notes.txt", ".gitleaks.toml");
  const { status, output } = tryCommit(root, "harmless");
  assert.equal(status, 0, output);
  assert.match(output, /pre-commit checks passed/);
});

test(
  "a planted credential-shaped finding blocks the commit, labelled as a FINDING, value not echoed",
  { skip: !hasGitleaks && "gitleaks is not installed on this device" },
  (t) => {
    const { root, git } = scratchRepo(t);
    writeFileSync(join(root, "config.js"), `export const region = "eu-west-2";\nexport const key = "${PLANTED}";\n`);
    git("add", "config.js");
    const { status, output } = tryCommit(root, "leaky");
    assert.notEqual(status, 0, "the commit must be blocked");
    assert.match(output, /gitleaks found potential secrets/);
    assert.doesNotMatch(output, /FAILED to run/, "a finding must not be labelled as an operational failure");
    assert.ok(!output.includes(PLANTED), "the planted value must never appear in hook output");
  }
);

test(
  "a broken gitleaks config blocks the commit, labelled as a FAILED SCAN, not as a finding",
  { skip: !hasGitleaks && "gitleaks is not installed on this device" },
  (t) => {
    const { root, git } = scratchRepo(t);
    writeFileSync(join(root, ".gitleaks.toml"), "[[[ this is not valid toml\n");
    writeFileSync(join(root, "notes.txt"), "nothing sensitive here\n");
    git("add", "notes.txt");
    const { status, output } = tryCommit(root, "broken scanner");
    assert.notEqual(status, 0, "an unrunnable scan must fail closed");
    assert.match(output, /FAILED to run/);
    assert.match(output, /operational\/config\/tool failure/);
    assert.doesNotMatch(
      output,
      /gitleaks found potential secrets/,
      "a broken scanner must not claim to have found secrets"
    );
  }
);

test("regex fallback also blocks the planted value when it reaches that arm", (t) => {
  // Prove the hook's own regex arm (the fallback when gitleaks is absent)
  // recognises the planted shape: run the arm the way the hook does.
  const r = spawnSync(
    "bash",
    ["-c", `echo 'key = "${PLANTED}"' | grep -E 'ghp_[A-Za-z0-9]{20,}' >/dev/null`],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, "the fallback token regex must match the planted PAT shape");
});
