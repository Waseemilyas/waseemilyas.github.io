---
name: waseemilyas.uk
description: Two-surface static portfolio — warm-graphite console meets near-white paper essay.
colors:
  graphite-900: "oklch(0.17 0.008 65)"
  graphite-800: "oklch(0.21 0.009 65)"
  graphite-700: "oklch(0.27 0.010 65)"
  bone: "oklch(0.93 0.006 75)"
  bone-mute: "oklch(0.70 0.008 70)"
  line-dark: "oklch(1 0 0 / 0.12)"
  paper: "oklch(0.985 0.002 70)"
  paper-sink: "oklch(0.955 0.003 70)"
  ink: "oklch(0.22 0.010 60)"
  ink-mute: "oklch(0.46 0.010 60)"
  line-light: "oklch(0.22 0.01 60 / 0.14)"
  signal: "oklch(0.66 0.185 42)"
  signal-deep: "oklch(0.56 0.170 40)"
  trace: "oklch(0.80 0.130 78)"
  on-signal: "oklch(0.16 0.02 40)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.7rem, 1.9rem + 4vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.038em"
  section-title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(2.1rem, 1.6rem + 2.4vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  card-title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(1.5rem, 1.25rem + 1.1vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(1.18rem, 1.05rem + 0.6vw, 1.45rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(0.98rem, 0.93rem + 0.25vw, 1.08rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "clamp(0.78rem, 0.75rem + 0.15vw, 0.86rem)"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  xs: "2px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  pill: "999px"
spacing:
  section-block: "clamp(3.5rem, 8vh, 6rem)"
  shell-inline: "clamp(1.1rem, 4vw, 3rem)"
  card-inline: "clamp(1.1rem, 2.5vw, 1.8rem)"
  grid-gap: "clamp(1.4rem, 3vw, 2.6rem)"
  head-gap: "1rem"
  head-below: "2.4rem"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.15rem"
  button-primary-hover:
    backgroundColor: "{colors.signal-deep}"
    textColor: "{colors.bone}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.15rem"
  panel:
    backgroundColor: "{colors.graphite-800}"
    textColor: "{colors.bone}"
    rounded: "{rounded.lg}"
    padding: "1.15rem 1.2rem 1.3rem"
  workcard:
    backgroundColor: "{colors.graphite-900}"
    textColor: "{colors.bone}"
    typography: "{typography.card-title}"
    padding: "1.4rem {spacing.card-inline}"
  workcard-hover:
    backgroundColor: "{colors.graphite-800}"
  lab-card:
    backgroundColor: "{colors.graphite-800}"
    textColor: "{colors.bone}"
    rounded: "{rounded.lg}"
    padding: "1.3rem 1.4rem"
  datasheet:
    backgroundColor: "{colors.paper-sink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  flag:
    backgroundColor: "{colors.paper-sink}"
    textColor: "{colors.ink-mute}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 0.95rem"
---

# waseemilyas.uk — Design System

<!--
  Design documentation only. This file is committed to a PUBLIC repository.
  Read AGENTS.md §1 before adding anything: no client names, no commercial
  detail, no infrastructure specifics. Tokens, type, and component structure
  only. Internal positioning and planning material stays in Paperclip.
-->

## Overview

A single-author portfolio built as a **two-surface system**. Every route picks one
surface and commits to it; the contrast between them is the art direction, not
decoration.

- **Console** (`.console`) — warm graphite, near-black but never neutral-black
  (hue 65, chroma 0.008–0.010). Carries the identity: the hero, capability map,
  work index, timeline, lab, footer. Overlaid with a 54px measurement grid
  radially masked from the top-right, plus corner registration marks (`.reg`).
  The register is *instrument panel*: monospace refs, readouts, live blips.
- **Essay** (`.essay`) — near-white paper (L 0.985, not cream) for long-form
  reading: case studies, about, notes. Ink on paper, generous measure, no grid.

The stack is Eleventy + hand-written CSS — **no framework, no utility classes, one
stylesheet** (`src/assets/css/styles.css`, ~300 lines). Every token is a CSS custom
property on `:root`. Typefaces are self-hosted variable Geist and Geist Mono; there
is no CDN dependency and no runtime style system.

Motion is an enhancement, never a gate: `[data-cal]` elements are visible by default
and the `.in` reveal only animates when JS runs and the user has not asked for reduced
motion. The same holds for the capability map and mobile nav — content works with JS
disabled.

## Colors

Colour is authored **in OKLCH throughout**, and the frontmatter above carries OKLCH
rather than hex on purpose. The palette leans on sub-0.01 chroma at a fixed warm hue
to keep the greys warm; round-tripping those through sRGB hex loses exactly the
quality that distinguishes this palette from a neutral-grey theme. Stitch's linter
validates hex only and will warn on this file — that warning is accepted rather than
splitting the source of truth away from the CSS.

**Console surface**

| Token | Value | Role |
| --- | --- | --- |
| `--graphite-900` | `oklch(0.17 0.008 65)` | Page background, workcard rest state |
| `--graphite-800` | `oklch(0.21 0.009 65)` | Raised fills: panels, lab cards, mobile nav |
| `--graphite-700` | `oklch(0.27 0.010 65)` | Diagram fills, timeline dots |
| `--bone` | `oklch(0.93 0.006 75)` | Primary text |
| `--bone-mute` | `oklch(0.70 0.008 70)` | Secondary text, nav rest, captions |
| `--line-dark` | `oklch(1 0 0 / 0.12)` | Hairlines and borders on console |

**Essay surface**

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `oklch(0.985 0.002 70)` | Page background |
| `--paper-sink` | `oklch(0.955 0.003 70)` | Recessed fills: figures, datasheet |
| `--ink` | `oklch(0.22 0.010 60)` | Primary text |
| `--ink-mute` | `oklch(0.46 0.010 60)` | Secondary text, captions |
| `--line-light` | `oklch(0.22 0.01 60 / 0.14)` | Hairlines and borders on paper |

**Signal**

| Token | Value | Role |
| --- | --- | --- |
| `--signal` | `oklch(0.66 0.185 42)` | The single accent — vermilion. Console use. |
| `--signal-deep` | `oklch(0.56 0.170 40)` | The same accent on paper, darkened for contrast |
| `--trace` | `oklch(0.80 0.130 78)` | Active connection lines in the capability map only |

There is **one accent colour**. `--signal` on console, `--signal-deep` on essay —
that pairing is the rule, not a preference (see `.essay .section-head .ref`,
`.prose a`, `.casenav a`). `--trace` is amber and exists solely to distinguish an
active trace from an active node in the capability SVG; do not promote it to a
second brand colour.

Translucent lines are deliberately alpha-on-surface rather than solid greys, so a
hairline stays correct if the surface beneath it changes.

## Typography

Two families, one fluid scale, six steps. Nothing outside the scale.

| Token | Range | Used for |
| --- | --- | --- |
| `--step--1` | `0.78rem → 0.86rem` | Mono labels, refs, captions, datasheet, footer |
| `--step-0` | `0.98rem → 1.08rem` | Body, nav, buttons |
| `--step-1` | `1.18rem → 1.45rem` | Hero lede, case kicker, `h3`, lab-card titles |
| `--step-2` | `1.5rem → 2.1rem` | Work card titles, prose `h2`, note titles |
| `--step-3` | `2.1rem → 3.4rem` | Section titles, case-study titles |
| `--step-4` | `2.7rem → 5.4rem` | Homepage hero only |

- `--sans` (Geist) sets everything structural. `--mono` (Geist Mono) is reserved for
  **metadata, not prose**: refs, keys, eyebrows, datasheet terms, timeline eras,
  the email link, and `.label` (uppercase, `0.08em` tracking).
- Headings tighten as they grow: the global rule is `font-weight: 700`,
  `line-height: 1.04`, `letter-spacing: -0.03em`, `text-wrap: balance`; the hero
  goes further to `800` / `-0.038em`.
- Measure is capped per context and those caps are load-bearing: hero `16ch`,
  hero lede `46ch`, section-head copy `42ch`, case title `20ch`, prose `68ch`
  (container `70ch`), about lede `24ch`.
- Body line-height is `1.55`; long-form prose relaxes to `1.62`.

### Heading hierarchy contract

Fixed by the AUT-3958 accessibility fix and **binding on new routes**. Every rendered
document has exactly one `<h1>` and skips no level.

| Route archetype | `<h1>` | `<h2>` | `<h3>` |
| --- | --- | --- | --- |
| **Home** (`index.njk`) — one page, many sections | Hero title | Each `.section-head` title | Cards and items inside a section (`.workcard`, `.lab-card`, `.milestone`, `.capread`) |
| **Index route** (`/work/`, `/lab/`) | The `.section-head` title | The cards themselves (`.workcard`, `.lab-card`) | — |
| **Simple route** (`/automancer/`, `/contact/`) | The `.section-head` title | Subsections, if any | — |
| **Essay/detail** (case studies, notes, `/about/`) | The `.casehead` title | `.prose h2`, or `.section-head h2` for a following section | `.prose h3`, `.milestone h3` |
| **Notes index** | `.casehead` title ("Notes") | `.note-item` titles | — |

The rule that makes this work: **a card's heading level depends on its page, not on
its class.** The same `.workcard` is an `<h3>` on the homepage (nested under a section
`<h2>`) and an `<h2>` on `/work/` (directly under the page `<h1>`). CSS therefore
matches both levels — `.workcard h2, .workcard h3`, `.lab-card h2, .lab-card h3`,
`.section-head h1, .section-head h2`, `.casehead h1, .casehead h2` — so promoting a
heading for semantics costs nothing visually. Never fork a component to change its
heading level; widen the selector instead.

## Elevation

The system is **flat and drawn, not shadowed**. Depth comes from three devices, in
this order of preference:

1. **Hairline borders** — `1px solid var(--line-dark)` on console,
   `var(--line-light)` on paper. This is the default and covers most cases.
2. **Surface shift** — a raised block moves one step up the surface ramp
   (`--graphite-900` → `--graphite-800`), or a recessed one moves down
   (`--paper` → `--paper-sink`). Hovering a `.workcard` is exactly this.
3. **Directional gradient** — reserved for the largest containers: `.panel` uses a
   180° `graphite-800 → graphite-900`; `.capfig` and `.diagram-panel` use a radial
   `120% 120%` highlight offset toward one corner.

There is **no shadow scale**. `box-shadow` appears only as a *glow ring* on small
signal elements — the hero eyebrow dot and key timeline milestones, both
`0 0 0 4px color-mix(in oklch, var(--signal) 18–22%, transparent)`. Do not introduce
drop shadows for cards or modals.

The one true overlay is `.topbar`: sticky, `color-mix` to 88% opacity over the page
background, `backdrop-filter: saturate(1.2) blur(6px)`, hairline bottom border.

Radii ladder: `2px` focus ring · `8px` buttons and small flags · `10px` proof lists ·
`12px` panels, lab cards, figures, datasheet · `14px` the largest frames (worklist,
capability figure) · `999px` the nav CTA pill.

## Components

Shared across routes — treat these as the inventory and extend rather than fork.

| Component | Surface | Where it appears | Notes |
| --- | --- | --- | --- |
| `.shell` | both | every route | The only container. `max-width: 78rem`, fluid inline padding. |
| `.topbar` / `.nav` | console | every route | Sticky blurred bar. Collapses to a full-width drawer below 720px via `.nav-toggle` + `data-open`. `aria-current="page"` paints the active link `--signal`. |
| `.section-head` | both | home sections, `/work/`, `/lab/`, `/automancer/`, `/contact/` | Baseline-aligned row: mono `.ref` + title + optional right-aligned `p`. Heading is `h1` or `h2` per the contract above. |
| `.casehead` | essay | case studies, notes, `/about/` | Detail-page counterpart: `.ref`, title, `.kick` lede, hairline rule below. |
| `.workcard` in `.worklist` | console | home, `/work/` | Three-column grid (ref · title+kick · go arrow) inside a 1px-gap list that fakes dividers via `background: var(--line-dark)`. Collapses to one column below 620px and drops the arrow. |
| `.lab-card` in `.lab-grid` | console | home, `/lab/` | `auto-fit minmax(15rem, 1fr)`. Hover lifts 2px and borders in `--signal`. |
| `.panel` / `.readout` | console | home hero | The live status panel. `dt` is mono `--signal`, hairline between rows. |
| `.capfig` + `.capread` | console | home | Interactive capability map. Nodes are focusable, respond to hover/focus/click/Enter/Space, and write into `[data-bind]` targets. |
| `.datasheet` | essay | case studies | Sticky `top: 4.5rem` sidebar `dl`. |
| `.prose` | essay | case studies, notes, about | Long-form container, `70ch`. |
| `.figure` / `.figcap` | essay | case studies | Inline SVG artefacts on `--paper-sink`. |
| `.milestone` in `.arc-line` | console | home, `/about/` | Timeline. `.key` milestones get a signal dot with glow. |
| `.btn` (`-primary` / `-ghost`) | both | throughout | `.essay .btn-ghost` restates the ghost variant in ink — the only surface-specific override. |
| `.label` / `.ref` / `.mono` | both | throughout | Mono metadata primitives. |
| `.flag` | essay | case studies | Dashed-border callout for content pending approval. |
| `.reg` | console | hero | Corner registration marks, `.tl/.tr/.bl/.br`. |

Accessibility baked into the components: a `.skip` link precedes the header,
`:focus-visible` is a `2px --signal` outline at `3px` offset on every focusable
element, the nav toggle maintains `aria-expanded`, and each `<article>` is labelled
by its own title id (`aria-labelledby="case-title"` / `"note-title"`).

## Do's and Don'ts

**Do**

- Pick one surface per route and commit. Console or essay, never blended.
- Use the six-step type scale and the `:root` tokens. If a value is not in the
  scale, the answer is usually the nearest step, not a new value.
- Reserve mono for metadata. Refs, keys, eras, captions, labels — never body copy.
- Follow the heading-hierarchy contract when adding a route, and widen an existing
  selector (`.foo h2, .foo h3`) rather than forking a component to change its level.
- Keep content visible without JS. Add `data-cal` for the reveal; never rely on it.
- Honour `prefers-reduced-motion` for anything new that moves.
- Cap the measure on new text blocks — an uncapped paragraph reads as a bug here.

**Don't**

- Don't add a second accent colour. `--signal` / `--signal-deep` is the whole
  system; `--trace` belongs to the capability map alone.
- Don't add drop shadows to cards, panels, or modals. Use a border or a surface step.
- Don't introduce a CSS framework, utility classes, a build step for styles, or a
  second stylesheet. One hand-written file is a settled decision.
- Don't load fonts from a CDN. Geist and Geist Mono are self-hosted deliberately.
- Don't use pure black or pure neutral grey. Every neutral carries warm hue 60–75.
- Don't hard-code hex where a token exists, and don't convert the OKLCH tokens to hex.
- Don't skip a heading level to get a size — set the level semantically and let the
  widened selector handle the size.

<!--
  Publication boundary: this file documents the visual system only. Audience,
  positioning, and commercial framing are deliberately absent — see docs/PRODUCT.md
  for the public-safe product context, and AGENTS.md §1 for what may never be
  added to this repo.
-->
