# Use mobile navigation

At phone width, the initially closed drawer is inert. Click the toggle; expanded
state becomes true and the links become available. Press Escape; it closes and
focus returns to the toggle. Open again and select About; the route changes and
the destination's drawer is closed. Resize to desktop and check links are no
longer inert or aria-hidden.

`setupNavigation` owns registration and `setDrawer` owns the accessibility state.
The stylesheet owns visibility and its matching breakpoint. Without JavaScript the
mobile toggle cannot open; footer links are the documented fallback. The helper
blocks the enhancement script in a fresh navigation and checks that fallback,
including static capability text. Do not call that a working no-JS drawer.
