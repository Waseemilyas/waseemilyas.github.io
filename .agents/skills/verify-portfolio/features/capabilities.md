# Explore capabilities

On Home scroll the capability map into view. Use hover, click and focus/Enter across
the authored nodes, then Space on the first. Each action must change the visible
heading/body to that node's authored description and select exactly that node and
its connection. The panel is live-announced by its existing markup.

`src/_data/capabilities.json` supplies content; `src/index.njk` renders attributes,
SVG nodes and initial text; `setupCapabilityMap` registers activation. The helper
uses those actual visible inputs, never an internal activation function. Its
headless pointer operations do not prove physical touch or assistive technology.
