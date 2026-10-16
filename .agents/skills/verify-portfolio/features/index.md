# Visitor feature map

| Journey | Surface | Deciding owner |
| --- | --- | --- |
| [Read and navigate](reading.md) | Main pages and not-found page | `src/_includes/base.njk`, `src/_data/site.json`, page templates |
| [Read work and notes](work-and-notes.md) | Work cards, case studies, Notes, articles, Atom feed | `eleventy.config.js`, `src/work/`, `src/notes/` |
| [Explore capabilities](capabilities.md) | Home capability map | `setupCapabilityMap`, capability data and index template |
| [Use mobile navigation](navigation.md) | Header toggle, Escape, links, responsive state | `setupNavigation`, `setDrawer`, header CSS |
| [Read with reduced motion](motion.md) | Entry reveals and static content | `setupReveals`, reduced-motion CSS |
| [Contact and linked assets](links-and-assets.md) | Contact links, sitemap, intentional audio URLs | Contact/base templates, passthrough config |

The helper discovers built HTML files from `_site/` and checks each at both widths.
This avoids maintaining a second route inventory. New interactions need an actual
Drive step and resulting-state proof here; a page screenshot alone does not exercise them.
