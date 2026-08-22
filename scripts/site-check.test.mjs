// Focused node:test suite for scripts/site-check.mjs.
//
// Run via `pnpm test` → `node --test --test-concurrency=1 scripts/`
// (file-level concurrency committed at 1 in package.json; tests within this
// file are sequential by default).
//
// Every contract named by the checker header, the README and the CLI success
// line carries a discriminating negative control: a mutation that makes that
// specific assertion fail, verified against the exact diagnostic contract id —
// not merely a non-zero result. A fully valid fixture is the positive control.
//
// Read-only proof: the checker must never write. The snapshot observes the
// whole promised property — file bytes (sha256), inode identity (dev/ino),
// size/mode/timestamps, AND every directory including empty ones. Its own
// teeth are proven below: each materially different sabotage (same-bytes
// rewrite with restored mtime, added file, added empty directory, content
// rewrite) is shown to change the comparison for the intended reason, while a
// legacy files-only/size+mtime view of the same fixture is shown to be blind.
//
// Fixtures live under os.tmpdir() mkdtemp directories and are always removed.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { imageSize, runSiteChecks, validateXml } from "./site-check.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "site-check.mjs");
const SITE_URL = "https://fixture.example";

// Valid-but-obviously-fake build revision used across the fixture tree.
const FIXTURE_SHA = "ab".repeat(20);

// ---------------------------------------------------------------------------
// fixture helpers

/**
 * Header-only PNG: signature + IHDR + IEND (no pixel data or CRCs). Sufficient
 * because the checker reads PNG/JPEG dimension headers only — it does not
 * decode pixels, so these fixtures prove nothing about decoding.
 */
function makePng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: grayscale
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pageHtml(urlPath, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fixture</title>
<meta name="description" content="fixture description">
<link rel="canonical" href="${SITE_URL}${urlPath}">
<meta property="og:title" content="Fixture">
<meta property="og:description" content="fixture description">
<meta property="og:url" content="${SITE_URL}${urlPath}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE_URL}/assets/img/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"F"}</script>
</head>
<body>
${body}
</body>
</html>
`;
}

const VALID_SITEMAP = `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/about/</loc></url>
  <url><loc>${SITE_URL}/notes/post-one/</loc></url>
</urlset>
`;

const VALID_FEED = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Fixture</title>
  <entry><title>P1</title><link href="${SITE_URL}/notes/post-one/"/><updated>2026-08-01T00:00:00Z</updated></entry>
</feed>
`;

/** Both XML roots the checker validates, with their valid baseline text. */
const XML_TARGETS = [
  ["sitemap", "sitemap.xml", VALID_SITEMAP, "</urlset>", "<urlset "],
  ["atom feed", "notes/feed.xml", VALID_FEED, "</feed>", "<feed "],
];

/**
 * Build a fully valid fixture tree. Returns { root, siteDir, postsDir }.
 * Removal happens via the test context.
 */
function makeFixture(t) {
  const root = mkdtempSync(join(os.tmpdir(), "site-check-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const siteDir = join(root, "site");
  const postsDir = join(root, "posts");

  mkdirSync(join(siteDir, "about"), { recursive: true });
  mkdirSync(join(siteDir, "notes", "post-one"), { recursive: true });
  mkdirSync(join(siteDir, "assets", "img"), { recursive: true });
  mkdirSync(postsDir, { recursive: true });

  writeFileSync(
    join(siteDir, "index.html"),
    pageHtml("/", '<h1>Home</h1><h2>Section</h2><a href="/about/">About</a>')
  );
  writeFileSync(
    join(siteDir, "about", "index.html"),
    pageHtml(
      "/about/",
      '<h1>About</h1><h2>Detail</h2><h3>Deep</h3><a href="/">Home</a>' +
        '<a href="../notes/post-one/">A note</a><img src="/assets/img/og-card.png" alt="og">'
    )
  );
  writeFileSync(
    join(siteDir, "notes", "post-one", "index.html"),
    pageHtml("/notes/post-one/", '<h1>Post one</h1><p><a href="/notes/feed.xml">Feed</a></p>')
  );
  writeFileSync(join(siteDir, "assets", "img", "og-card.png"), makePng(1200, 630));
  writeFileSync(join(siteDir, "sitemap.xml"), VALID_SITEMAP);
  writeFileSync(join(siteDir, "notes", "feed.xml"), VALID_FEED);
  // The build's machine-readable revision artifact: exactly SHA + one newline.
  writeFileSync(join(siteDir, "revision.txt"), `${FIXTURE_SHA}\n`);
  writeFileSync(join(postsDir, "post-one.md"), "---\ntitle: Post one\ndate: 2026-08-01\n---\nBody.\n");
  writeFileSync(join(postsDir, "hidden-draft.md"), "---\ntitle: Hidden\ndraft: true\n---\nSecret work.\n");

  return { root, siteDir, postsDir };
}

function runChecks(fixture, overrides = {}) {
  return runSiteChecks({
    siteDir: fixture.siteDir,
    postsDir: fixture.postsDir,
    siteUrl: SITE_URL,
    expectedRevision: FIXTURE_SHA,
    ...overrides,
  });
}

const ofCheck = (failures, id) => failures.filter((f) => f.check === id);

/** Let the clock advance past filesystem timestamp granularity. */
const tick = () => new Promise((r) => setTimeout(r, 60));

// ---------------------------------------------------------------------------
// positive control

test("valid fixture passes every contract with zero failures", () => {
  const fx = makeFixture(test);
  const { failures, stats } = runChecks(fx);
  assert.deepEqual(failures, []);
  assert.equal(stats.pages, 3);
  assert.equal(stats.sitemapUrls, 3);
  assert.equal(stats.revision, FIXTURE_SHA);
});

// ---------------------------------------------------------------------------
// negative controls — revision artifact (missing / malformed / stale)

test("mutation: missing revision.txt fails revision-artifact/present", () => {
  const fx = makeFixture(test);
  rmSync(join(fx.siteDir, "revision.txt"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "revision-artifact");
  assert.equal(hits.length, 1, JSON.stringify(failures));
  assert.match(hits[0].message, /revision-artifact\/present/);
  assert.equal(hits[0].file, "revision.txt");
});

for (const [label, content] of [
  ["an HTML page from a different app", "<!DOCTYPE html><html><body>Other app</body></html>\n"],
  ["a short SHA", `${FIXTURE_SHA.slice(0, 12)}\n`],
  ["an uppercase SHA", `${FIXTURE_SHA.toUpperCase()}\n`],
  ["the correct SHA without the trailing newline", FIXTURE_SHA],
  ["the correct SHA with two trailing newlines", `${FIXTURE_SHA}\n\n`],
]) {
  test(`mutation: revision.txt holding ${label} fails revision-artifact/malformed`, () => {
    const fx = makeFixture(test);
    writeFileSync(join(fx.siteDir, "revision.txt"), content);
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "revision-artifact");
    assert.equal(hits.length, 1, JSON.stringify(failures));
    assert.match(hits[0].message, /revision-artifact\/malformed/);
    assert.doesNotMatch(hits[0].message, /stale/);
  });
}

for (const [label, sha] of [
  ["an older but well-formed SHA", "cd".repeat(20)],
  ["the zero SHA", "0".repeat(40)],
]) {
  test(`mutation: revision.txt carrying ${label} fails revision-artifact/stale`, () => {
    const fx = makeFixture(test);
    writeFileSync(join(fx.siteDir, "revision.txt"), `${sha}\n`);
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "revision-artifact");
    assert.equal(hits.length, 1, JSON.stringify(failures));
    assert.match(hits[0].message, /revision-artifact\/stale/);
    assert.match(hits[0].message, new RegExp(`carries ${sha}, but this build is ${FIXTURE_SHA}`));
  });
}

test("runSiteChecks refuses to run without an expected revision (programmer error)", () => {
  const fx = makeFixture(test);
  assert.throws(() => runSiteChecks({ siteDir: fx.siteDir, postsDir: fx.postsDir, siteUrl: SITE_URL }), /expectedRevision/);
});

// ---------------------------------------------------------------------------
// negative controls — headings / links / JSON-LD

test("mutation: page without any h1 fails the headings/one-h1 diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "about", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace(/<h1>About<\/h1>/, ""));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "headings");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /no <h1>/);
});

test("mutation: duplicated h1 fails the headings/one-h1 diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "about", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace("<h2>Detail</h2>", "<h1>Dupe</h1><h2>Detail</h2>"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "headings");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /has 2 <h1>/);
});

