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

Remaining work: complete strict checks, inspect bounded patches, land the first
slice on green, then execute the clean-checkout browser path and fresh reader
traces. Verify each merged revision from production. Preserve unrelated worktrees.
