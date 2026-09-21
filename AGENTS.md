# AGENTS.md — waseemilyas.uk

This is Waseem Ilyas's **public** personal portfolio. Anything committed here is
published to the open internet at <https://waseemilyas.uk> and is indexed,
archived, and screenshotted by parties nobody controls. There is no staging gate
between a commit and the public site. Treat every edit as a press release.

Tracked in Paperclip as **WI-PF1**. This file is public, so it states the rules
only; the project record in Paperclip holds the internal specifics (client
codes, credential sources, live object ids). Read that too — never copy any of
it into this repo.

**Repository origin & clone URL:** The remote origin is
`https://github.com/Waseemilyas/waseemilyas.github.io.git`.
The local directory is named `portfolio`, but the GitHub repository is
`Waseemilyas/waseemilyas.github.io` (the GitHub Pages user repository).
Cloning `Waseemilyas/portfolio.git` fails with "Repository not found"; always clone
or reference `https://github.com/Waseemilyas/waseemilyas.github.io.git`.

---

## 1. Standing content guardrails (never negotiable)

1. **Never name a client.** No client company name, client brand, client product
   name, client staff name, client domain, or internal client code. Not in
   prose, not in a link, not in an image, not in alt text, not in a filename,
   not in a commit message, not in an HTML comment, not in `_data/*.json`.
2. **Never publish commercially sensitive detail.** No fees, day rates, contract
   values, contract terms, pipeline, prospects, revenue, headcount, client
   volumes, margins — nothing a competitor could price against.
3. **Never publish anything that creates security exposure.** No infrastructure
   specifics (hostnames, IPs, ports, server detail, file paths), no provider or
   account names, no internal tooling or credential-store names beyond what is
   already public, no internal architecture detail that would help someone
   attack Automancer or a client. Screenshots of internal systems are forbidden
   outright.
4. **Describe work generically — sector plus outcome.** The published pattern is
   `"operations platform for a home-care provider"`: never the client's name,
   never a recognisable fingerprint. `src/work/cs-care.md` is the reference
   implementation of this rule; copy its posture. Beware jigsaw identification —
   sector plus region plus size plus dates plus one distinctive feature can
   identify a client with no name present. Drop detail until it cannot.
5. **When in doubt, do not publish.** Ambiguity is not a tie to be broken in
   favour of shipping. Leave the content out and raise the question on the
   WI-PF1 project for Waseem to rule on. Silence is always the safe default and
   is never a failure.

### Pre-existing content is grandfathered

Some published content predates these guardrails and shipped under a QA privacy
review and board release approval in June 2026. It has been ruled on and it
stays: **do not remove it and do not rewrite it.** This is a closed carve-out
for specific existing content, not a precedent — **do not extend its pattern to
anything new.** New and changed content follows section 1 with no exceptions,
and `src/work/cs-care.md` remains the reference implementation. The specifics
are recorded in Paperclip, not here.

## 2. What agents are here to do

Keep the site a current reflection of the kind of work Waseem is doing —
generically described. In scope, ungated:

- New or refreshed case studies in `src/work/`, anonymised per rule 4.
- Notes/posts in `src/notes/posts/` (front matter: `title`, `date`, `summary`,
  optional `tags`, `draft`). Reveal **Notes** in the primary nav only once at
  least one non-draft post is published.
- Capability, about, and timeline copy in `src/_data/` and the `*.njk` pages.
- Build, dependency, accessibility, performance, and link hygiene.

Out of scope without an explicit instruction: redesigns, art-direction changes,
new top-level sections, changing the stack, and anything recorded as a settled
design decision.

## 3. Publishing is ungated; telling people about it is not

The estate's decision policy applies here unchanged. What is specific to this
repo is where the line falls:

- **Publishing is ungated.** Push to `main`; GitHub Actions builds and deploys
  to GitHub Pages. Publish a content change that satisfies section 1 on your own
  authority.
- **Anything that reaches a person is outbound**, and needs Waseem's approval
  first: email, DMs, messages, a contact form, submitting the site to a
  directory, newsletter, aggregator, or awards list, posting it to social media,
  or contacting anyone on Waseem's behalf. Publishing a page is not outreach;
  telling someone about it is.

## 4. Working rules

- Verify before publishing: `pnpm install && pnpm run build` must pass, and read
  the rendered output of whatever changed — not just the source.
- `grep` the diff for client names and codes before committing. If the change
  touches `src/work/`, `src/_data/`, `src/about.njk`, `src/index.njk`, or
  `src/lab.njk`, re-read section 1 first.
- Credentials stay in the host secret store. The browser error-reporting DSN is
  the only key that may legitimately appear in built output.
- `.gitignore` keeps internal planning docs, `_site/`, and `node_modules/` out of
  this public repo on purpose. Leave those rules in place and commit only what
  they already allow.
- Keep the site static and GitHub Pages-compatible unless Waseem approves
  otherwise.
- **Prayer-time audio files (`audio/`)**: `audio/adhan.mp3`, `audio/iftar.mp3`, and
  `audio/sehri.mp3` are intentional assets fetched over HTTP by an external Home
  Assistant automation. They are deliberately not linked anywhere on the site, but
  must remain in this repository and must not be deleted or renamed. See
  `audio/README.md`.

## 5. Docs, in reading order

1. `README.md` — stack, build, structure. Read before your first build here.
2. `docs/DESIGN.md` — the design system: tokens, type scale, component
   inventory, and the heading-hierarchy contract. Read before any UI change.
3. `docs/PRODUCT.md` — register, audience, and design principles. Read before
   writing or rewriting site copy. It restates only what is already published on
   the live site; section 1 applies to it in full.
4. The WI-PF1 project record in Paperclip — internal spec, copy deck, art
   direction, hygiene decisions, and live object ids. Read it before any content
   change, and copy nothing from it into this repo.

`docs/DESIGN.md` and `docs/PRODUCT.md` are the public, design-only design-system
context. Root `/DESIGN.md` and `/PRODUCT.md` stay gitignored for internal
planning material and must not be un-ignored.
