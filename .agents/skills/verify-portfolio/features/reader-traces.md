# Source comprehension receipts

Last verified: 2026-10-16 on Linux.

Each reader started before repository discovery and stopped after explaining the deciding code and change paths. These are source traces, separate from browser verification. Monotonic nanoseconds include discovery, reading and comprehension. Different fresh readers took the before and after samples; one sample is not a controlled performance benchmark. One of three final traces meets thirty seconds, earning three of ten judged points. Draft and capability traces remain follow-up work; no rerun was coached to replace them. `<checkout>` replaces the local checkout path below. Historical line references in these receipts describe their recorded revisions, not navigation instructions.

| Behaviour | Before (seconds) | After (seconds) | Final result |
| --- | ---: | ---: | --- |
| Mobile navigation | 41.901065364 | 23.785300956 | Pass |
| Draft publication | 16.749124588 | 53.056715082 | Miss |
| Capability map | 95.196378679 | 35.230232854 | Miss |

## reader-before-nav

```json
{
  "start_monotonic_ns": 1874332889880863,
  "start_utc": "2026-10-16T08:48:00.268542+00:00",
  "commands": [
    "rg --files -g AGENTS.md -g '*nav*' -g '*Nav*' -g '*Header*' -g package.json -g 'src/**' -g 'app/**'"
  ],
  "end_monotonic_ns": 1874374790946227,
  "end_utc": "2026-10-16T08:48:42.169608+00:00",
  "elapsed_seconds": 41.901065364,
  "comprehension_complete_at_end": true,
  "within_30_seconds": false,
  "head": "bf685314dc1bc682f8003c409471278991cd50f0",
  "read_order": [
    {
      "order": 1,
      "command": "rg --files -g AGENTS.md -g '*nav*' -g '*Nav*' -g '*Header*' -g package.json -g 'src/**' -g 'app/**'",
      "purpose": "Locate instructions, shared layout, navigation script and stylesheet."
    },
    {
      "order": 2,
      "command": "cat AGENTS.md src/_includes/base.njk src/assets/js/site.js && rg -n -C 5 'nav|768|820|inert|hidden' src/assets/css/styles.css && git rev-parse HEAD",
      "purpose": "Read shared visible markup, deciding script, CSS breakpoint and verify original revision."
    },
    {
      "order": 3,
      "command": "rg -n --glob '!.audit/**' 'setDrawer|primary-nav|nav-toggle|data-open|aria-hidden|\\.inert|720px' . && cat src/_data/site.json scripts/nav-drawer.test.mjs package.json",
      "purpose": "Check all state writers and relevant test/source contracts, navigation data and test entry point."
    }
  ],
  "failed_guesses": [],
  "answer": {
    "surface": "src/_includes/base.njk:80-89 renders .nav-toggle button (aria-controls=primary-nav, aria-expanded=false) and nav#primary-nav from site.nav in src/_data/site.json, plus Email. Shared layout loads /assets/js/site.js with defer and styles.css.",
    "deciding_code": "src/assets/js/site.js:7-44: IIFE finds toggle/nav, creates drawerQ=matchMedia(\"(max-width: 720px)\"), and local setDrawer(open) is sole application writer of nav[data-open], toggle[aria-expanded], nav[aria-hidden] and nav.inert.",
    "state": "setDrawer computes hide=drawerQ.matches && !open; always writes data-open and aria-expanded as boolean strings; hide=true sets aria-hidden=true and inert=true; otherwise removes aria-hidden and sets inert=false. Initial setDrawer(false) closes it. No HTML hidden attribute is set.",
    "visual_state": "src/assets/css/styles.css:108-128: desktop .nav is flex and toggle display:none. At max-width:720px toggle displays; nav becomes fixed below 3.5rem header, translated -120% and visibility:hidden; data-open=true changes transform to zero and visibility:visible. Closing visibility is delayed .3s for animation. Reduced-motion rule at 342-345 removes transitions.",
    "focus": "Only Escape explicitly moves focus: document keydown checks key===Escape and data-open===true, calls toggle.focus() before setDrawer(false). Opening and link close do not explicitly focus an element or trap focus. Inert removes closed mobile navigation from interaction/tab order.",
    "events_that_change_state": [
      "Initialization calls setDrawer(false).",
      "Toggle click negates current data-open===true.",
      "Delegated nav click calls setDrawer(false) only when e.target.tagName===A; link default navigation is not prevented.",
      "Document Escape closes only when current data-open===true and restores toggle focus.",
      "drawerQ change listener, when addEventListener exists, reapplies setDrawer with current data-open; it preserves open state while recalculating aria-hidden/inert."
    ],
    "breakpoint_changes": "720px inclusive in both JS and CSS. A closed drawer entering desktop retains data-open=false/aria-expanded=false but becomes visible through desktop CSS and aria-hidden/inert are removed. Returning to mobile makes it hidden/inert again. An open drawer stays logically open across breakpoint changes. No resize focus adjustment.",
    "change_surfaces": "Behavior changes belong to setDrawer/event handlers in site.js; presentation and breakpoint also depend on styles.css; selectors/element structure and script inclusion belong to base.njk; site.json changes actual link entries. Keep CSS/JS 720px values coordinated. The repository-wide reference search found no other application writers.",
    "test_evidence": "scripts/nav-drawer.test.mjs (package.json test script) reads built markup/script with jsdom and checks initial closed attributes, click open, Escape close and toggle focus. It was read, not run; it does not exercise actual CSS/inert browser behavior, link selection or breakpoint transitions."
  },
  "unresolved_uncertainty": [
    "No browser or build was run, as required; browser support/actual focus behavior and generated output remain unverified.",
    "Direct-anchor click condition would miss a click targeted at a nested child if future links gain child elements. Current generated link template contains text only.",
    "No legacy MediaQueryList.addListener fallback exists; breakpoint accessibility resynchronization relies on addEventListener.",
    "No mobile nav progressive fallback is visible in CSS: mobile drawer remains visually hidden when JavaScript is disabled; this is source observation, not runtime verification."
  ],
  "constraints": {
    "repository_sources_edited": false,
    "only_write": ".audit/reader-before-nav.json",
    "outside_repo_reads": false,
    "browser_or_build": false
  }
}
```

