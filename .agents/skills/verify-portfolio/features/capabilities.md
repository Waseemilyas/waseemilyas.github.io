# Explore capabilities

On Home scroll the capability map into view. Use hover, click and focus/Enter across
the authored nodes, then Space on the first. Each action must change the visible
heading/body to that node's authored description and select exactly that node and
its connection. The panel is live-announced by its existing markup.

## Capability map: fast source trace

| Question | Deciding owner | What it decides |
| --- | --- | --- |
| What content is available? | `src/_data/capabilities.json` | Authored capability labels, descriptions and node/connection data. |
| What reaches the page before JS? | `src/index.njk` → `#capability` markup/data attributes | Renders the SVG node controls and the first authored capability description as initial panel content. This is the no-JS fallback. |
| What changes selection? | `src/assets/js/site.js` → `setupCapabilityMap` | Reads rendered node attributes, then activation updates selected node/connection and panel heading/body. Pointer, focus and Enter/Space are activation paths; no route changes. |
| What supplies the accessible panel? | `src/index.njk` panel markup + activation updates in `site.js` | Existing live-announcement attributes accompany the changed panel text. |
| What changes behavior or appearance? | Data + `index.njk` attributes/markup + `setupCapabilityMap`; `src/assets/css/styles.css` capability selectors | Data changes authored options; template changes node-to-data wiring/initial state; JS changes event/state behavior; CSS changes visualization and selection presentation. Keep these contracts aligned. |
| What is the verification boundary? | `.agents/skills/verify-portfolio/drive.py` via the feature-map skill | Drives visible nodes and keyboard paths and checks resulting state. It is headless: it does not prove physical touch or assistive technology. |

**Fast entry:** follow one capability from JSON → template `data-*` attributes/SVG node → `setupCapabilityMap` → panel. Without JS, the first description remains rendered; no selected-node interaction is promised. `setupReveals` and reduced-motion CSS are separate decorative behavior, not capability-map fallback logic.

The helper uses actual visible inputs, never an internal activation function. Its headless pointer operations do not prove physical touch or assistive technology.
