---
title: "Example note (template)"
date: 2026-06-10
summary: "A template post showing the notes content model. Marked draft, so it is never built or published."
tags: ["note"]
draft: true
---
This is a template note. It exists only to document the content model and is
marked `draft: true`, so Eleventy never writes it to disk and it never appears
in the notes index or feed.

To publish a note:

1. Copy this file to `src/notes/posts/my-note.md`.
2. Set `title`, `date`, and `summary`, and remove `draft: true` (or set it to `false`).
3. Write the body in Markdown.

The `Notes` route, layout, navigation link, and Atom feed already exist, so a new
post needs no structural work.