## reader-before-drafts

```json
{
  "reader": "portfolio_before_drafts",
  "repository": "<checkout>",
  "revision": "bf685314dc1bc682f8003c409471278991cd50f0",
  "behavior": "A note marked draft:true must never appear in public page output, Notes listing, sitemap, or Atom feed.",
  "timing": {
    "clock": "Python 3 time.monotonic_ns()",
    "start_monotonic_ns": 1874341102605861,
    "end_monotonic_ns": 1874357851730449,
    "start_utc": "2026-10-16T08:48:08.481300+00:00",
    "end_utc": "2026-10-16T08:48:25.230397+00:00",
    "elapsed_seconds": 16.749124588,
    "comprehension_completed_before_end": true,
    "threshold_seconds": 30,
    "pass": true,
    "end_condition": "All four deciding source paths and the switches that alter them were understood before recording the end timestamp; writing this JSON happened afterward."
  },
  "read_commands_in_order": [
    {
      "order": 1,
      "command": "python - <<PY: start clock; git rev-parse HEAD; rg --files -g !node_modules -g !.git",
      "result": "Failed: python command not found (exit 127). No repository read occurred. Retried with python3; this failed interpreter launch precedes the timing interval."
    },
    {
      "order": 2,
      "command": "python3: time.monotonic_ns(); datetime.now(timezone.utc)",
      "result": "Started timer immediately before the first repository read."
    },
    {
      "order": 3,
      "command": "git rev-parse HEAD",
      "result": "Confirmed bf685314dc1bc682f8003c409471278991cd50f0."
    },
    {
      "order": 4,
      "command": "rg --files -g !node_modules -g !.git",
      "result": "Located Eleventy config, directory data, note templates, example draft, and checker files."
    },
    {
      "order": 5,
      "command": "cat AGENTS.md eleventy.config.js src/notes/posts/posts.11tydata.js src/notes/index.njk src/notes/feed.njk src/sitemap.njk src/notes/posts/example-post.md package.json",
      "result": "Read repository instructions and the full deciding files for all four surfaces."
    },
    {
      "order": 6,
      "command": "rg -n 'draft|collections\\.notes|eleventyComputed|permalink|eleventyExcludeFromCollections' eleventy.config.js src scripts .eleventyignore .gitignore",
      "result": "Confirmed shared collection consumers and rule lines. Also located checker/test references, which are verification rather than build decisions. Failed guess: .eleventyignore does not exist, causing exit 2; other matches were returned."
    },
    {
      "order": 7,
      "command": "python3: time.monotonic_ns(); datetime.now(timezone.utc)",
      "result": "Stopped comprehension timer."
    }
  ],
  "explanation": {
    "input_and_ownership": "Markdown posts under src/notes/posts/ inherit src/notes/posts/posts.11tydata.js. The directory data defaults draft to false (line 8). Individual post front matter supplies draft:true, demonstrated by src/notes/posts/example-post.md:6. eleventy.config.js sets src as input and _site as output.",
    "public_page_output": {
      "owner": "src/notes/posts/posts.11tydata.js:9-13",
      "deciding_code": "eleventyComputed.permalink: (data) => data.draft ? false : `/notes/${data.page.fileSlug}/`",
      "effect": "A truthy draft flag makes the computed permalink false, which suppresses writing the post page. The directory data also computes eleventyExcludeFromCollections true for a draft."
    },
    "shared_collection": {
      "owner": "eleventy.config.js:24-30",
      "deciding_code": "api.getFilteredByTag(\"note\").filter((item) => !item.data.draft).sort((a, b) => b.date - a.date)",
      "effect": "The notes collection explicitly removes truthy drafts in addition to the directory-level collection exclusion. All three discovery surfaces below consume this collection."
    },
    "notes_listing": {
      "owner": "src/notes/index.njk:16-25",
      "deciding_code": "for note in collections.notes",
      "effect": "Only the filtered notes collection supplies listing rows. The template has no independent draft predicate."
    },
    "sitemap": {
      "owner": "src/sitemap.njk:6-16",
      "deciding_code": "for note in collections.notes",
      "effect": "Note URLs come from the same filtered collection. The separate static URL list includes /notes/, which is the index route and does not expose the draft post."
    },
    "atom_feed": {
      "owner": "src/notes/feed.njk:12-25",
      "deciding_code": "for note in collections.notes",
      "effect": "Feed entries and the most recent updated timestamp derive from the filtered notes collection."
    },
    "what_can_change_it": [
      "Removing draft:true from a post, or setting it to false, restores the directory default/public behavior.",
      "Changing or overriding the effective computed permalink can alter whether the individual page is written. Changing only the collection filter does not control page writing.",
      "Changing the computed collection exclusion and/or the explicit notes filter changes collection membership. Both currently reject drafts, so removing just one rejection leaves the other.",
      "Changing the listing, sitemap, or feed templates to enumerate a different collection or hard-code a draft reference can bypass their present shared collection rule.",
      "Moving a post outside src/notes/posts/ can remove this directory-data inheritance; the new location would need its own publication rules."
    ]
  },
  "uncertainty": [
    "Source-only trace: no browser, build, dependency internals, or rendered output was inspected, so this does not independently demonstrate runtime Eleventy behavior.",
    "The checked files establish suppression for posts inheriting this directory data. No adversarial custom per-post computed override was tested.",
    "Existing output cleanup is not proven. package.json build runs eleventy without an explicit clean, so previously generated output in a reused output directory was not verified absent."
  ],
  "scope": "No source edits, build, browser, external search, or documentation edits. Only .audit/reader-before-drafts.json was written."
}
```