test("mutation: h1 followed by h3 fails the headings/no-skipped-levels diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace("<h2>Section</h2>", "<h3>Skipped</h3>"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "headings").filter((f) => /jumps h1→h3/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
});

test("mutation: broken root-relative href fails the links/resolve diagnostic naming the target", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace('/about/">About', '/missing-page/">About'));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "links");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /missing-page/);
  assert.equal(hits[0].file, "index.html");
});

test("mutation: broken relative href fails the links/resolve diagnostic too", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "about", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace('../notes/post-one/">A note', './missing-rel/">A note'));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "links");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /missing-rel/);
});

test("mutation: link escaping the built root is treated as unresolved", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "about", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace('../notes/post-one/">A note', '../../outside-page/">Escape'));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "links");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /outside-page/);
});

test("mutation: unparseable JSON-LD fails the jsonld/valid diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  // Unquoted value breaks JSON parsing outright.
  writeFileSync(p, readFileSync(p, "utf8").replace('"@type":"Person"', '"@type":Person'));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "jsonld");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /not valid JSON/);
});

test("mutation: JSON-LD block without @context fails the jsonld/context diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace('"@context":"https://schema.org",', ""));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "jsonld");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /@context/);
});

test("mutation: a page carrying no JSON-LD at all fails the jsonld/present diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n/, "")
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "jsonld");
  assert.equal(hits.length, 1, JSON.stringify(failures));
  assert.match(hits[0].message, /jsonld\/present/);
  assert.match(hits[0].message, /no application\/ld\+json block found/);
});

// ---------------------------------------------------------------------------
// negative controls — metadata: canonical and individual OG correctness

test("mutation: missing canonical link fails the metadata/canonical diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace(/<link rel="canonical"[^>]*>\n/, ""));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /canonical/.test(f.message));
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /expected exactly one canonical link/);
});

test("mutation: canonical pointing at the wrong URL fails metadata/canonical naming the expectation", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(
      `<link rel="canonical" href="${SITE_URL}/">`,
      `<link rel="canonical" href="${SITE_URL}/wrong-path/">`
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /metadata\/canonical/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, new RegExp(`expected exactly one canonical link to ${SITE_URL.replace(/\./g, "\\.")}/,`));
});

