# Backlog carried out of campaign 003

> **Reconciled:** 2026-09-22 against current tree and Git history.
> **Method:** Code and document inspection in the current tree cross-referenced with `git log -S` commits and PRs.
> **Tally:** 2 resolved, 2 still open, 0 obsolete (Total: 4 items).

Written 2026-08-31 by `orch-personal` as campaign 003 wound down.

These items were found during the campaign and lived only in its queue, which does not
outlive it. They are recorded here so they are not lost. **Nothing here is in progress** —
each is a finding with its evidence, not an assignment.

Each entry keeps its original campaign id so it can be traced back, and its `why` verbatim:
the reasoning and the measurements matter more than the one-line title, and several of these
were filed precisely because a summary would have been misleading.

**4 items** — 3 × p2, 1 × p3.


## p2

### repo hygiene: portfolio

*campaign id `q-personal-ac23` · kind `hygiene` · source ref: -*
**Status: resolved** — Tree is clean and checkout unparked on default branch `main`. HTML revision reporting from `chore/auto-69-version-reporting` merged to `main` in PR #7 (commit `3bd4550`, verified by `<meta name="waseemilyas-revision">` in `src/_includes/base.njk`:17 and `scripts/site-check.mjs`:784-803). Other unmerged branches were adjudicated on 2026-08-31 in closed PRs with documented reasons: PR #8 (`agent/AUT-3875`, abandoned to avoid regressing `main`'s regional Sentry CDN and DSN JSON wiring) and PR #9 (`agent/AUT-5846`, abandoned to prevent unpublishing two live notes). Associated hygiene finding `q-personal-c901` resolved via removal of `.htaccess` in commit `f85df88`.

Git state needs resolving before this repo can be closed: the local default branch is 1 commit behind the remote ref we already hold; 3 branches carrying commits not merged into the default branch; the checkout is parked on 'chore/auto-69-version-reporting', not the default branch. Done means the tree is clean, the default branch matches the fetched remote, and every stale branch is merged or deleted with a reason.

### The portfolio still names past clients under grandfathered terms

*campaign id `q-personal-ee71` · kind `decision` · source ref: PERSONAL-28*
**Status: still open** — Checked current tree: `src/_data/timeline.json` (lines 15–28) continues to name past clients (`SportsShoes`, `Global Diversity Practice`, `Shell`), and `src/work/cs-icommit.md` links to `https://icommit.globaldiversitypractice.com`. Under `AGENTS.md` lines 50–56, pre-existing content remains grandfathered ("do not remove it and do not rewrite it"). No decision or outbound client consent ruling has been made to alter or trim these references.

Public, names other people businesses, and open since 7 August. Two linked calls: keep, trim or pull, and whether those clients ever consented to being named. An agent makes the change afterwards, but contacting a past client is outbound and needs his sign-off first.

### Three prayer-time audio files are published on the portfolio site and nothing links to them

*campaign id `q-personal-961d` · kind `review` · source ref: discovery-portfolio · status: resolved 2026-09-21*
**Status: resolved** — Resolved 2026-09-21 in PR #13 (commit `6c6b169`). Waseem ruled that the prayer-time audio files are intentional to feed an external Home Assistant automation over HTTP. Verified in current tree: `audio/README.md` documents the automation rationale and retention requirement, linked from `eleventy.config.js` line 16, and codified as a standing content guardrail in `AGENTS.md` lines 102–106. The audio files remain in place and tracked.

Discovery item 6. audio/adhan.mp3, iftar.mp3 and sehri.mp3 (about 800KB, dated 1 July) are tracked, passthrough-copied to the site root by eleventy.config.js:16, referenced by nothing anywhere in src/ (grep returns zero), and all three currently serve HTTP 200 on the live domain. They look like a stray inclusion from another project. This is waseem rather than do because removing content already published on a site under his identity is publishing, which is a gated outbound action - an agent must not quietly delete them. Done means he says keep or remove. An agent may prepare the change and must not ship it.

**Resolved 2026-09-21**: Waseem confirmed that the prayer-time audio files are intentional — they feed a personal Home Assistant automation over HTTP, are deliberately unlinked from the site, and must remain in the repo. Added `audio/README.md` explaining this, linked from `eleventy.config.js`, and recorded in `AGENTS.md`. Item resolved; do not reopen or remove files.


## p3

### portfolio origin is waseemilyas.github.io, not portfolio - a clone by directory name fails

*campaign id `q-personal-069b` · kind `hygiene` · source ref: orch-personal, 08:10Z*
**Status: still open** — Part (a) resolved in PR #13 (commit `6c6b169`): canonical clone URL `https://github.com/Waseemilyas/waseemilyas.github.io.git` and repo naming distinction are documented in `AGENTS.md` lines 13–18. Part (b) remains open: 15 historical agent branches on origin were pruned leaving only adjudicated branches (`agent/AUT-3875`, `agent/AUT-5846`, `chore/auto-69-version-reporting`, `chore/portfolio-hygiene`, `fix/wire-release-guard`), but deciding whether any remaining or unmerged agent branches represent pending work or litter was explicitly left open per the 2026-09-21 record.

Met while cloning for a lane, and it cost me a failed clone. The local directory is /opt/automancer/projects/personal/portfolio but the GitHub repository is Waseemilyas/waseemilyas.github.io - the user-pages repo, which is why the site is served by GitHub Pages at all. git clone https://github.com/Waseemilyas/portfolio.git fails with "Repository not found". This unit has a standing rule against guessing a DEPLOY url after an orchestrator probed a strangers pages.dev site; the same rule applies to a CLONE url and nothing wrote it down. Also met and NOT chased: origin carries 21 branches, 17 of them agent/AUT-*, of which exactly two are covered by existing items (aa0e and 2f8f, both abandoned-with-reason). The other 15 have never been judged. Done means (a) the real origin is recorded where a reader meeting the directory will see it - MANIFEST, the repo handover or its AGENTS.md - and (b) somebody decides whether the 15 unjudged agent branches are pending work or litter, WITHOUT deleting any of them: this repo publishes under Waseems identity and one of the two already-judged branches would have un-published two live notes if merged. Treat every one of those branches as a possible trap, not as a backlog.

**Note 2026-09-21**: Part (a) is resolved: the real origin clone URL (`https://github.com/Waseemilyas/waseemilyas.github.io.git`) is recorded in `AGENTS.md`. Part (b) (deciding whether the 15 unjudged agent branches are pending work or litter, without deleting any) remains open.