## reader-before-capabilities

```json
{
  "task": "Fresh-reader baseline: capability map content, selection behavior and fallbacks",
  "repository": "<checkout>",
  "head": "bf685314dc1bc682f8003c409471278991cd50f0",
  "measurement": {
    "clock": "Python time.monotonic_ns",
    "start_monotonic_ns": 1874346423333756,
    "end_monotonic_ns": 1874441619712435,
    "elapsed_seconds": 95.196378679,
    "start_utc": "2026-10-16T08:48:13.801994+00:00",
    "end_utc": "2026-10-16T08:49:48.998372+00:00",
    "start_boundary": "Before first repository read: before rg --files in read command 1.",
    "end_boundary": "After reading and comprehending all source evidence and formulating the answer; captured before writing this audit.",
    "under_30_seconds": false,
    "includes": "All discovery, guesses, repository reads, tool latency, source comprehension and answer formulation before audit writing."
  },
  "read_commands_in_order": [
    {
      "command": "python3 heredoc: print time.monotonic_ns and UTC, then subprocess.run(['rg','--files','-g','AGENTS.md','-g','VISION.md','-g','package.json','-g','src/**','-g','app/**','-g','pages/**','-g','index.html','-g','public/**'])",
      "guess": "Discover likely entry points across common src/app/pages/static layouts; no prior repository source had been read.",
      "result": "Eleventy templates, src/_data/capabilities.json, src/assets/js/site.js, src/assets/css/styles.css and AGENTS.md found; no VISION.md returned."
    },
    {
      "command": "rg -n 'capabil|diagram|node|reduced-motion|keydown|pointer|focus|click|touch|aria-live|aria-pressed' AGENTS.md src/index.njk src/assets/js/site.js src/assets/css/styles.css src/_data/capabilities.json src/_includes/base.njk package.json",
      "guess": "Capability UI likely lives in the index template, shared JS, CSS and the named capability data file.",
      "result": "Located the template loops, activation function, event registration, style rules and motion query."
    },
    {
      "command": "python3 heredoc: Path.read_text().splitlines() with numbered output for AGENTS.md:1-130, src/index.njk:38-78, src/assets/js/site.js:1-150, src/assets/css/styles.css:188-212 and 336-351, src/_data/capabilities.json:1-160, src/_includes/base.njk:60-140",
      "guess": "Read complete small JS/data files and local template/style context to establish the real deciding implementation and fallbacks.",
      "result": "Confirmed data-to-attributes-to-activate trace; no initial activate call; reduced-motion CSS does not disable map transitions."
    },
    {
      "command": "python3 heredoc: numbered Path.read_text() for src/index.njk:1-10, src/_includes/base.njk:1-60, package.json:1-45; probe .eleventy.js, eleventy.config.js, .eleventy.cjs, eleventy.config.mjs with Path.exists() and read existing candidates; subprocess.run(['git','rev-parse','HEAD'])",
      "guess": "Verify page layout, stylesheet loading, JS enhancement marker, static asset wiring, data directory and exact baseline commit; guessed four common Eleventy config names.",
      "result": "eleventy.config.js exists; src input, _data data directory and assets passthrough confirmed; exact HEAD matches requested original."
    }
  ],
  "answer": {
    "surface": {
      "path": "/",
      "section": "#capability, heading What I actually do",
      "evidence": [
        "src/index.njk:38-77",
        "src/index.njk:1-5"
      ],
      "description": "SVG capability map and adjacent polite live description; five focusable SVG g.node elements have role=button and aria-describedby=capread."
    },
    "content_decisions": [
      {
        "evidence": [
          "src/_data/capabilities.json:1-60",
          "eleventy.config.js:42-50"
        ],
        "symbols": [
          "capabilities.intro",
          "capabilities.nodes",
          "key",
          "code",
          "label",
          "title",
          "body",
          "x",
          "y",
          "textY",
          "trace"
        ],
        "explanation": "Eleventy exposes the JSON as capabilities. This file decides the intro, node labels/descriptions, identities, positions and SVG paths. Array order decides rendering order and the first static description. Keys are ai, digital, learn, web and creative."
      },
      {
        "evidence": [
          "src/index.njk:43",
          "src/index.njk:49-73"
        ],
        "symbols": [
          "n.key",
          "data-for",
          "data-key",
          "data-code",
          "data-title",
          "data-body",
          "capabilities.nodes[0]",
          "data-bind"
        ],
        "explanation": "The template generates path.trace[data-for] and g.node[data-key] from the same key; serializes description values as attributes; renders the first node code/title/body visibly in #capread. Labels, attributes and paths are generated at build time."
      }
    ],
    "behavior_decisions": [
      {
        "evidence": [
          "src/_includes/base.njk:46",
          "src/_includes/base.njk:110",
          "eleventy.config.js:14"
        ],
        "symbols": [
          "/assets/css/styles.css",
          "/assets/js/site.js"
        ],
        "explanation": "The base layout loads shared CSS and deferred shared JS; Eleventy copies src/assets to assets."
      },
      {
        "evidence": [
          "src/assets/js/site.js:61-87"
        ],
        "symbols": [
          "nodes",
          "traces",
          "bind",
          "activate(node)",
          "classList.toggle",
          "textContent"
        ],
        "explanation": "The IIFE queries all .node elements, all .trace elements, and the first [data-bind=k/h/p] elements. activate reads data-key/code/title/body, replaces bound text via textContent, gives .on only to the chosen node, and gives .on to every trace whose data-for equals that key. It returns early if the code binding or node is absent. There is no initial activation and no mouseleave reset."
      },
      {
        "evidence": [
          "src/assets/js/site.js:79-85"
        ],
        "symbols": [
          "mouseenter",
          "focus",
          "click",
          "keydown",
          "Enter",
          " "
        ],
        "explanation": "Mouse hover, keyboard focus and click each call the same activate function. Touch relies on the browser-generated click. Enter and Space explicitly prevent default and activate. The most recent activation persists until another event activates a node."
      },
      {
        "evidence": [
          "src/assets/css/styles.css:193-202"
        ],
        "symbols": [
          ".node:hover",
          ".node:focus-visible",
          ".node.on",
          ".trace.on"
        ],
        "explanation": "CSS decides visible node highlighting and connection stroke colour/width. Node circles/text transition over .25s; paths transition over .3s. CSS hover and visible focus can style a node independently of the JS .on state."
      }
    ],
    "what_can_change_it": [
      "Editing capabilities.json changes content, geometry, identities and default description. Reordering nodes changes the default and tab order.",
      "Editing index.njk changes the DOM contract between data-key/data-for, the description attributes and data-bind elements; the shared JS depends on that contract.",
      "Editing site.js changes event coverage and activation; selectors are document-wide, so additional matching elements elsewhere can participate or capture bindings.",
      "Editing styles.css or its design tokens changes the appearance and timing of highlighting. At runtime the listed input events change active state; no state is persisted by this script."
    ],
    "without_javascript": {
      "evidence": [
        "src/index.njk:47-73",
        "src/assets/css/styles.css:193-202",
        "src/assets/css/styles.css:336-341"
      ],
      "available": "Static map with hub, all five labels and connection shapes; static intro and first node description (AI automation); focusable button-role nodes; CSS hover/focus-visible node styling. Content is visible by default.",
      "unavailable": "Selecting nodes does not replace description text or add .on to their connections. Other descriptions remain only in data attributes, not a visible no-JS description list. No path starts with .on."
    },
    "reduced_motion": {
      "evidence": [
        "src/assets/js/site.js:4",
        "src/assets/js/site.js:46-59",
        "src/assets/js/site.js:61-87",
        "src/assets/css/styles.css:77",
        "src/assets/css/styles.css:194-198",
        "src/assets/css/styles.css:342-346"
      ],
      "available": "All capability selection behavior remains active. JS samples prefers-reduced-motion once on load and bypasses delayed calibration reveals; CSS disables reveal/live-blip animations and navigation transitions, and disables smooth scrolling.",
      "limit": "The reduced-motion media rule does not remove capability node/path transitions. The JS preference snapshot does not have a change listener; the CSS media queries still respond to preference changes."
    }
  },
  "uncertainty": [
    "Verified from source only. No browser, build, rendered output or runtime event dispatch was used.",
    "Touch-to-click delivery and assistive-technology announcement behavior are inferred from standard browser semantics; they were not tested.",
    "No tests, fixtures or unrelated documents were inspected because this is a bounded readonly source-comprehension baseline.",
    "The requested 30-second target was not forced; elapsed time is the actual end-to-end comprehension interval."
  ],
  "writes": [
    ".audit/reader-before-capabilities.json"
  ],
  "source_edits": false,
  "post_measurement_action": "Write this JSON and parse it back solely to verify the audit artifact."
}
```

