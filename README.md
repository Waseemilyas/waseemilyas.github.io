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
npm install
npm run serve     # local dev server with live reload
npm run build     # static build → _site/
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

Deployment is gated. `.github/workflows/deploy.yml` builds `_site/` and publishes to
GitHub Pages, but runs **on demand only** (`workflow_dispatch`) until the live-site
replacement is approved. Set the Pages source to "GitHub Actions" at cut-over.

Contact: `waseem@automancer.uk`