test("mutation: duplicate canonical link fails the metadata/canonical diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  const link = `<link rel="canonical" href="${SITE_URL}/">`;
  writeFileSync(p, readFileSync(p, "utf8").replace(link, `${link}\n${link}`));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /metadata\/canonical/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  // The canonical diagnostic lists every href found — two identical ones here.
  assert.match(
    hits[0].message,
    new RegExp(`found ${SITE_URL.replace(/\./g, "\\.")}/, ${SITE_URL.replace(/\./g, "\\.")}/`)
  );
});

test("mutation: removed og:image meta fails the per-property og:image count diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace(/<meta property="og:image"[^>]*>\n/, ""));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /property=og:image\]/.test(f.message));
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /found 0/);
});

test("mutation: duplicate og:title fails the per-property og:title count diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  const meta = '<meta property="og:title" content="Fixture">';
  writeFileSync(p, readFileSync(p, "utf8").replace(meta, `${meta}\n${meta}`));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /property=og:title\]/.test(f.message));
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /found 2/);
});

test("mutation: og:url disagreeing with canonical fails metadata/og-url-matches-canonical", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(
      '<meta property="og:url" content="' + SITE_URL + '/">',
      '<meta property="og:url" content="' + SITE_URL + '/different/">'
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "metadata").filter((f) => /og-url-matches-canonical/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, /og:url https:\/\/fixture\.example\/different\/ != canonical/);
});

// Table-driven presence/count controls: EVERY required metadata property is
// mutated (removed, then duplicated) and the assertion names that specific
// property's diagnostic — so a regression in one property's check cannot be
// masked by the others staying green. Canonical has its own richer controls
// above (missing/wrong/duplicate).

const REQUIRED_METAS = [
  {
    prop: "description",
    tag: '<meta name="description" content="fixture description">',
    diagRe: /expected exactly one non-empty meta\[name=description\]/,
  },
  {
    prop: "og:title",
    tag: '<meta property="og:title" content="Fixture">',
    diagRe: /expected exactly one meta\[property=og:title\] with content/,
  },
  {
    prop: "og:description",
    tag: '<meta property="og:description" content="fixture description">',
    diagRe: /expected exactly one meta\[property=og:description\] with content/,
  },
  {
    prop: "og:url",
    tag: `<meta property="og:url" content="${SITE_URL}/">`,
    diagRe: /expected exactly one meta\[property=og:url\] with content/,
  },
  {
    prop: "og:type",
    tag: '<meta property="og:type" content="website">',
    diagRe: /expected exactly one meta\[property=og:type\] with content/,
  },
  {
    prop: "og:image",
    tag: `<meta property="og:image" content="${SITE_URL}/assets/img/og-card.png">`,
    diagRe: /expected exactly one meta\[property=og:image\] with content/,
  },
  {
    prop: "og:image:width",
    tag: '<meta property="og:image:width" content="1200">',
    diagRe: /expected exactly one meta\[property=og:image:width\] with content/,
  },
  {
    prop: "og:image:height",
    tag: '<meta property="og:image:height" content="630">',
    diagRe: /expected exactly one meta\[property=og:image:height\] with content/,
  },
];

for (const { prop, tag, diagRe } of REQUIRED_METAS) {
  test(`mutation: removed ${prop} fails that property's own count diagnostic`, () => {
    const fx = makeFixture(test);
    const p = join(fx.siteDir, "index.html");
    writeFileSync(p, readFileSync(p, "utf8").replace(`${tag}\n`, ""));
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "metadata").filter((f) => diagRe.test(f.message));
    assert.ok(hits.length >= 1, JSON.stringify(failures));
    assert.match(hits[0].message, /found 0/);
  });

  test(`mutation: duplicated ${prop} fails that property's own count diagnostic`, () => {
    const fx = makeFixture(test);
    const p = join(fx.siteDir, "index.html");
    writeFileSync(p, readFileSync(p, "utf8").replace(tag, `${tag}\n${tag}`));
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "metadata").filter((f) => diagRe.test(f.message));
    assert.ok(hits.length >= 1, JSON.stringify(failures));
    assert.match(hits[0].message, /found 2/);
  });
}

// ---------------------------------------------------------------------------
// negative controls — sitemap parity (origin + both directions)

test("mutation: sitemap loc on a foreign origin fails sitemap-parity/origin", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "sitemap.xml");
  writeFileSync(p, readFileSync(p, "utf8").replace(`${SITE_URL}/about/`, "https://other-host.example/about/"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "sitemap-parity").filter((f) => /origin/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, /other-host\.example/);
  assert.equal(hits[0].file, "sitemap.xml");
});

test("mutation: sitemap URL whose built file is gone fails sitemap-parity/built-target", () => {
  const fx = makeFixture(test);
  rmSync(join(fx.siteDir, "about"), { recursive: true, force: true });
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "sitemap-parity").filter((f) => f.file === "sitemap.xml");
  assert.ok(hits.some((f) => /built-target/.test(f.message)), JSON.stringify(failures));
  assert.match(hits.find((f) => /built-target/.test(f.message)).message, /\/about\//);
});