## reader-after-nav

```json
{
  "start_monotonic_ns": 1875395321354213,
  "end_monotonic_ns": 1875419106655169,
  "elapsed_seconds": 23.785300956,
  "head": "db41b0dd38a0464c402f07f7439db6af832f7613",
  "read_order": [
    "Repository recursive filename listing (guessed conventional source locations; excluded .audit/.git/node_modules paths from output)",
    "AGENTS.md full text",
    "src/assets/js/site.js full text",
    "src/_includes/base.njk full text",
    "src/assets/css/styles.css full text read; printed nav/inert/hidden/breakpoint matching lines",
    "git rev-parse HEAD"
  ],
  "answer": {
    "source": "src/_includes/base.njk renders button.nav-toggle and nav#primary-nav from site.nav plus Email, and loads /assets/js/site.js defer. src/assets/js/site.js IIFE calls setupNavigation().",
    "deciders": "setupNavigation() obtains button.nav-toggle and #primary-nav; HTMLButtonElement/nav guard controls binding. drawerQ=matchMedia(\"(max-width: 720px)\"). setDrawer(open) sets data-open and aria-expanded; hide=drawerQ.matches && !open sets aria-hidden=true and nav.inert=true, otherwise removes aria-hidden and sets inert=false. setDrawer(false) initializes closed. Toggle click negates data-open. Nav click closes only when e.target instanceof Element and e.target.tagName === \"A\". Escape keydown closes only when data-open === \"true\", calling toggle.focus() before setDrawer(false). No focus movement occurs on open or link selection. No HTML hidden attribute is set.",
    "visual": "src/assets/css/styles.css .nav defaults flex and .nav-toggle display:none; @media(max-width:720px) displays toggle and makes nav fixed, translated -120%, visibility:hidden. .nav[data-open=\"true\"] restores translateY(0), visibility:visible.",
    "breakpoint": "drawerQ change listener, if addEventListener exists, calls setDrawer with current data-open boolean. It preserves open state; closed nav becomes accessible/non-inert above 720px and hidden/inert again below. Open nav remains open across crossings. CSS desktop rules independently display nav; no resize focus adjustment occurs."
  },
  "uncertainty": [
    "Source-level trace only; browser behavior and generated _site output were not read or run.",
    "An initial temporary .audit/nav-reader-start.json was written in error and removed before completion; no prior .audit receipt was read."
  ],
  "pass": true
}
```

