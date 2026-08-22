// Resolve and validate the git revision a build represents.
//
// Single source of truth shared by the Eleventy config (which emits
// `_site/revision.txt`), the rendered-site checker (`site-check.mjs`) and the
// post-deploy verifier (`verify-deploy.mjs`), so all three can never disagree
// about what "the revision being built" means.
//
// Contract:
//   - A revision is EXACTLY 40 lowercase hex characters (a full git SHA-1).
//   - Precedence: explicit SITE_REVISION, then GITHUB_SHA (the authority in
//     GitHub Actions), then `git rev-parse HEAD` for local builds — no
//     developer has to set anything.
//   - SITE_REVISION and GITHUB_SHA both present but different is a
//     contradiction: hard failure.
//   - A variable that is SET but blank/whitespace is an error, not an
//     absence: it fails the resolution instead of falling through to the
//     next source. Only a genuinely unset key falls through.
//   - Missing or invalid input anywhere is a hard failure. A build must never
//     publish an ambiguous revision.
//
// Dependency-free: Node built-ins plus the git CLI.

import { execFileSync } from "node:child_process";

/** Exactly a full lowercase hex SHA-1 — nothing else is a revision here. */
export const REVISION_RE = /^[0-9a-f]{40}$/;

/**
 * Validate one candidate revision string.
 * Returns the trimmed value, or throws with a precise diagnosis.
 */
export function assertRevision(value, label = "revision") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    throw new Error(
      `revision: ${label} is empty or missing — expected exactly 40 lowercase hex characters`
    );
  }
  if (!REVISION_RE.test(trimmed)) {
    throw new Error(
      `revision: ${label} ${JSON.stringify(
        trimmed.length > 64 ? `${trimmed.slice(0, 61)}…` : trimmed
      )} is not exactly 40 lowercase hex characters`
    );
  }
  return trimmed;
}

function gitHead({ cwd, gitBin }) {
  let stdout;
  try {
    stdout = execFileSync(gitBin, ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const detail =
      err && typeof err.stderr === "string" ? err.stderr.trim().split("\n")[0] : "";
    throw new Error(
      `revision: could not read git HEAD (${err?.code ?? "unknown error"}${
        detail ? `: ${detail}` : ""
      }). Set SITE_REVISION explicitly when building outside a git checkout.`
    );
  }
  return stdout;
}

/**
 * Resolve the revision this build represents.
 *
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env] environment to read (default process.env)
 * @param {string} [options.cwd] working directory for `git rev-parse`
 * @param {string} [options.gitBin] git executable name/path
 * @param {(args: string[]) => string} [options.readGitHead] test seam replacing git
 * @returns {{ revision: string, source: "SITE_REVISION"|"GITHUB_SHA"|"git HEAD" }}
 */
export function resolveRevision({
  env = process.env,
  cwd,
  gitBin = "git",
  readGitHead,
} = {}) {
  // Presence and validity are separate questions. A key that is SET but blank
  // (or whitespace) is an error, not an absence: someone or something put an
  // empty value where a revision was meant to go, and silently falling through
  // to the next source would publish under a different identity than intended.
  const explicitSet = env.SITE_REVISION !== undefined;
  const fromActionsSet = env.GITHUB_SHA !== undefined;
  const explicit = env.SITE_REVISION?.trim();
  const fromActions = env.GITHUB_SHA?.trim();

  if (explicitSet && !explicit) {
    throw new Error(
      "revision: SITE_REVISION is set but blank — unset it entirely, or set exactly 40 lowercase hex characters; a blank value is treated as an error, never as absence"
    );
  }
  if (fromActionsSet && !fromActions) {
    throw new Error(
      "revision: GITHUB_SHA is set but blank — unset it entirely, or set exactly 40 lowercase hex characters; a blank value is treated as an error, never as absence"
    );
  }

  if (explicit && !REVISION_RE.test(explicit)) {
    throw new Error(
      `revision: SITE_REVISION ${JSON.stringify(explicit)} is invalid — expected exactly 40 lowercase hex characters`
    );
  }
  if (fromActions && !REVISION_RE.test(fromActions)) {
    throw new Error(
      `revision: GITHUB_SHA ${JSON.stringify(fromActions)} is invalid — expected exactly 40 lowercase hex characters`
    );
  }
  if (explicit && fromActions && explicit !== fromActions) {
    throw new Error(
      `revision: contradictory inputs — SITE_REVISION ${explicit} != GITHUB_SHA ${fromActions}; refusing to publish an ambiguous revision`
    );
  }

  if (explicit) return { revision: explicit, source: "SITE_REVISION" };
  if (fromActions) return { revision: fromActions, source: "GITHUB_SHA" };

  // Local build: derive truthfully from the current checkout. No developer
  // configuration required; an unusable git context fails the build instead
  // of publishing a guess.
  let head;
  try {
    head = readGitHead
      ? readGitHead(["rev-parse", "HEAD"])
      : gitHead({ cwd, gitBin });
  } catch (err) {
    throw new Error(
      `revision: could not read git HEAD (${err.message}). Set SITE_REVISION explicitly when building outside a git checkout.`
    );
  }
  const revision = assertRevision(head, "git HEAD");
  return { revision, source: "git HEAD" };
}
