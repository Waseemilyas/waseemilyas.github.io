#!/usr/bin/env node
// Wire this checkout's git hooks to the repo-owned `.githooks/` directory.
//
// Invoked automatically by the `prepare` lifecycle (pnpm/npm run it after a
// local install of this private package) and available by hand via
// `pnpm run setup`. Dependency-free: Node built-ins plus the git CLI.
//
// Safety behaviour:
// - ONLY a genuine "not inside a git work tree" result from git is treated
//   as an informative no-op, exit 0 — an install in a non-git context must
//   never fail because hooks cannot be wired.
// - Operational git failures are never mistaken for that skip: a missing or
//   broken git executable, an unsafe-directory ("dubious ownership")
//   refusal, permission errors and any other non-zero exit all throw with
//   git's own diagnosis preserved.
// - `.githooks/` absent from the repo root: documented no-op — there is
//   deliberately nothing to wire.
// - `.githooks/` PRESENT but unusable — a regular file instead of a
//   directory, a missing required hook (`pre-commit`, `pre-push`), a hook
//   that is not a regular file, or a non-executable one — is refused
//   LOUDLY (throw → exit 1). Wiring a hooks path git cannot use must never
//   look like success.
// - Wiring happens only after that validation passes: local
//   `core.hooksPath=.githooks` is set and verified by reading the value
//   back from `git config --get`.
//
// What "wired" means here — exactly: git is locally pointed at a hooks
// directory whose required hooks were just verified to be regular,
// executable files. It does NOT prove any individual hook succeeds when
// git fires it; that end-to-end property is proven separately by
// `scripts/pre-commit.test.mjs`, which runs real `git commit` attempts in a
// scratch repository with these hooks wired and asserts both the blocking
// and the passing direction.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HOOKS_DIR = ".githooks";

/** Hooks this repository requires to be present and executable. */
export const REQUIRED_HOOKS = ["pre-commit", "pre-push"];

/** Git's own wording for "this directory is not a checkout". */
const OUTSIDE_RE =
  /not a git repository|not a work tree|must be run in a work tree/i;

function stderrOf(err) {
  const s = err && typeof err.stderr === "string" ? err.stderr : "";
  return s.trim();
}

/**
 * Validate a hooks directory BEFORE anything is wired: it must be a
 * directory containing every entry of REQUIRED_HOOKS as a regular,
 * executable file (symlinks count through their target).
 * Throws with a precise diagnosis listing every problem found.
 */
export function validateHooksDir(hooksAbsPath) {
  let dirStat;
  try {
    dirStat = statSync(hooksAbsPath);
  } catch (err) {
    throw new Error(
      `setup-hooks: refusing to wire — ${hooksAbsPath} cannot be inspected (${err?.code ?? "unknown error"})`
    );
  }
  if (!dirStat.isDirectory()) {
    throw new Error(
      `setup-hooks: refusing to wire — ${hooksAbsPath} is not a directory`
    );
  }
  const problems = [];
  for (const hook of REQUIRED_HOOKS) {
    const hookPath = join(hooksAbsPath, hook);
    let st;
    try {
      st = statSync(hookPath);
    } catch {
      problems.push(`${hook} is missing`);
      continue;
    }
    if (!st.isFile()) {
      problems.push(`${hook} is not a regular file`);
      continue;
    }
    if (!(st.mode & 0o111)) {
      problems.push(`${hook} is not executable`);
    }
  }
  if (problems.length) {
    throw new Error(
      `setup-hooks: refusing to wire an incomplete hooks directory at ${hooksAbsPath}: ${problems.join("; ")}`
    );
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.cwd] working directory to operate on
 * @param {string} [options.gitBin] git executable name/path
 * @param {string} [options.hooksDir] repo-relative hooks directory
 * @returns {{wired: boolean, reason: string, value?: string, hooks?: string[]}}
 */
export function setupHooks({
  cwd = process.cwd(),
  gitBin = process.env.GIT_BIN || "git",
  hooksDir = HOOKS_DIR,
} = {}) {
  const run = (args) => {
    let child;
    try {
      // stdio is pinned explicitly: by default exec*Sync relays a failing
      // child's stderr straight to this process' stderr, which would spray
      // raw git diagnostics onto every install/test run. Piping keeps them
      // available for error messages below instead.
      child = execFileSync(gitBin, args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      const detail = stderrOf(err);
      // Spawn failure (missing/broken executable): status is null and there
      // is no diagnostic from git itself. Never classify these as "outside".
      if (err == null || err.status === null || err.status === undefined) {
        const code = err?.code ?? "unknown";
        throw new Error(
          `setup-hooks: could not execute ${JSON.stringify(gitBin)} (${code}) while running git ${args.join(" ")}`
        );
      }
      if (!OUTSIDE_RE.test(detail)) {
        throw new Error(
          `setup-hooks: git ${args.join(" ")} failed with exit status ${err.status}${
            detail ? `: ${detail.split("\n")[0]}` : " (no diagnostic output)"
          }`
        );
      }
      throw Object.assign(new Error("OUTSIDE_WORK_TREE"), { outsideWorkTree: true });
    }
    return child.trim();
  };

  let topLevel;
  try {
    topLevel = run(["rev-parse", "--show-toplevel"]);
  } catch (err) {
    if (err?.outsideWorkTree) {
      return { wired: false, reason: "not inside a git work tree; hooks not wired" };
    }
    throw err;
  }

  const hooksAbsPath = join(topLevel, hooksDir);
  if (!existsSync(hooksAbsPath)) {
    return {
      wired: false,
      reason: `${hooksDir}/ not found at ${topLevel}; nothing to wire`,
    };
  }

  validateHooksDir(hooksAbsPath);

  run(["config", "core.hooksPath", hooksDir]);

  const readBack = run(["config", "--get", "core.hooksPath"]);
  if (readBack !== hooksDir) {
    throw new Error(
      `setup-hooks: expected core.hooksPath=${hooksDir} but git reports ${readBack}`
    );
  }
  return { wired: true, reason: "", value: readBack, hooks: [...REQUIRED_HOOKS] };
}

const invokedDirectly =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const scriptName = "setup-hooks";
  try {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const result = setupHooks({ cwd: repoRoot });
    if (result.wired) {
      // Label states exactly what was proven: the path is configured and the
      // required hooks were verified present and executable — nothing more.
      console.log(
        `${scriptName}: git hooks wired (core.hooksPath=${result.value}; ${result.hooks.join(", ")} verified present and executable)`
      );
    } else {
      console.log(`${scriptName}: skipped — ${result.reason}`);
    }
  } catch (err) {
    console.error(`${scriptName}: FAILED — ${err.message}`);
    process.exit(1);
  }
}
