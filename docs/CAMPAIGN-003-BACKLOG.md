# Backlog carried out of campaign 003

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

Git state needs resolving before this repo can be closed: the local default branch is 1 commit behind the remote ref we already hold; 3 branches carrying commits not merged into the default branch; the checkout is parked on 'chore/auto-69-version-reporting', not the default branch. Done means the tree is clean, the default branch matches the fetched remote, and every stale branch is merged or deleted with a reason.

### The portfolio still names past clients under grandfathered terms

*campaign id `q-personal-ee71` · kind `decision` · source ref: PERSONAL-28*

Public, names other people businesses, and open since 7 August. Two linked calls: keep, trim or pull, and whether those clients ever consented to being named. An agent makes the change afterwards, but contacting a past client is outbound and needs his sign-off first.

### Three prayer-time audio files are published on the portfolio site and nothing links to them

*campaign id `q-personal-961d` · kind `review` · source ref: discovery-portfolio*

Discovery item 6. audio/adhan.mp3, iftar.mp3 and sehri.mp3 (about 800KB, dated 1 July) are tracked, passthrough-copied to the site root by eleventy.config.js:16, referenced by nothing anywhere in src/ (grep returns zero), and all three currently serve HTTP 200 on the live domain. They look like a stray inclusion from another project. This is waseem rather than do because removing content already published on a site under his identity is publishing, which is a gated outbound action - an agent must not quietly delete them. Done means he says keep or remove. An agent may prepare the change and must not ship it.


## p3

### portfolio origin is waseemilyas.github.io, not portfolio - a clone by directory name fails

*campaign id `q-personal-069b` · kind `hygiene` · source ref: orch-personal, 08:10Z*

Met while cloning for a lane, and it cost me a failed clone. The local directory is /opt/automancer/projects/personal/portfolio but the GitHub repository is Waseemilyas/waseemilyas.github.io - the user-pages repo, which is why the site is served by GitHub Pages at all. git clone https://github.com/Waseemilyas/portfolio.git fails with "Repository not found". This unit has a standing rule against guessing a DEPLOY url after an orchestrator probed a strangers pages.dev site; the same rule applies to a CLONE url and nothing wrote it down. Also met and NOT chased: origin carries 21 branches, 17 of them agent/AUT-*, of which exactly two are covered by existing items (aa0e and 2f8f, both abandoned-with-reason). The other 15 have never been judged. Done means (a) the real origin is recorded where a reader meeting the directory will see it - MANIFEST, the repo handover or its AGENTS.md - and (b) somebody decides whether the 15 unjudged agent branches are pending work or litter, WITHOUT deleting any of them: this repo publishes under Waseems identity and one of the two already-judged branches would have un-published two live notes if merged. Treat every one of those branches as a possible trap, not as a backlog.

