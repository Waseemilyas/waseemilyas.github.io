# Site engineering programme

Public plan for staged, verified improvements to this portfolio.

Baseline revision: `4ed264ca9ec530f0f72cc8ceda30d59150dda27f`.

## Goal

Keep the site materially useful, credible, accessible, resilient, and
discoverable while preserving its restrained two-surface design, static-site
architecture, privacy boundary, and fast first visit.

## Stages

1. **Survey** — review the repository and the production surface end to end.
2. **Safety net** — dependency-free rendered-site contract checks,
   pull-request CI, secret scanning, and truthful local hook wiring.
3. **Revision proof** — emit the built revision in the output and verify
   production serves exactly the revision that was shipped.
4. **Continuation slices** — further evidence-backed product and technical
   improvements, each independently reviewable.

## Verification posture

- Every slice carries automated checks that are proven to fail for their
  intended reason before those checks are trusted.
- Rendered output is verified after every change, not just source.
- Production is verified directly after every deploy.
- The content guardrails in `AGENTS.md` bind everything, including this plan.

## Delivered so far

- End-to-end survey of architecture, accessibility, performance, metadata,
  structured data, feeds, sitemap, and production behaviour.
- Rendered-site contract checker (`scripts/site-check.mjs`) covering headings,
  metadata, JSON-LD, links, sitemap parity, sitemap/feed XML structure, draft
  exclusion, and OG image dimension headers — with an adversarial test for
  every contract and a proof that the checker never writes to the tree.
- Pull-request CI (`.github/workflows/ci.yml`) running secret scanning plus
  focused tests, a production build, and rendered-site checks on every PR.
- Local hook setup (`scripts/setup-hooks.mjs`) that validates `.githooks/`
  before wiring (a real directory whose `pre-commit` and `pre-push` hooks are
  regular executable files — anything else is refused loudly), sets
  `core.hooksPath`, proves the wiring through `git config --get
  core.hooksPath`, and fails loudly on real Git errors instead of silently
  skipping.
- **Revision proof** (stage 3): every production build now emits
  `/revision.txt` containing exactly the full 40-character commit SHA being
  built (from the CI-provided commit id at the build step, or the local git
  checkout for developer builds; missing, malformed or contradictory input
  fails the build). The rendered-site checker requires the artifact to match
  the expected revision. After every deploy, the deploy workflow fetches the
  artifact from the live domain with a cache-busting request and bounded
  retries, compares the response body byte-for-byte against the deployed
  commit, and goes red on timeout or mismatch. The verifier carries a
  self-proof mode that requires failure against an address which cannot serve
  and its own tests cover accepting a matching revision and rejecting an old
  one, HTTP errors, connection failures, malformed content, and a different
  application's response.

## Status

Revision-proof stage delivered; the campaign closed after the revision-proof
stage. No continuation work is queued under this programme — any further
slices would be planned and reviewed as new work in their own right.
