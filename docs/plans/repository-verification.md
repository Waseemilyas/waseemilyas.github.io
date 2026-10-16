# Repository verification

Last verified: 2026-10-16 on Linux.

Scope: keep the existing public portfolio, static publishing host, page copy,
layout, audio files and visitor controls. Improve navigation through code and
make checks and browser verification repeatable. No design or content revision.

The first slice makes the existing production JavaScript strict with JSDoc and
TypeScript's native compiler, adds correctness linting, names the three browser
behaviours in the existing script and gives local checks explicit test selection.
The full tests stay in pull-request CI. Publishing consumes a newly built Pages
artifact in one job and checks its rendered contracts and exact live revision.

The second slice supplies the observed product specification, shared vocabulary,
visitor feature map and executable browser path. Evidence records commands,
revision, actions, resulting state and cleanup. Browser verification is on demand;
it does not add another CI job. Keep private working notes out of this repository.

File ownership: the site checker and four other CLI owners receive annotations
in separate bounded work; the chair reviews each patch. Browser code, toolchain,
workflows and navigation docs remain with the chair. Read-only reviewers measure
three source traces and audit the test surface. No reviewer is a release gate.

Initial measurements: the old `pnpm check` took 9.512 seconds and repeated all
local tests, build and rendered contracts. Source/browser tooling was untyped and
had no correctness lint. The initial script floor was 38/82. Documentation and
reader measurements, deliberate failure, final checks and merged receipts follow
in the pull requests; they are evidence, not future requirements on contributors.

First slice merged as PR #31, revision `401611ed0030633d26e64e8921a31ecfec2edf43`.
Its exact-head CI passed in 49 seconds. All production JavaScript now checks strict.
The local quick check took 2.153 seconds; native typecheck 0.632 seconds against
editor tsc 1.567 seconds. Deliberate Escape-focus typo was rejected, then restored
byte for byte. Before a build, a fresh installed checkout's language server resolved
both project-source and Node declaration imports. All built files except the
browser enhancement script matched the baseline bytes.

The test audit removed six redundant/detached tests and two assertion pins, keeping
actual release/privacy/hook contracts. Five retained owners went red under deliberate
in-memory mutations. Documentation union including this plan was 51,047 → 45,967
bytes at the first slice; final navigation/feature-map growth is measured separately.

Remaining work: execute the clean-checkout browser path, inspect screenshots, obtain
fresh-reader timings, re-run independently, merge on green and verify production.
Preserve unrelated worktrees. Exact receipts belong in the pull requests.