test("mutation: built page absent from sitemap fails sitemap-parity/listed", () => {
  const fx = makeFixture(test);
  mkdirSync(join(fx.siteDir, "lab"), { recursive: true });
  writeFileSync(join(fx.siteDir, "lab", "index.html"), pageHtml("/lab/", "<h1>Lab</h1>"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "sitemap-parity").filter((f) => f.file === "lab/index.html");
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, /listed/);
  assert.match(hits[0].message, /\/lab\//);
});

// ---------------------------------------------------------------------------
// negative controls — XML structure and declared roots, both roots covered

for (const [label, file, validText, closeTag, openPrefix] of XML_TARGETS) {
  test(`malformed XML (${label}): text after the root closes fails xml/structure`, () => {
    const fx = makeFixture(test);
    writeFileSync(
      join(fx.siteDir, file),
      validText.trimEnd() + `\n<stray xmlns="https://fixture.example/x"></stray>\n`
    );
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "xml").filter((f) => f.file === file);
    assert.ok(hits.some((f) => /xml\/structure/.test(f.message)), JSON.stringify(failures));
    assert.match(hits.find((f) => /xml\/structure/.test(f.message)).message, /second root element <stray>/);
  });

  test(`malformed XML (${label}): bare '&' in text fails xml/structure`, () => {
    const fx = makeFixture(test);
    writeFileSync(
      join(fx.siteDir, file),
      validText.replace(closeTag, `<note>a&b</note>${closeTag}`)
    );
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "xml").filter((f) => f.file === file);
    assert.ok(hits.some((f) => /xml\/structure/.test(f.message)), JSON.stringify(failures));
    assert.match(hits.find((f) => /xml\/structure/.test(f.message)).message, /bare "&"/);
  });

  test(`malformed XML (${label}): junk attribute text fails xml/structure`, () => {
    const fx = makeFixture(test);
    writeFileSync(
      join(fx.siteDir, file),
      validText.replace(openPrefix, `${openPrefix}junk tokens `)
    );
    const { failures } = runChecks(fx);
    const hits = ofCheck(failures, "xml").filter((f) => f.file === file);
    assert.ok(hits.some((f) => /xml\/structure/.test(f.message)), JSON.stringify(failures));
    assert.match(hits.find((f) => /xml\/structure/.test(f.message)).message, /malformed attribute syntax/);
  });
}

// Direct validator units — attribute separation and ampersand scope.
// The counterexamples come straight from re-review round 2.

test("xml attributes: an attribute glued to the previous one is rejected (exact counterexample)", () => {
  const r = validateXml('<feed xmlns="x"a="1"></feed>');
  assert.equal(r.ok, false, JSON.stringify(r.errors));
  assert.ok(
    r.errors.some((e) => /missing whitespace between attributes/.test(e)),
    JSON.stringify(r.errors)
  );
});

test("xml attributes: whitespace-separated multi-attribute tags are valid", () => {
  const r = validateXml(
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en" title="Fixture &amp; Co"><entry/></feed>'
  );
  assert.deepEqual(r.errors, [], JSON.stringify(r));
  assert.equal(r.rootName, "feed");
  assert.equal(r.xmlns, "http://www.w3.org/2005/Atom");
});

for (const [label, openTag] of [
  ["sitemap", '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'],
  ["atom feed", '<feed xmlns="http://www.w3.org/2005/Atom"'],
]) {
  test(`xml attributes (${label}): a bare '&' inside a quoted value is rejected`, () => {
    const r = validateXml(`${openTag} note="a&b"></${label === "sitemap" ? "urlset" : "feed"}>`);
    assert.equal(r.ok, false, JSON.stringify(r.errors));
    assert.ok(
      r.errors.some((e) => /bare "&" in the value of note/.test(e)),
      JSON.stringify(r.errors)
    );
  });

  test(`xml attributes (${label}): references inside quoted values are accepted`, () => {
    const r = validateXml(
      `${openTag} note="R&amp;D &#38; more"><e/></${label === "sitemap" ? "urlset" : "feed"}>`
    );
    assert.deepEqual(r.errors, [], JSON.stringify(r));
  });
}

test("mutation: glued attributes in the built sitemap fail xml/structure through runSiteChecks", () => {
  const fx = makeFixture(test);
  writeFileSync(
    join(fx.siteDir, "sitemap.xml"),
    VALID_SITEMAP.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<urlset xmlns="x"a="1">')
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "xml").filter((f) => f.file === "sitemap.xml");
  assert.ok(hits.some((f) => /xml\/structure/.test(f.message)), JSON.stringify(failures));
  assert.match(hits.find((f) => /xml\/structure/.test(f.message)).message, /missing whitespace between attributes/);
});

test("mutation: unclosed entry element fails the xml/structure diagnostic", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "notes", "feed.xml");
  writeFileSync(p, VALID_FEED.replace("</entry>", ""));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "xml");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /xml\/structure|unclosed|mismatched/);
  assert.equal(hits[0].file, "notes/feed.xml");
});

test("mutation: feed with the wrong declared root fails xml/declared-root", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "notes", "feed.xml");
  writeFileSync(
    p,
    VALID_FEED.replace('<feed xmlns="http://www.w3.org/2005/Atom">', '<rss xmlns="http://www.w3.org/2005/Atom">').replace(
      "</feed>",
      "</rss>"
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "xml");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /declared-root/);
  assert.match(hits[0].message, /<rss /);
});

