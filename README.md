# waseemilyas.uk

Personal portfolio of **Waseem Ilyas** — technologist, builder, automation practitioner.
A distinctive static site built with [Eleventy](https://www.11ty.dev/) and deployed to
GitHub Pages. Live domain: <https://waseemilyas.uk>.

## Stack

- **Eleventy (11ty)** static site generator — zero client framework, pure HTML/CSS/vanilla JS.
- **Geist + Geist Mono**, self-hosted (no CDN dependency).
- Two-surface art direction: warm-graphite *console* + near-white *paper essay*.

## Develop

```bash
pnpm install
pnpm run serve     # local dev server with live reload
pnpm run build     # static build → _site/
```

### Checks and git hooks

The repo carries a dependency-free safety net:

```bash
pnpm run test      # focused node:test suite (concurrency 1) — checker + hook-setup logic
pnpm run build     # production build → _site/
pnpm run check     # tests, then a fresh production build, then rendered-site contract checks over _site/
```

`scripts/site-check.mjs` verifies the **built** output against the site's published
contracts and fails with file-named diagnostics when any of them break: exactly one
`<h1>` per page with no skipped heading levels; each required description/canonical/OG
metadata property present exactly once (with `og:url` matching the canonical); JSON-LD
present, parseable and carrying an `@context`; every root-relative or relative `href`/
`src` resolving into `_site/`;
sitemap ↔ built-page parity in both directions, with every `<loc>` on the site's own
origin; structurally valid sitemap/Atom XML (single root element, balanced tags,
whitespace-separated quoted attributes, no bare `&` in text or attribute values)
declaring their expected roots; draft posts never
reaching disk, the sitemap or the feed; a required `/revision.txt` whose bytes are
exactly the expected build revision plus one newline (see below — missing, malformed or
stale artifacts fail the check); and the OG image's PNG signature+IHDR (or
JPEG SOFn) header reporting the declared 1200×630. Header check only — pixels are
not decoded, checksums are not verified, renderability is not claimed.

### Build revision artifact and deploy proof

Every production build stamps its output with the exact commit it was built from:

- **Artifact.** `_site/revision.txt` (served at `/revision.txt`) contains **exactly**
  the full 40-character commit SHA followed by one newline. Nothing else is written.
- **Revision source.** `SITE_REVISION` is selected first, and only when it is valid
  (exactly 40 lowercase hex) and consistent with any `GITHUB_SHA` also present;
  otherwise `GITHUB_SHA` (the authority on GitHub Actions); otherwise a local build
  derives it truthfully from `git rev-parse HEAD`, so developers never set anything
  by hand.
- **No ambiguous builds.** A malformed (not 40 lowercase hex chars) or contradictory
  (`SITE_REVISION` ≠ `GITHUB_SHA`) input **fails the build** rather than publishing an
  ambiguous value. A variable that is **set but blank/whitespace is an error too** —
  it fails the resolution instead of silently falling through to the next source;
  only a genuinely unset key falls through. The shared resolver lives in
  `scripts/revision.mjs`.
- **Checked at build time.** `node scripts/site-check.mjs` requires the artifact to
  match the expected revision (`--revision <sha>`, defaulting to the same resolution
  as the build) and distinguishes missing / malformed / stale artifacts.
- **Verified in production after every deploy.** `.github/workflows/deploy.yml`
  fetches `https://waseemilyas.uk/revision.txt` **after** the Pages deployment step
  with a cache-busting query parameter and bounded retries (Pages propagation is
  asynchronous), captures the response body and compares it byte-for-byte against
  `github.sha`. A timeout, HTTP error, connection failure, malformed body or stale
  revision turns the workflow red with a concise diagnostic that prints no secrets.
- **The verifier proves itself.** Its gate can fail and can pass, both directions are
  tested:

  ```bash
  node scripts/verify-deploy.mjs --prove-verification
  # expects FAILURE against http://127.0.0.1:9/revision.txt (loopback, nothing
  # listening), states that no deploy occurs, and itself exits non-zero if the
  # probe unexpectedly passes
  pnpm run test   # includes acceptance + rejection controls: matching SHA accepted;
                  # old SHA / HTTP error / connection failure / malformed content /
                 # another app's response all rejected, servers loopback-only and closed
  ```

Git hooks live in `.githooks/` (sensitive-path blocklist, gitleaks staged/history
scan, regex fallback). They are wired automatically by installs that do real work
(fresh clones, CI runners) — the package's `prepare` lifecycle invokes
`node scripts/setup-hooks.mjs`, which validates the hooks directory first (`.githooks`
must be a directory containing executable `pre-commit` and `pre-push` files — a file
named `.githooks`, a missing hook or a non-executable one fails the install loudly),
then sets local `core.hooksPath=.githooks` and verifies it by reading the value back
from git config; note pnpm may skip
lifecycle scripts entirely on an already up-to-date re-install. Only a genuine
"not inside a git work tree" result (or an absent `.githooks/`) degrades to an
informative no-op, so installs in non-git contexts never fail; operational git
failures — missing executable, unsafe-directory refusal, permission errors —
fail loudly with their diagnosis instead of masquerading as a skip. Wire by hand
anytime with `pnpm run setup`, and confirm
wiring with `git config --get core.hooksPath` (it must print `.githooks`) —
never assume from file existence alone. Setup itself proves the hooks are
present and executable before wiring, so a successful run means git will
invoke them; it does not guarantee any particular hook passes. The hooks use
`gitleaks` when available
on PATH and fall back to a regex/filename scan when not; CI runs the official
gitleaks action regardless.

Pull requests get their own CI (`.github/workflows/ci.yml`): secret scan plus
tests/build/check. Deployment stays automatic on push to main via
`.github/workflows/deploy.yml`.

## Structure

```
src/
  _data/        site config, capability + timeline data (JSON)
  _includes/    base.njk layout, case.njk, note.njk, partials
  assets/       css/ js/ fonts/ img/
  static/       passthrough to site root (CNAME, robots, manifest, favicons)
  work/         case studies (one Markdown file each)
  notes/        notes route + feed, with the posts in notes/posts/
  *.njk         Home, About, Work, Automancer, Lab, Contact
eleventy.config.js
```

## Notes / blog content model

Add a post by dropping a Markdown file in `src/notes/posts/` with front matter
(`title`, `date`, `summary`, optional `tags`, `draft`). The `/notes/` route, layout, and
Atom feed (`/notes/feed.xml`) already exist, **Notes** is in the primary nav, and
`summary` becomes the page's meta description unless the post sets `description`
explicitly. A post with `draft: true` is never written to disk, so an unfinished note can
sit in `posts/` safely.

## Deployment

Deployment is automatic. `.github/workflows/deploy.yml` builds `_site/` and publishes it
to GitHub Pages on **every push to `main`**, and can also be started by hand
(`workflow_dispatch`). After publishing, the workflow verifies the live domain serves
exactly the deployed commit via `/revision.txt` (see above). The pre-launch
manual-only gate was retired when the site went
live, and the Pages source is already set to "GitHub Actions". Anything merged to `main`
is public within a few minutes, so review content before pushing; the content rules that
replaced the deployment gate are in `AGENTS.md`.

Contact: `waseem@automancer.uk`
