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

The clean browser path passed on `01a1d1b627d33e2580bb3c8fa8338dde803f6cbb`
in 34.072166461 seconds with 33 screenshots. It visited all 14 built pages at
desktop and phone dimensions, operated capability and navigation inputs, checked
reduced motion and used footer navigation with author scripts disabled. Its
ephemeral listener closed and none of the twelve recorded process identities
survived. Failed drafts remain failed evidence: one decoded browser strings
incorrectly, one clicked the moving drawer, and one failed to block a cached
script. The helper now waits for the actual transition, starts a separate browser
with scripts disabled before load, and identifies cleanup targets by executable
and checkout/session ownership rather than matching shell argument text.

Fresh source readers took 23.785300956 seconds for navigation, 53.056715082 for
draft publication and 35.230232854 for capabilities. One of three passed the
thirty-second target; raw before/after traces and uncertainties are committed
beside the feature map. The two missed targets are tracked as follow-up work.
Monitoring registry coverage is tracked separately: the first release verifier
proved revision change but could not check unknown error/uptime sources.

The final helper passed at `263be6106608429828cad573340105df4025dc85` in
35.760575366 seconds; its footer capture now waits for the actual link to enter
the viewport. The chair inspected the complete contact sheet and full-size
capability, phone article/case-study, desktop About and no-JavaScript footer
captures. An independent clean checkout of `11faf0b29b6d84fe96d4e1df14a6ad4cacf71cb9`
passed frozen install, quick check, build, rendered contracts and the identical
helper in 35.605875138 seconds, retaining another 33 screenshots and closed-port
receipt. The only subsequent CI change names the lint/type/privacy work already
performed by `pnpm check`; it adds no check or job.

The raw floor is 80/82; one reader pass, deliberate product failure and retained
independent rerun evidence bring the judged result to 91. No architectural
decision record was invented for points. Always-loaded instructions decreased
from 16,547 to 9,846 bytes; the full documentation union grew because it retains
the specification, feature map and raw reader evidence. Exact final budgets,
green CI and merged production receipts belong in the pull requests. Preserve
unrelated worktrees and archive browser evidence before removing owned checkouts.