test("mutation: sitemap with the wrong declared root fails xml/declared-root", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "sitemap.xml");
  writeFileSync(
    p,
    VALID_SITEMAP.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<rss version="2.0">').replace(
      "</urlset>",
      "</rss>"
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "xml");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /declared-root/);
  assert.match(hits[0].message, /root is <rss>, expected <urlset>/);
});

test("mutation: missing sitemap and feed fail xml/present naming both files", () => {
  const fx = makeFixture(test);
  rmSync(join(fx.siteDir, "sitemap.xml"));
  rmSync(join(fx.siteDir, "notes", "feed.xml"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "xml").filter((f) => /xml\/present/.test(f.message));
  assert.deepEqual(
    hits.map((f) => f.file).sort(),
    ["notes/feed.xml", "sitemap.xml"],
    JSON.stringify(failures)
  );
  assert.ok(hits.every((f) => /contract xml\/present/.test(f.message)));
});

// ---------------------------------------------------------------------------
// negative controls — draft exclusion (disk, sitemap AND feed)

test("mutation: leaked draft page fails draft-exclusion across disk, sitemap and feed", () => {
  const fx = makeFixture(test);
  mkdirSync(join(fx.siteDir, "notes", "hidden-draft"), { recursive: true });
  writeFileSync(
    join(fx.siteDir, "notes", "hidden-draft", "index.html"),
    pageHtml("/notes/hidden-draft/", "<h1>Hidden</h1>")
  );
  writeFileSync(
    join(fx.siteDir, "sitemap.xml"),
    VALID_SITEMAP.replace("</urlset>", `  <url><loc>${SITE_URL}/notes/hidden-draft/</loc></url>\n</urlset>`)
  );
  writeFileSync(
    join(fx.siteDir, "notes", "feed.xml"),
    VALID_FEED.replace(
      "</feed>",
      `  <entry><title>Hidden</title><link href="${SITE_URL}/notes/hidden-draft/"/></entry>\n</feed>`
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "draft-exclusion");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.ok(hits.every((f) => /hidden-draft/.test(f.message)));
  assert.ok(
    hits.some((f) => /draft-exclusion\/built/.test(f.message) && f.file === "notes/hidden-draft/" && /built directory/.test(f.message)),
    JSON.stringify(failures)
  );
  assert.ok(
    hits.some((f) => /draft-exclusion\/referenced/.test(f.message) && f.file === "sitemap.xml" && /referenced by sitemap\.xml/.test(f.message)),
    JSON.stringify(failures)
  );
  assert.ok(
    hits.some((f) => /draft-exclusion\/referenced/.test(f.message) && f.file === "notes/feed.xml" && /referenced by notes\/feed\.xml/.test(f.message)),
    JSON.stringify(failures)
  );
});

test("mutation: a feed <id> referencing the exact draft route is rejected", () => {
  const fx = makeFixture(test);
  writeFileSync(
    join(fx.siteDir, "notes", "feed.xml"),
    VALID_FEED.replace(
      "</feed>",
      `  <entry><title>Hidden</title><id>${SITE_URL}/notes/hidden-draft/</id></entry>\n</feed>`
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "draft-exclusion").filter((f) => f.file === "notes/feed.xml");
  assert.equal(hits.length, 1, JSON.stringify(failures));
  assert.match(hits[0].message, /referenced by notes\/feed\.xml/);
});

// Exact-route comparison, both directions (final-review fix 4): a draft slug
// that is a PREFIX of a published route must not false-positive, and prose
// that merely mentions the slug must not either — while the exact draft route
// itself is still rejected.
test("draft slug contained in a longer published route/title is NOT a false positive", () => {
  const fx = makeFixture(test);
  // Draft "post" — a strict prefix of the published slug "post-one" already
  // referenced by the valid sitemap and feed fixtures.
  writeFileSync(join(fx.postsDir, "post.md"), "---\ntitle: Post\ndraft: true\n---\nDraft.\n");
  // Prose mention of the bare slug in a feed title: legal under the contract.
  writeFileSync(
    join(fx.siteDir, "notes", "feed.xml"),
    VALID_FEED.replace("<title>P1</title>", "<title>About the word post</title>")
  );
  const { failures } = runChecks(fx);
  const referenced = ofCheck(failures, "draft-exclusion").filter((f) =>
    /referenced/.test(f.message)
  );
  assert.deepEqual(referenced, [], JSON.stringify(failures));
});

test("negative control: the same prefixed draft IS rejected when its exact route appears", () => {
  const fx = makeFixture(test);
  writeFileSync(join(fx.postsDir, "post.md"), "---\ntitle: Post\ndraft: true\n---\nDraft.\n");
  writeFileSync(
    join(fx.siteDir, "sitemap.xml"),
    VALID_SITEMAP.replace("</urlset>", `  <url><loc>${SITE_URL}/notes/post/</loc></url>\n</urlset>`)
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "draft-exclusion").filter(
    (f) => f.file === "sitemap.xml" && /\/notes\/post\//.test(f.message)
  );
  assert.equal(hits.length, 1, JSON.stringify(failures));
});

test("mutation: missing posts directory fails draft-exclusion/source", () => {
  const fx = makeFixture(test);
  const { failures } = runSiteChecks({
    siteDir: fx.siteDir,
    postsDir: join(fx.root, "posts-gone"),
    siteUrl: SITE_URL,
    expectedRevision: FIXTURE_SHA,
  });
  const hits = ofCheck(failures, "draft-exclusion").filter((f) => /draft-exclusion\/source/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, /not found/);
});

// ---------------------------------------------------------------------------
// negative controls — OG image presence, origin, header, declared dimensions

test("mutation: og:image target missing from the build fails og-image/exists", () => {
  const fx = makeFixture(test);
  rmSync(join(fx.siteDir, "assets", "img", "og-card.png"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "og-image");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /og-image\/exists/);
  assert.match(hits[0].message, /no built file/);
});

test("mutation: og:image pointing off-site fails og-image/local", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(
      `<meta property="og:image" content="${SITE_URL}/assets/img/og-card.png">`,
      '<meta property="og:image" content="https://cdn.other.example/img.png">'
    )
  );
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "og-image");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /og-image\/local/);
});

