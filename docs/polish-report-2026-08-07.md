# Frontend polish pass — 2026-08-07

Branch: `polish/frontend-pass-2026-08-07`. Scope: refine, not redesign — the
established two-surface direction (console + essay) is untouched. No new
dependencies. Verified with `pnpm run build` (passes) and headless-Chrome
screenshots of every route at 1280px and 390px, before and after.

## Changes

### Contrast (WCAG AA, computed from the OKLCH tokens, not eyeballed)

- `--signal-deep` darkened `oklch(0.56 0.170 40)` → `oklch(0.53 0.170 40)`.
  Two pairs were below AA for normal text:
  - `.datasheet dt` on `--paper-sink`: 4.40 → 5.00:1
  - `.btn-primary:hover` (bone on signal-deep fill): 4.08 → 4.64:1
  - Essay links on paper improve alongside: 4.81 → 5.46:1.
  `docs/DESIGN.md` updated to match. Everything else already passed
  (bone-mute 7.15:1, ink-mute 6.84:1, signal-on-graphite 5.71:1, focus ring
  on paper 3.21:1).

### Hover/focus states — every interactive element now has both

- Added hover states where missing: `.wordmark`, `.nav-toggle`, `.casenav a`,
  `.prose a`, `.datasheet a` (previously unstyled entirely — datasheet links
  rendered as plain ink), `.notes-empty a`, and links inside `.contact-close`.
- Keyboard focus was already covered globally by the `:focus-visible` ring.

### Motion and interaction

- Hamburger icon morphs to an X while the mobile drawer is open (CSS on the
  toggle's `aria-expanded`; the single `<path>` was split into three).
- `Escape` closes the mobile drawer and returns focus to the toggle.
- `prefers-reduced-motion` now also kills the drawer slide and icon morph
  transitions, not just the reveal animations.

### Responsive and rhythm

- `.section-head p` no longer right-aligns (`margin-left: auto`) below 620px —
  it wrapped into an odd right-hugging block on phones.
- `.datasheet` unsticks below 860px, where its grid collapses to one column.
- `.contact-close` measure unified at the class's 48ch (inline 52ch/54ch
  overrides removed).

### Markup validity and a11y

- `.workcard` headings were nested in a `<span>` (flow content inside phrasing
  content — invalid). Now a `<div>`, on both `index.njk` and `work.njk`.
- All inline `style=""` attributes moved into the stylesheet (hero eyebrow,
  status-panel head, contact teaser, footer meta). None remain in `src/`.
- Deduped double labelling on the four SVG figures (`<figure aria-label>` +
  inner `<svg role="img" aria-label>` announced the same diagram twice). The
  svg keeps `role="img"` with the fuller description; the figure label is
  dropped. Matches the existing `.capfig` pattern.
- Atom feed advertised via `<link rel="alternate">`; Geist Mono preloaded
  (it renders above the fold on every page but only Geist was preloaded).

### Micro-copy

- 404: "See the work ↓" → "→" (it navigates to `/work/`; ↓ implied a scroll).
- Notes empty state rewritten for visitors — it previously published
  author-facing instructions naming the `src/notes/` content path. Now points
  to the work index and lab instead.

## Found but left

- **Detector warnings (impeccable `detect.mjs`), all pre-existing and
  deliberate:** Geist/Geist Mono flagged as overused (settled, self-hosted
  decision in DESIGN.md), the 54px measurement-grid background (the core
  console art direction), and the `.note-line` 2px signal `border-left`
  (an intentional callout component, not a card accent). No action.
- **`cs-auto.md` / `cs-icommit.md`** end on a plain `**Outcome.**` Markdown
  paragraph while `cs-care.md` wraps its final paragraph in explicit
  `<p><strong>` — cosmetic markup inconsistency only, renders identically.
- **Mobile nav drawer still requires JS** — documented, deliberate exception
  in DESIGN.md; the footer nav remains the no-JS fallback.
- **`theme-color` meta** stays a hex literal (`#2b2622`) — `var()` is not
  available in meta content.
- **Hamburger morph and Escape-close** were verified by code review and build,
  not by an interactive browser session (headless screenshots cannot click).
- **Reserved-but-unused styles** (`.flag`, `.essay .btn-ghost`, `.essay
  .label`) left in place per DESIGN.md — they are documented as reserved.

## Guardrails

Diff checked against AGENTS.md §1: no client names, codes, or commercial
detail added; only the "shell" CSS class matched a name-scan, a false
positive. Content changes were limited to the 404 arrow and the notes empty
state.
