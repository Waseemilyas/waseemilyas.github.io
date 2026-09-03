# guards-wired — working notes

Started 2026-08-30. Queue `q-personal-e489` + `q-personal-f60b`. Lane workspace is a clone of portfolio (`waseemilyas.github.io`); all other repos are handled in git worktrees under `/opt/automancer/auto/clones/guards-wired/` so live checkouts on `main` stay untouched.

## Why

`.githooks/pre-push` in the tree is not a guard. `core.hooksPath` is local git config and cannot be committed. Yesterday three repos (`external-visitor`, `pi-harness`, `tallow`) took pushes to `main` with the hook file present and the hook never running.

## Plan

Job 1 — copy portfolio `scripts/setup-hooks.mjs` + test onto the six, wire `prepare` (and `setup`) so a normal install sets `core.hooksPath`.
Job 2 — backpack-game: fail-closed pre-push + `.release-notes.json` + the same wiring. portfolio: replace the `2>/dev/null || echo main` fallback with wick's fail-closed block. Change no published content.

`REQUIRED_HOOKS` adaptation: portfolio requires `pre-commit` and `pre-push`. The other seven only ship `pre-push`. Copying the array unchanged would make `prepare` refuse to wire (loud install failure). Array is set to the hooks that actually exist; tests import `REQUIRED_HOOKS` instead of hardcoding both names.

Chimera League and Pack & Dash have no root `package.json`. Documented install is `cd web && npm install`. `prepare` goes on `web/package.json`, script lives at repo-root `scripts/setup-hooks.mjs` so git toplevel + `.githooks/` resolve correctly.

## Product names (job 2)

- backpack-game: **Pack & Dash** — `README.md` line 1: `# Pack & Dash (Pack & Dash (repo: backpack-game))`. No VISION.md.
- portfolio: **waseemilyas.uk** — `README.md` line 1: `# waseemilyas.uk`. No VISION.md. Existing `.release-notes.json` already had a recognisable name; aligning it to the README first line as the brief asked. Not published site content.

## Do not

No merge to main, no deploy, no GitHub releases, no VISION.md edits, no `RELEASE_NOTES_SKIP`, no wick `main` mutation, no `reset --hard` / `checkout --` / `clean -f` / force-push.

## Commits (all on `fix/wire-release-guard`, pushed, not merged)

- chimera-league `4a5ccd8`
- factory-planner `cebe115`
- wick `8e867f1` (branched from local main which is 1 commit ahead of origin; origin/main untouched)
- external-visitor `a6c131c`
- pi-harness `5a331bc`
- tallow `a98e504`
- backpack-game `5d43978`
- portfolio `902155f` (lane workspace; `lanes/` left untracked)

setup-hooks.test.mjs smoke: factory-planner 16 pass / 0 fail; chimera nested path 16 pass / 0 fail.

## E2E proof targets

At least one repo from each job, against a throwaway bare remote under `/tmp`:
- Job 1: factory-planner (root `pnpm install` is the documented install)
- Job 2: backpack-game (documented install is `cd web && npm install` — the interesting nested case)