test("mutation: file without a PNG/JPEG dimension header fails og-image/header", () => {
  const fx = makeFixture(test);
  writeFileSync(join(fx.siteDir, "assets", "img", "og-card.png"), Buffer.from("definitely not an image, just bytes"));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "og-image");
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /og-image\/header/);
  assert.match(hits[0].message, /no readable PNG\/JPEG dimension header/);
});

test("mutation: header size disagreeing with DECLARED width/height fails og-image/dimensions", () => {
  const fx = makeFixture(test);
  // Image stays at the required 1200x630; only the declaration lies.
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace('property="og:image:height" content="630"', 'property="og:image:height" content="631"'));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "og-image").filter((f) => /dimensions/.test(f.message));
  assert.ok(hits.length === 1, JSON.stringify(failures));
  assert.match(hits[0].message, /header reports 1200x630 != declared 1200x631/);
  assert.doesNotMatch(hits[0].message, /required/); // required size still holds
});

test("mutation: OG image at the wrong required size fails og-image/dimensions vs required", () => {
  const fx = makeFixture(test);
  writeFileSync(join(fx.siteDir, "assets", "img", "og-card.png"), makePng(600, 315));
  const { failures } = runChecks(fx);
  const hits = ofCheck(failures, "og-image").filter((f) => /dimensions/.test(f.message));
  assert.ok(hits.length >= 1, JSON.stringify(failures));
  assert.match(hits[0].message, /header reports 600x315 != required 1200x630/);
});

// ---------------------------------------------------------------------------
// image header parsing — PNG signature/IHDR shape and JPEG walk, both ways.
// Unit-level: these prove the header reader rejects foreign bytes rather than
// reading fixed offsets off anything that starts like a signature. Headers
// only — nothing here says anything about pixel decoding or renderability.

/**
 * Minimal JPEG header fixture: SOI + one SOF0 frame segment (marker, declared
 * length, precision, height, width, then `sofLen - 8` filler component bytes)
 * + EOI. Header-shaped only — not a decodable image, by design.
 */
function makeJpeg(width, height, { sofLen = 17 } = {}) {
  const sof = Buffer.alloc(2 + sofLen);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(sofLen, 2); // Lf includes itself; spec minimum is 11
  sof[4] = 8; // sample precision
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from([0xff, 0xd9])]);
}

test("imageSize reads a well-formed signature+IHDR PNG (positive control)", () => {
  assert.deepEqual(imageSize(makePng(1200, 630)), { width: 1200, height: 630, format: "png" });
});

test("imageSize rejects a buffer whose first four bytes merely mimic a PNG signature", () => {
  // The re-reviewer's fabrication: bytes 0–3 set, no valid remaining
  // signature, no IHDR marker — dimensions planted at offsets 16/20.
  const fabricated = Buffer.alloc(24);
  fabricated[0] = 0x89;
  fabricated[1] = 0x50;
  fabricated[2] = 0x4e;
  fabricated[3] = 0x47;
  fabricated.writeUInt32BE(1200, 16);
  fabricated.writeUInt32BE(630, 20);
  assert.equal(imageSize(fabricated), null);
});

test("imageSize rejects a complete PNG signature whose first chunk is not IHDR", () => {
  const buf = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf);
  buf.write("IDAT", 12, "latin1"); // right signature, wrong first chunk type
  buf.writeUInt32BE(1200, 16);
  buf.writeUInt32BE(630, 20);
  assert.equal(imageSize(buf), null);
});

test("imageSize rejects an IHDR chunk whose declared payload length is not 13", () => {
  const buf = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf);
  buf.write("IHDR", 12, "latin1");
  buf.writeUInt32BE(999, 8); // IHDR data is always exactly 13 bytes per spec
  buf.writeUInt32BE(1200, 16);
  buf.writeUInt32BE(630, 20);
  assert.equal(imageSize(buf), null);
});

test("imageSize rejects PNGs truncated before the IHDR dimension fields", () => {
  const full = makePng(1200, 630);
  assert.equal(imageSize(full.subarray(0, 23)), null); // dims end at byte 24
  assert.equal(imageSize(full.subarray(0, 8)), null); // bare signature
});

test("imageSize reads a minimal SOI+SOF0 JPEG frame header (positive control)", () => {
  assert.deepEqual(imageSize(makeJpeg(1200, 630)), { width: 1200, height: 630, format: "jpeg" });
});

test("imageSize returns null for SOI-only and SOI+EOI bytes", () => {
  assert.equal(imageSize(Buffer.from([0xff, 0xd8])), null);
  assert.equal(imageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), null);
});