## reader-after-drafts

```json
{
  "task": "reader-after-drafts",
  "head": "db41b0dd38a0464c402f07f7439db6af832f7613",
  "startUTC": "2026-10-16T09:05:54.212793+00:00",
  "endUTC": "2026-10-16T09:06:47.269574+00:00",
  "startMonotonicNs": 1875406834197464,
  "endMonotonicNs": 1875459890912546,
  "elapsedSeconds": 53.056715082,
  "within30Seconds": false,
  "pass": false,
  "readOrder": [
    {
      "order": 1,
      "read": "rg --files -g !.audit/** -g !node_modules/** -g !.git/**",
      "purpose": "Initial repository discovery; no prior trace read"
    },
    {
      "order": 2,
      "read": "AGENTS.md (full)"
    },
    {
      "order": 3,
      "read": "eleventy.config.js (full)"
    },
    {
      "order": 4,
      "read": "src/notes/posts/posts.11tydata.js (full)"
    },
    {
      "order": 5,
      "read": "src/notes/index.njk (full)"
    },
    {
      "order": 6,
      "read": "src/sitemap.njk (full)"
    },
    {
      "order": 7,
      "read": "src/notes/feed.njk (full)"
    },
    {
      "order": 8,
      "read": "src/_includes/note.njk (full)"
    },
    {
      "order": 9,
      "read": "src/notes/posts/example-post.md (full)"
    },
    {
      "order": 10,
      "read": "rg -n --hidden draft|collections\\.notes|eleventyExcludeFromCollections src eleventy.config.js scripts, excluding .git/node_modules/.audit",
      "purpose": "Check real producers, consumers and guards; initial file guesses were direct config/data/templates"
    },
    {
      "order": 11,
      "read": "git rev-parse HEAD"
    },
    {
      "order": 12,
      "read": "git status --short (clean)"
    },
    {
      "order": 13,
      "read": "scripts/site-check.mjs:640-656"
    },
    {
      "order": 14,
      "read": "scripts/site-check.mjs:850-907"
    },
    {
      "order": 15,
      "read": "scripts/site-check.test.mjs:740-776"
    },
    {
      "order": 16,
      "read": "package.json:1-110 (full file has 28 lines)"
    }
  ],
  "fullAnswer": "For a Markdown note under src/notes/posts/, draft: true is resolved by the directory data owner src/notes/posts/posts.11tydata.js:9-14. The default is draft: false. Its computed permalink returns false for a truthy draft, which suppresses the individual page write, and its computed eleventyExcludeFromCollections returns true, which removes the item from collections. The note layout src/_includes/note.njk renders note content but does not decide whether a page is published.\n\nThe explicit public Notes collection owner is eleventy.config.js:34-40: getFilteredByTag(\"note\") is filtered with !item.data.draft, then sorted newest first. The listing src/notes/index.njk:16-24 consumes only collections.notes; the sitemap src/sitemap.njk:14-16 consumes only collections.notes for note URLs; the Atom feed src/notes/feed.njk:12-24 consumes only collections.notes for entries and its newest-item updated timestamp. These templates have no independent draft predicate; their exclusion depends on that shared collection. Directory collection exclusion and the explicit notes filter both protect collection-based outputs, while permalink false independently protects page emission.\n\nTo publish a particular note, remove its draft: true front matter or set it to false, then rebuild from clean output. src/notes/posts/example-post.md:6 is an actual draft input. To change draft policy globally, change the computed permalink/exclusion in posts.11tydata.js and the notes collection predicate in eleventy.config.js consistently; changing a consumer template only changes that output, and removing only one collection guard leaves the other in effect. Source-side front matter overrides could also change the effective Eleventy data, so this trace establishes the conventional note path rather than an absolute confidentiality boundary for arbitrary overrides. Draft source remains in the repository.\n\nThe rendered-output checker is scripts/site-check.mjs:643-654 (findDraftSlugs reads draft: true front matter) and :855-905 (rejects an existing notes/<slug> output directory and exact draft routes in sitemap.xml or notes/feed.xml). scripts/site-check.test.mjs:742-775 supplies a mutation fixture that leaks all three and asserts each failure. That checker does not directly inspect the Notes listing for draft entries. The listing exclusion is established here by its real collection consumer. No build, test or browser was run, so these are source-trace findings rather than fresh rendered-output proof. A dirty output directory can retain old pages; permalink false prevents new output and does not itself delete stale files. package.json:11 provides the clean command.",
  "uncertainty": [
    "No Eleventy build or tests executed; no browser or production verification.",
    "Eleventy dependency internals were not inspected; permalink false and collection-exclusion semantics follow the platform boundary expressed by this code.",
    "The draft checker scans direct Markdown filenames and literal draft: true; arbitrary front-matter formatting, permalink overrides and custom routes were not exercised.",
    "No .audit prior traces or outside-repository material read."
  ]
}
```

