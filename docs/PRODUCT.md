# waseemilyas.uk — Product Context

<!--
  PUBLICATION BOUNDARY — read before editing.

  This file lives in a PUBLIC repository and exists to give design tooling the
  minimum context it needs to make on-brand decisions. Every statement below is
  already published on the live site at https://waseemilyas.uk.

  Do NOT add: client names or identifying detail, fees, rates, contract values,
  pipeline or prospects, revenue, headcount, infrastructure or account names, or
  any internal strategy. That material is out of bounds here regardless of how
  useful it would be to a design agent. See AGENTS.md §1 — it is binding.

  If a design decision genuinely needs private context, the answer is to ask on
  the project record, not to write it into this file.
-->

## Register

**Brand.** This is a single-author portfolio: the design *is* the product. There is
no application surface, no authenticated area, no dashboard — every route is a
public, content-led page. Design decisions should be judged on whether they make
the work legible and the author credible, not on task throughput.

## Target Users

Three audiences read this site, in rough order of commercial weight:

1. **Small-business owners weighing up AI and automation.** Non-technical, sceptical
   of hype, short on time. They want to know whether this is worth it for a business
   their size, and what working with someone like this would actually be like. The
   site's own framing of this conversation is the `/contact/` copy.
2. **Prospective collaborators and peers** — people assessing depth and range across
   web, design, instructional design, and product delivery. They read `/work/` and
   `/about/` and want evidence, not adjectives.
3. **People who arrived from elsewhere** — a link, a referral, a search — and are
   answering a single question: *who is this and are they real?* The homepage hero
   and status panel exist for them.

Context of use: overwhelmingly a first visit, often on a phone, usually under a
minute before they decide to keep reading or leave. Mobile-first is a requirement,
not a nicety.

## Purpose

Present a long, genuinely varied technical career as a coherent practice rather than
a list of jobs, and make the current work — automation and practical digital systems
for small businesses — easy to understand and easy to start a conversation about.

The job to be done, per audience: *"decide whether to email this person."* Every
route funnels there, and the email address is treated as the primary call to action
throughout — including as a display-scale element on `/contact/`.

Secondary purpose: be a working demonstration. A site that is fast, accessible,
framework-free, and hand-built is itself evidence for the claims the copy makes.
Regressions in performance or accessibility are therefore content failures, not just
technical ones.

## Brand Personality

**Precise · warm · unhyped.**

- **Precise** — measurement grids, registration marks, monospace refs, datasheets.
  The visual language is borrowed from instruments and technical drawing. Everything
  looks calibrated because the claim is that the work is.
- **Warm** — the greys carry hue, never neutral black. The paper surface is for
  reading, not for looking impressive. The tone is a practitioner talking plainly,
  not an agency presenting.
- **Unhyped** — no growth-marketing register, no superlatives, no manufactured
  urgency. Claims are specific and checkable, or they are not made. Case studies are
  described by sector and outcome, generically, by design.

Emotional target: the calm confidence of someone who has already done this. Not
excitement, not novelty.

## Anti-references

Design directions this project deliberately rejects:

- **The generic startup landing page** — purple-to-blue gradients, floating glass
  cards, three-icon feature rows, a testimonial carousel. Interchangeable, and reads
  as a template.
- **The dark "AI product" aesthetic** — neon-on-black, glow everywhere, animated
  particle mesh. This site is dark on the console surface but *warm and matte*; the
  distinction is the whole point.
- **Agency portfolio maximalism** — full-bleed autoplaying video, custom cursors,
  scroll-hijacking, a loading screen. Style asserted in place of substance.
- **The unstyled developer portfolio** — default system font, blue links, a bare
  README-as-homepage. The opposite failure, and equally uninformative.
- **Corporate consultancy stock** — handshake photography, boardroom imagery, vague
  "digital transformation" copy.

## Design Principles

1. **Two surfaces, no blending.** Console for identity and index; paper for reading.
   A route picks one. The contrast between them carries the art direction.
2. **One accent, used sparingly.** A single vermilion signal marks what is live,
   active, or actionable. When everything is highlighted, nothing is.
3. **Content works without JavaScript.** Motion, the capability map, and the mobile
   nav are progressive enhancement. Nothing that matters is gated behind a script.
4. **Accessibility is part of the design.** Visible focus, one `<h1>` per document,
   no skipped heading levels, honoured reduced-motion, keyboard-operable
   interactives. Treated as a hard constraint, not a later pass.
5. **Restraint over decoration.** Borders and surface steps instead of shadows; the
   type scale instead of one-off sizes; no framework. Additions must earn their place.
6. **Specific beats impressive.** Prefer a concrete, checkable statement over a
   confident vague one — in copy and in the interface.
7. **Speed is a feature.** Self-hosted fonts, no CDN, no client framework, a single
   stylesheet. Anything that slows a first mobile visit needs a real justification.

---

Visual system, tokens, component inventory, and the heading-hierarchy contract:
see [`DESIGN.md`](./DESIGN.md).