test("imageSize rejects a JPEG truncated inside its dimension fields", () => {
  const full = makeJpeg(1200, 630);
  // Cut between the height and width fields of the frame header.
  assert.equal(imageSize(full.subarray(0, 9)), null);
});

test("imageSize rejects SOFn segments declaring less than the spec-minimum length", () => {
  // A real encoder never writes Lf < 11; accepting it would read dimensions
  // out of a malformed frame header.
  assert.equal(imageSize(makeJpeg(1200, 630, { sofLen: 8 })), null);
});

test("imageSize collapses ff fill bytes before a marker instead of skipping past it", () => {
  const padded = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xff]), // SOI then a fill run…
    makeJpeg(1200, 630).subarray(2), // …then the same SOF0 frame header
  ]);
  assert.deepEqual(imageSize(padded), { width: 1200, height: 630, format: "jpeg" });
});

test("imageSize stops at SOS rather than walking entropy-coded data for markers", () => {
  // After SOS the stream is entropy data; an FF C1 pair in there is not a
  // frame header and its "dimensions" must never be reported.
  const afterSosJunk = Buffer.from([
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x3f, 0x00, // SOS segment
    0x12, 0x34, 0xff, 0xc1, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, // junk that mimics SOF1
  ]);
  assert.equal(imageSize(Buffer.concat([Buffer.from([0xff, 0xd8]), afterSosJunk])), null);
});

test("imageSize returns null when a segment length runs past end of file", () => {
  assert.equal(imageSize(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff])), null);
});

// ---------------------------------------------------------------------------
// negative controls — inputs to the whole run

test("mutation: no built output fails the build/output contract", () => {
  const fx = makeFixture(test);
  const { failures, stats } = runSiteChecks({
    siteDir: join(fx.root, "site-not-built"),
    postsDir: fx.postsDir,
    siteUrl: SITE_URL,
    expectedRevision: FIXTURE_SHA,
  });
  assert.equal(stats.pages, 0);
  assert.equal(failures.length, 1, JSON.stringify(failures));
  assert.equal(failures[0].check, "build");
  assert.match(failures[0].message, /contract build\/output/);
  assert.match(failures[0].message, /production build first/);
});

// ---------------------------------------------------------------------------
// read-only proof — observes contents, stats, inodes AND directories

/**
 * Full-tree observation used for the read-only proof. Records every file's
 * bytes (sha256), size, inode identity (dev/ino), mode and timestamps, plus
 * every directory itself — so same-bytes rewrites and added empty directories
 * cannot slip through. Sorted by path for stable comparison.
 */