## reader-after-capabilities

```json
{
  "start_utc": "2026-10-16T09:05:58.412738+00:00",
  "end_utc": "2026-10-16T09:06:33.642952+00:00",
  "start_monotonic_ns": 1875411034061833,
  "end_monotonic_ns": 1875446264294687,
  "elapsed_seconds": 35.230232854,
  "read_order": [
    {
      "read": "repository file discovery",
      "method": "pathlib.rglob; .audit, .git, node_modules, .next excluded",
      "guess": "capabilities likely in src/_data, index template and site assets"
    },
    {
      "read": "AGENTS.md",
      "method": "cat"
    },
    {
      "read": "GLOSSARY.md",
      "method": "cat"
    },
    {
      "read": "src/_data/capabilities.json",
      "method": "cat"
    },
    {
      "read": "src/index.njk",
      "method": "cat"
    },
    {
      "read": "src/assets/js/site.js",
      "method": "rg -n -C 6 capabil|node|reduce|motion"
    },
    {
      "read": "src/assets/css/styles.css",
      "method": "same rg"
    },
    {
      "read": "src/assets/js/site.js lines 45-115",
      "method": "sed"
    },
    {
      "read": "src/_includes/base.njk",
      "method": "cat"
    },
    {
      "read": "eleventy.config.js",
      "method": "cat"
    },
    {
      "read": ".audit/reader-after-capabilities.json",
      "method": "load own just-written artifact only, correct premature initial-activation inference after comprehending complete setupCapabilityMap source",
      "guess": "Initial highlight was inferred incorrectly from first-node text; corrected from full function."
    }
  ],
  "explanation": {
    "content": "src/_data/capabilities.json owns intro and five nodes, each with key, code, label, title, body, x/y/textY and SVG trace path. src/index.njk capability section loops capabilities.nodes to render .trace[data-for] and SVG .node role=button/tabindex=0 with data-key/code/title/body. The first array entry supplies initial #capread text, with aria-live=polite and nodes aria-describedby=capread.",
    "behaviour": "src/assets/js/site.js setupCapabilityMap() finds .node/.trace and [data-bind=k/h/p]. Its activate(node) copies data-code/title/body into textContent, toggles .on exclusively on selected node, and toggles traces whose data-for matches data-key. mouseenter, focus, click (including touch activation), and keydown Enter or Space invoke activate; keyboard prevents default. There is no initial activate call: initial description is the first data entry, but no node/trace starts with .on. Changes to content/geometry belong in capabilities.json; template changes affect attributes/DOM wiring; event and selection rules belong in setupCapabilityMap; visible highlights belong in styles.css .node:hover/:focus-visible/.on and .trace.on.",
    "without_javascript": "Static diagram labels, intro and first-node description render from Nunjucks. SVG nodes remain focusable and CSS hover/focus-visible colors still work. Other node descriptions and selected connection changes require JS; no server-rendered list of all descriptions was found in the template.",
    "reduced_motion": "JS rm uses matchMedia prefers-reduced-motion: reduce for reveal setup, not capability activation. CSS reduced-motion media disables reveal/blip animations and nav transitions and turns off smooth scroll. Capability .node circle/core/text and .trace transitions remain .25s/.3s, so selection still works but these transitions are not disabled.",
    "delivery": "eleventy.config.js sets src input, _data data and _site output, with src/assets copied unchanged. src/_includes/base.njk loads /assets/css/styles.css and deferred /assets/js/site.js. setupCapabilityMap() is invoked at the end of site.js."
  },
  "uncertainty": [
    "Source trace only: no browser/build/runtime checks, as requested.",
    "Initial artifact preparation incorrectly assumed an initial activate call; full-source comprehension corrected it. Elapsed includes correction, so this is not a <=30-second pass.",
    "No prior .audit files or prior traces read; own output reloaded only for correction."
  ],
  "within_30_seconds": false
}
```
