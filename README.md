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

## Structure

```
src/
  _data/        site config, capability + timeline data (JSON)
  _includes/    base.njk layout, case.njk, note.njk, partials
  assets/       css/ js/ fonts/ img/
  static/       passthrough to site root (CNAME, robots, manifest, favicons)
  work/         case studies (one Markdown file each)
  notes/        notes content model (route + feed; zero posts at launch)
  *.njk         Home, About, Work, Automancer, Lab, Contact
eleventy.config.js
```

## Notes / blog content model

Add a post by dropping a Markdown file in `src/notes/posts/` with front matter
(`title`, `date`, `summary`, optional `tags`, `draft`). The `/notes/` route, layout, and
Atom feed (`/notes/feed.xml`) already exist. Reveal **Notes** in the primary nav once at
least one non-draft post is published.

## Deployment

Deployment is automatic. `.github/workflows/deploy.yml` builds `_site/` and publishes it
to GitHub Pages on **every push to `main`**, and can also be started by hand
(`workflow_dispatch`). The pre-launch manual-only gate was retired when the site went
live, and the Pages source is already set to "GitHub Actions". Anything merged to `main`
is public within a few minutes, so review content before pushing; the content rules that
replaced the deployment gate are in `AGENTS.md`.

Contact: `waseem@automancer.uk`