function snapshot(rootDir) {
  const out = [];
  const visit = (rel) => {
    const entries = readdirSync(join(rootDir, rel), { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      const st = statSync(join(rootDir, childRel));
      if (entry.isDirectory()) {
        out.push({ kind: "dir", path: childRel, dev: st.dev, ino: st.ino, mode: st.mode, mtimeMs: st.mtimeMs });
        visit(childRel);
      } else if (entry.isFile()) {
        out.push({
          kind: "file",
          path: childRel,
          sha256: createHash("sha256").update(readFileSync(join(rootDir, childRel))).digest("hex"),
          dev: st.dev,
          ino: st.ino,
          size: st.size,
          mode: st.mode,
          mtimeMs: st.mtimeMs,
          ctimeMs: st.ctimeMs,
        });
      }
    }
  };
  visit("");
  return out;
}

/** Field-level differences between two snapshots, for asserting WHY. */
function snapshotDiffs(before, after) {
  const diffs = [];
  const beforeByPath = new Map(before.map((e) => [e.path, e]));
  const afterPaths = new Set(after.map((e) => e.path));
  for (const e of after) {
    const b = beforeByPath.get(e.path);
    if (!b) {
      diffs.push({ path: e.path, field: "(added)", kind: e.kind });
      continue;
    }
    for (const k of Object.keys(e)) {
      if (b[k] !== e[k]) diffs.push({ path: e.path, field: k, from: b[k], to: e[k] });
    }
  }
  for (const e of before) {
    if (!afterPaths.has(e.path)) diffs.push({ path: e.path, field: "(removed)", kind: e.kind });
  }
  return diffs;
}

/** The pre-strengthening view: files only, size+mtime+mode, no bytes/inodes. */
const legacyView = (snap) =>
  snap
    .filter((e) => e.kind === "file")
    .map(({ path, size, mtimeMs, mode }) => ({ path, size, mtimeMs, mode }));

test("checker leaves the scanned tree unchanged: contents, stats, inodes and directories (read-only proof)", () => {
  const fx = makeFixture(test);
  const beforeSite = snapshot(fx.siteDir);
  const beforePosts = snapshot(fx.postsDir);
  assert.ok(beforeSite.filter((e) => e.kind === "file").length >= 6, "snapshot should cover the fixture files");
  assert.ok(beforeSite.filter((e) => e.kind === "dir").length >= 5, "snapshot should cover directories too");

  runChecks(fx);
  runChecks(fx); // twice: a first-run lazy write would be caught by the second

  assert.deepEqual(snapshotDiffs(beforeSite, snapshot(fx.siteDir)), [], "site tree changed");
  assert.deepEqual(snapshotDiffs(beforePosts, snapshot(fx.postsDir)), [], "posts tree changed");
});

// The proof's teeth: each materially different sabotage must be caught, for
// the intended reason. These tests exercise the comparison itself, never the
// checker, and restore nothing afterwards — each uses its own fixture copy.

test("teeth: a same-bytes rewrite with restored mtime is caught by inode/timestamp fields the legacy view misses", async () => {
  const fx = makeFixture(test);
  await tick();
  const targetRel = "assets/img/og-card.png";
  const targetAbs = join(fx.siteDir, targetRel);
  const before = snapshot(fx.siteDir);
  const originalBytes = readFileSync(targetAbs);

  // Sabotage: rewrite identical bytes, then restore the old mtime so a
  // size+mtime check sees nothing at all.
  writeFileSync(targetAbs, originalBytes);
  const st = before.find((e) => e.path === targetRel);
  utimesSync(targetAbs, st.mtimeMs / 1000, st.mtimeMs / 1000);

  const after = snapshot(fx.siteDir);

  // The strengthened observation flags it…
  const diffs = snapshotDiffs(before, after);
  assert.ok(diffs.length >= 1, "same-bytes rewrite must be detected");
  assert.ok(
    diffs.some((d) => d.path === targetRel && (d.field === "ctimeMs" || d.field === "mtimeMs")),
    `expected timestamp evidence, got ${JSON.stringify(diffs)}`
  );
  // …while its bytes are provably identical, isolating the rewrite detection:
  assert.equal(after.find((e) => e.path === targetRel).sha256, st.sha256);

  // …and the legacy files-only/size+mtime view of the SAME sabotage is blind.
  assert.deepEqual(legacyView(before), legacyView(after), "legacy view unexpectedly saw the rewrite");
});

test("teeth: an added file changes the listing", async () => {
  const fx = makeFixture(test);
  await tick();
  const before = snapshot(fx.siteDir);
  writeFileSync(join(fx.siteDir, "extra.html"), "<p>sneaked in</p>");
  const diffs = snapshotDiffs(before, snapshot(fx.siteDir));
  assert.ok(diffs.some((d) => d.path === "extra.html" && d.field === "(added)"), JSON.stringify(diffs));
});

test("teeth: an added EMPTY directory changes the listing (invisible to files-only views)", async () => {
  const fx = makeFixture(test);
  await tick();
  const before = snapshot(fx.siteDir);
  mkdirSync(join(fx.siteDir, "empty-dir"));
  const after = snapshot(fx.siteDir);
  const diffs = snapshotDiffs(before, after);
  assert.ok(diffs.some((d) => d.path === "empty-dir" && d.field === "(added)" && d.kind === "dir"), JSON.stringify(diffs));
  // Prove the blindness claim about the weaker shape on the same sabotage:
  assert.equal(legacyView(before).length, legacyView(after).length);
});

test("teeth: a content rewrite is caught by the byte hash even when timestamps are restored", async () => {
  const fx = makeFixture(test);
  await tick();
  const targetRel = "index.html";
  const targetAbs = join(fx.siteDir, targetRel);
  const before = snapshot(fx.siteDir);
  const st = before.find((e) => e.path === targetRel);

  writeFileSync(targetAbs, readFileSync(targetAbs, "utf8").replace("Fixture", "Tampered"));
  utimesSync(targetAbs, st.mtimeMs / 1000, st.mtimeMs / 1000);

  const diffs = snapshotDiffs(before, snapshot(fx.siteDir));
  assert.ok(
    diffs.some((d) => d.path === targetRel && (d.field === "sha256" || d.field === "size")),
    `expected byte-level evidence, got ${JSON.stringify(diffs)}`
  );
});

// ---------------------------------------------------------------------------
// CLI behaviour

test("CLI exits 0 and summarises counts on a valid tree", () => {
  const fx = makeFixture(test);
  const r = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--site-dir",
      fx.siteDir,
      "--posts-dir",
      fx.postsDir,
      "--site-url",
      SITE_URL,
      "--revision",
      FIXTURE_SHA,
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /3 HTML pages/);
  assert.match(r.stdout, /3 sitemap URLs/);
  assert.match(r.stdout, new RegExp(`revision artifact matches build ${FIXTURE_SHA}`));
});

test("CLI exits 1 and names the violated contract on stdout/stderr diagnostics", () => {
  const fx = makeFixture(test);
  const p = join(fx.siteDir, "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace("<h1>Home</h1>", ""));
  const r = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--site-dir",
      fx.siteDir,
      "--posts-dir",
      fx.postsDir,
      "--site-url",
      SITE_URL,
      "--revision",
      FIXTURE_SHA,
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1);
  const output = `${r.stderr}${r.stdout}`;
  assert.match(output, /\[headings\]/);
  assert.match(output, /FAILED/);
});

test("CLI exits 1 naming the stale revision when the artifact lags the build", () => {
  const fx = makeFixture(test);
  writeFileSync(join(fx.siteDir, "revision.txt"), `${"cd".repeat(20)}\n`);
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--site-dir", fx.siteDir, "--posts-dir", fx.postsDir, "--revision", FIXTURE_SHA],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1);
  const output = `${r.stderr}${r.stdout}`;
  assert.match(output, /\[revision-artifact\]/);
  assert.match(output, /stale/);
});

test("CLI rejects a malformed --revision before checking anything", () => {
  const fx = makeFixture(test);
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--site-dir", fx.siteDir, "--posts-dir", fx.postsDir, "--revision", "deadbeef"],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not exactly 40 lowercase hex characters/);
});
