// Focused node:test suite for scripts/setup-hooks.mjs.
//
// Run via `pnpm test` → `node --test --test-concurrency=1 scripts/`
// (file-level concurrency committed at 1 in package.json).
//
// Both directions are covered: inside a real temporary git checkout with a
// VALID `.githooks/` directory (every required hook present as a regular
// executable file), wiring must set core.hooksPath (verified by reading the
// value back from `git config --get`, never from file existence); and
// degradation is NARROW — only a genuine "not inside a git work tree" answer
// from git may produce the successful no-op, and only a genuinely ABSENT
// `.githooks/` may produce the documented nothing-to-wire skip. A hooks path
// that exists but is unusable — a regular file named `.githooks`, an empty or
// incomplete directory, a required hook that is not a regular file or is not
// executable — must be refused loudly with core.hooksPath left untouched. A
// missing/broken git executable, an unsafe-directory refusal or any other
// operational git error must fail loudly while preserving the diagnosis.
// Every temp directory is removed, and expected failures are asserted via
// caught errors / captured subprocess output, so no raw git stderr leaks
// into the green run.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { HOOKS_DIR, setupHooks } from "./setup-hooks.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(REPO_ROOT, "scripts", "setup-hooks.mjs");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Read a config value; "" when the key is unset (git exits 1). */
function gitGet(cwd, key) {
  const r = spawnSync("git", ["config", "--get", key], { cwd, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

/** Temp dir (removed with the test) that may or may not become a git repo. */
function makeTempDir(t, prefix) {
  const dir = mkdtempSync(join(os.tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Temp dir initialised as a real git repo laid out like a checkout:
 *  `.githooks/` plus `scripts/setup-hooks.mjs`, mirroring the production
 *  file layout the CLI anchors itself to. */
function makeGitRepoWithHooks(t) {
  const dir = makeTempDir(t, "setup-hooks-repo-");
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  cpSync(join(REPO_ROOT, HOOKS_DIR), join(dir, HOOKS_DIR), { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(SCRIPT, join(dir, "scripts", "setup-hooks.mjs"));
  return dir;
}

test("wires core.hooksPath to .githooks inside a git checkout, verified via git config readback", (t) => {
  const dir = makeGitRepoWithHooks(t);
  const result = setupHooks({ cwd: dir });
  assert.equal(result.wired, true);
  assert.equal(result.value, HOOKS_DIR);
  // Wiring only happens after the hooks directory itself was validated.
  assert.deepEqual(result.hooks, ["pre-commit", "pre-push"]);
  // The proof of activity is git's own config, not the presence of files.
  assert.equal(gitGet(dir, "core.hooksPath"), HOOKS_DIR);
});

test("re-running is idempotent and keeps the same value", (t) => {
  const dir = makeGitRepoWithHooks(t);
  assert.equal(setupHooks({ cwd: dir }).wired, true);
  const second = setupHooks({ cwd: dir });
  assert.equal(second.wired, true);
  assert.equal(gitGet(dir, "core.hooksPath"), HOOKS_DIR);
});

test("degrades safely outside a git work tree (no throw, wired=false)", (t) => {
  const dir = makeTempDir(t, "setup-hooks-bare-");
  const result = setupHooks({ cwd: dir }); // must not throw
  assert.equal(result.wired, false);
  assert.match(result.reason, /not inside a git work tree/);
});

// ---------------------------------------------------------------------------
// narrow degradation: operational git failures must FAIL, not no-op.
// Stub git executables make each refusal deterministic without needing
// multi-user ownership tricks; stderr is captured inside thrown errors and
// subprocess results, never printed to the suite's own streams.

/** A fake git binary that fails exactly like the named refusal. */
function stubGit(t, body) {
  const dir = makeTempDir(t, "setup-hooks-stubgit-");
  const stub = join(dir, "git-stub.sh");
  writeFileSync(stub, `#!/bin/sh\n${body}\n`);
  chmodSync(stub, 0o755);
  return stub;
}

test("missing/broken git executable fails loudly instead of reporting a skip", (t) => {
  const dir = makeTempDir(t, "setup-hooks-nogit-");
  assert.throws(
    () => setupHooks({ cwd: dir, gitBin: "/nonexistent/git-nowhere" }),
    (err) => /could not execute .*ENOENT/.test(err.message)
  );
});

test("unsafe-directory ('dubious ownership') refusal preserves the diagnosis", (t) => {
  const dir = makeTempDir(t, "setup-hooks-dubious-");
  const stub = stubGit(
    t,
    `echo "fatal: detected dubious ownership in repository at '${dir}'" >&2; exit 128`
  );
  try {
    setupHooks({ cwd: dir, gitBin: stub });
    assert.fail("setupHooks must throw on an unsafe-directory refusal");
  } catch (err) {
    assert.match(err.message, /exit status 128/);
    assert.match(err.message, /dubious ownership/);
  }
});

test("a non-zero exit with empty stderr still fails instead of masquerading as a skip", (t) => {
  // Mirrors the observed real-world shape of a permission failure:
  // `git rev-parse --show-toplevel` exits 128 having printed nothing.
  const dir = makeTempDir(t, "setup-hooks-emptyerr-");
  const stub = stubGit(t, `exit 128`);
  assert.throws(
    () => setupHooks({ cwd: dir, gitBin: stub }),
    (err) =>
      /rev-parse --show-toplevel failed with exit status 128 \(no diagnostic output\)/.test(
        err.message
      )
  );
});

test("unreadable .git/config (permission failure) fails rather than skipping", (t) => {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    t.skip("root bypasses file permission bits; refusal cannot be provoked");
  }
  const dir = makeGitRepoWithHooks(t);
  chmodSync(join(dir, ".git", "config"), 0o000);
  try {
    setupHooks({ cwd: dir });
    assert.fail("setupHooks must throw when git cannot operate on the repo");
  } catch (err) {
    assert.ok(
      !/not inside a git work tree/.test(err.message),
      `permission failure misclassified as an outside-work-tree skip: ${err.message}`
    );
    assert.match(err.message, /failed with exit status|could not execute/);
  } finally {
    chmodSync(join(dir, ".git", "config"), 0o644); // let cleanup rmSync work
  }
});

test("CLI entry fails with exit 1 and a diagnosis on an operational git error — never a silent skip", (t) => {
  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, GIT_BIN: "/nonexistent/git-nowhere" },
  });
  assert.equal(r.status, 1);
  assert.match(`${r.stderr}`, /FAILED/);
  assert.match(`${r.stderr}`, /could not execute/);
  assert.doesNotMatch(r.stdout, /wired|active|skipped/);
});

test("refuses to wire when .githooks/ is missing rather than setting a dangling path", (t) => {
  const dir = makeTempDir(t, "setup-hooks-nohooks-");
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  const result = setupHooks({ cwd: dir });
  assert.equal(result.wired, false);
  assert.match(result.reason, /not found/);
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

// ---------------------------------------------------------------------------
// hooks-directory validation: a present but unusable .githooks must be
// refused LOUDLY, never silently no-op'd and never wired. Each control also
// asserts core.hooksPath stays unset, so a refusal can't half-succeed.

/** A git repo whose `.githooks` is laid out exactly as specified. */
function makeHookRepo(t, hookFiles, { asFile = false } = {}) {
  const dir = makeTempDir(t, "setup-hooks-shape-");
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  if (asFile) {
    writeFileSync(join(dir, HOOKS_DIR), "regular file, not a directory");
    return dir;
  }
  mkdirSync(join(dir, HOOKS_DIR), { recursive: true });
  for (const [name, mode] of hookFiles) {
    writeFileSync(join(dir, HOOKS_DIR, name), "#!/bin/sh\nexit 0\n");
    chmodSync(join(dir, HOOKS_DIR, name), mode);
  }
  return dir;
}

test("refuses loudly when .githooks exists but is a regular FILE, wiring nothing", (t) => {
  const dir = makeHookRepo(t, [], { asFile: true });
  assert.throws(
    () => setupHooks({ cwd: dir }),
    (err) => /refusing to wire .* is not a directory/.test(err.message)
  );
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

test("refuses an empty .githooks directory, naming every missing required hook", (t) => {
  const dir = makeHookRepo(t, []);
  assert.throws(
    () => setupHooks({ cwd: dir }),
    (err) =>
      /incomplete hooks directory/.test(err.message) &&
      /pre-commit is missing/.test(err.message) &&
      /pre-push is missing/.test(err.message)
  );
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

test("refuses when one required hook is missing, naming it and wiring nothing", (t) => {
  const dir = makeHookRepo(t, [["pre-commit", 0o755]]);
  assert.throws(
    () => setupHooks({ cwd: dir }),
    (err) => /incomplete hooks directory/.test(err.message) && /pre-push is missing/.test(err.message)
  );
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

test("refuses a non-executable required hook, naming it and wiring nothing", (t) => {
  const dir = makeHookRepo(t, [
    ["pre-commit", 0o755],
    ["pre-push", 0o644],
  ]);
  assert.throws(
    () => setupHooks({ cwd: dir }),
    (err) => /incomplete hooks directory/.test(err.message) && /pre-push is not executable/.test(err.message)
  );
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

test("refuses a required hook that is a DIRECTORY instead of a regular file", (t) => {
  const dir = makeHookRepo(t, [["pre-push", 0o755]]);
  mkdirSync(join(dir, HOOKS_DIR, "pre-commit"), { recursive: true });
  assert.throws(
    () => setupHooks({ cwd: dir }),
    (err) => /incomplete hooks directory/.test(err.message) && /pre-commit is not a regular file/.test(err.message)
  );
  assert.equal(gitGet(dir, "core.hooksPath"), "");
});

test("CLI entry refuses an unusable hooks directory with exit 1 and never claims success", (t) => {
  const dir = makeHookRepo(t, []); // empty .githooks
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(SCRIPT, join(dir, "scripts", "setup-hooks.mjs"));
  const r = spawnSync(process.execPath, [join(dir, "scripts", "setup-hooks.mjs")], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  assert.match(`${r.stderr}`, /FAILED/);
  assert.match(`${r.stderr}`, /incomplete hooks directory/);
  assert.doesNotMatch(r.stdout, /wired|active|skipped/);
});

test("CLI entry wires hooks, reports success on stdout, exits 0", (t) => {
  const dir = makeGitRepoWithHooks(t);
  // Invoke the checkout's own copy, as the prepare lifecycle would.
  const r = spawnSync(process.execPath, [join(dir, "scripts", "setup-hooks.mjs")], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  // The label states exactly what was proven: the configured path plus which
  // hooks were verified present and executable — no stronger claim.
  assert.match(r.stdout, /hooks wired/);
  assert.match(r.stdout, new RegExp(`core\\.hooksPath=${HOOKS_DIR}`));
  assert.match(r.stdout, /pre-commit, pre-push verified present and executable/);
  assert.equal(gitGet(dir, "core.hooksPath"), HOOKS_DIR);
});
