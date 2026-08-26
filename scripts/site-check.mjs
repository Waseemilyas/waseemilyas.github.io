#!/usr/bin/env node
// Rendered-site contract checks for the Eleventy build in `_site/`.
//
// Dependency-free (Node built-ins only). Encodes the site's published
// invariants so regressions fail loudly instead of silently:
//
//   headings   exactly one <h1> per page, no skipped heading levels
//   metadata   description, canonical, og:title/description/url/type/image
//              and og:image dimensions present exactly once per page
//   jsonld     every application/ld+json block parses with an @context
//   links      root-relative and relative href/src targets resolve to
//              built files (dir-style URLs resolve to index.html)
//   sitemap-parity  sitemap URLs ↔ built pages, both directions
//              (/404.html deliberately absent from the sitemap)
//   xml        sitemap.xml + notes/feed.xml pass structural checks — exactly
//              one root element with nothing after it closes, balanced
//              case-matched tags, every attribute a whitespace-separated
//              quoted name="value" pair, no bare '&' in text or in quoted
//              attribute values — and declare the expected roots/namespaces
//              (urlset @ sitemaps.org, feed @ Atom). This is NOT full XML
//              well-formedness; see validateXml for the exact scope.
//   draft-exclusion  posts marked `draft: true` produce no built page,
//              directory, sitemap entry or feed entry
//   og-image   the referenced OG image carries a readable PNG/JPEG dimension
//              header reporting exactly 1200x630, matching its own declared
//              og:image:width/height. Headers only — pixels are not decoded.
//   revision-artifact  /revision.txt exists and its bytes are EXACTLY the
//              expected build revision (full 40-char SHA) followed by one
//              newline. Missing, malformed or stale artifacts are violations,
//              so a built tree can never be ambiguous about what was built.
//
// Read-only: this module never writes, deletes or touches the tree it scans.
//
// Usage: node scripts/site-check.mjs [--site-dir _site]
//        [--posts-dir src/notes/posts] [--site-url https://waseemilyas.uk]
//        [--revision <40-char sha>]
//        (--revision defaults to the same resolution as the build:
//         SITE_REVISION > GITHUB_SHA > git rev-parse HEAD)
// Exits 0 when every contract holds; exits 1 listing every violation with
// its file and contract id.

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { assertRevision, REVISION_RE, resolveRevision } from "./revision.mjs";

export const REQUIRED_OG_SIZE = { width: 1200, height: 630 };

/** Where the build publishes the machine-readable revision artifact. */
export const REVISION_ARTIFACT_PATH = "revision.txt";

// ---------------------------------------------------------------------------
// small parsing helpers

/** Recursively list every file under `root` as POSIX-style relative paths. */
export function walkFiles(root) {
  const out = [];
  const visit = (rel) => {
    const abs = rel === "" ? root : join(root, rel);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) visit(childRel);
      else if (entry.isFile()) out.push(childRel);
    }
  };
  visit("");
  return out.sort();
}

const isFile = (p) => existsSync(p) && statSync(p).isFile();

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Remove every accepted reference (&amp;/&lt;/…/&#…;/&#x…) so any leftover
 *  '&' marks a bare ampersand. Applied to text and attribute values alike. */
const stripReferences = (s) =>
  s.replace(/&(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/g, "");

/** Parse attributes of every `<tag ...>` occurrence into plain objects. */
export function extractTagAttrs(html, tag) {
  const out = [];
  for (const m of html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))) {
    const attrs = {};
    for (const a of m[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = decodeEntities(a[2] ?? a[3]);
    }
    out.push(attrs);
  }
  return out;
}

/** Built-file path → public URL path ("dir/index.html" → "/dir/"). */
export function urlPathFromFile(relPath) {
  if (relPath === "index.html") return "/";
  if (relPath.endsWith("/index.html")) return `/${relPath.slice(0, -"/index.html".length)}/`;
  return `/${relPath}`;
}

/** Strip origin from an absolute URL produced from `siteUrl`. */
export function pathFromAbsolute(url, siteUrl) {
  return url.startsWith(`${siteUrl}/`) || url === siteUrl
    ? url.slice(siteUrl.length) || "/"
    : null;
}

/**
 * Resolve a link/src target to a site-root-relative POSIX path.
 * Returns null for anything not locally resolvable (external, fragment…).
 */
export function resolveLocalTarget(fromPageRel, target) {
  let t = target.trim();
  if (
    t === "" ||
    t.startsWith("#") ||
    /^(https?:|mailto:|tel:|javascript:|data:|blob:)/i.test(t) ||
    t.startsWith("//")
  ) {
    return null;
  }
  t = decodeEntities(t.split("#")[0].split("?")[0]);
  if (t === "") return null;
  const dirStyle = t.endsWith("/");
  let abs = t.startsWith("/")
    ? posix.normalize(t.slice(1))
    : posix.normalize(posix.join(posix.dirname(fromPageRel), t));
  if (abs === "." ) abs = "";
  if (dirStyle && abs !== "" && !abs.endsWith("/")) abs += "/";
  if (abs === "/") abs = "";
  return abs;
}

/** Does a root-relative path resolve to something in the built tree? */
export function localTargetExists(siteDir, absPath) {
  const clean = absPath === "" ? "" : posix.normalize(absPath);
  if (clean === ".." || clean.startsWith("../")) return false; // escapes built root
  if (clean === "" || clean.endsWith("/")) {
    return isFile(join(siteDir, clean, "index.html"));
  }
  return isFile(join(siteDir, clean)) || isFile(join(siteDir, clean, "index.html"));
}

// ---------------------------------------------------------------------------
// per-page contracts

export function extractHeadings(html) {
  return [...html.matchAll(/<h([1-6])(?=[\s>])/gi)].map((m) => Number(m[1]));
}

export function checkHeadings(page, html) {
  const failures = [];
  const levels = extractHeadings(html);
  const h1count = levels.filter((l) => l === 1).length;
  if (h1count !== 1) {
    failures.push({
      check: "headings",
      file: page,
      message:
        h1count === 0
          ? "contract headings/one-h1: document has no <h1>"
          : `contract headings/one-h1: document has ${h1count} <h1> elements`,
    });
  }
  let prev = 1; // document outline root; first heading may sit at h1/h2
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (level > prev + 1) {
      failures.push({
        check: "headings",
        file: page,
        message: `contract headings/no-skipped-levels: heading ${i + 1} jumps h${prev}→h${level}`,
      });
    }
    prev = level;
  }
  return failures;
}

export function checkMetadata(page, html, siteUrl) {
  const failures = [];
  const expectOnce = (label, cond, detail) => {
    if (!cond) {
      failures.push({ check: "metadata", file: page, message: `contract metadata/${label}: ${detail}` });
    }
  };

  const descriptions = extractTagAttrs(html, "meta").filter((a) => a.name === "description");
  expectOnce(
    "description",
    descriptions.length === 1 && descriptions[0].content?.trim(),
    `expected exactly one non-empty meta[name=description], found ${descriptions.length}`
  );

  const canonicals = extractTagAttrs(html, "link").filter((a) => a.rel?.toLowerCase() === "canonical");
  const expectedCanonical = siteUrl + urlPathFromFile(page);
  expectOnce(
    "canonical",
    canonicals.length === 1 &&
      /^https?:\/\//i.test(canonicals[0].href ?? "") &&
      canonicals[0].href === expectedCanonical,
    `expected exactly one canonical link to ${expectedCanonical}, found ${
      canonicals.map((c) => c.href ?? "(none)").join(", ") || "none"
    }`
  );

  const metas = extractTagAttrs(html, "meta");
  const og = (prop) => metas.filter((a) => (a.property ?? "").toLowerCase() === prop);
  for (const prop of [
    "og:title",
    "og:description",
    "og:url",
    "og:type",
    "og:image",
    "og:image:width",
    "og:image:height",
  ]) {
    const hits = og(prop);
    expectOnce(
      prop,
      hits.length === 1 && hits[0].content?.trim(),
      `expected exactly one meta[property=${prop}] with content, found ${hits.length}`
    );
  }

  const ogUrl = og("og:url")[0]?.content;
  if (ogUrl && ogUrl !== canonicals[0]?.href) {
    failures.push({
      check: "metadata",
      file: page,
      message: `contract metadata/og-url-matches-canonical: og:url ${ogUrl} != canonical ${canonicals[0]?.href}`,
    });
  }
  return failures;
}

export function extractJsonLd(html) {
  return [...html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]);
}

export function checkJsonLd(page, html) {
  const failures = [];
  const blocks = extractJsonLd(html);
  if (blocks.length === 0) {
    failures.push({
      check: "jsonld",
      file: page,
      message: "contract jsonld/present: no application/ld+json block found",
    });
    return failures;
  }
  blocks.forEach((block, i) => {
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (err) {
      failures.push({
        check: "jsonld",
        file: page,
        message: `contract jsonld/valid: block ${i + 1} is not valid JSON (${err.message})`,
      });
      return;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    if (!nodes.every((n) => n && typeof n === "object" && "@context" in n)) {
      failures.push({
        check: "jsonld",
        file: page,
        message: `contract jsonld/context: block ${i + 1} is missing @context`,
      });
    }
  });
  return failures;
}

export function collectLocalTargets(pageRel, html) {
  const targets = [];
  for (const m of html.matchAll(/(?<![\w:-])(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const resolved = resolveLocalTarget(pageRel, m[2] ?? m[3]);
    if (resolved !== null) targets.push(resolved);
  }
  return targets;
}

export function checkLinks(page, html, siteDir) {
  const failures = [];
  const seen = new Set();
  for (const target of collectLocalTargets(page, html)) {
    if (seen.has(target)) continue;
    seen.add(target);
    if (!localTargetExists(siteDir, target)) {
      failures.push({
        check: "links",
        file: page,
        message: `contract links/resolve: target "${target}" has no matching built file`,
      });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// XML: structural checks + declared roots (not a complete XML parser)

/**
 * Structural validation of machine-generated XML (sitemap/Atom). Checks:
 *   - exactly one root element; nothing but comments, processing
 *     instructions and whitespace may follow it;
 *   - balanced, case-sensitive open/close tags with valid element names
 *     (letter/`_`/`:` first, then name characters);
 *   - every attribute is a quoted `name="value"` or `name='value'` pair,
 *     separated from the tag name and from each other by whitespace —
 *     an attribute glued to the previous one (xmlns="x"a="1"), unquoted
 *     values, bare tokens or other junk in the tag are rejected;
 *   - neither text nor quoted attribute values may contain a bare `&`:
 *     only &amp; &lt; &gt; &quot; &apos; and numeric character references
 *     (&#…; / &#x…;) are accepted in either place.
 *
 * Deliberately NOT checked (this is not a complete XML parser): namespace
 * correctness beyond reading the root xmlns string, duplicate attributes,
 * entity validity beyond the predefined/numeric forms above, `--` inside
 * comments, DOCTYPE internal subsets, processing-instruction targets,
 * character validity of text. Do not claim general well-formedness from
 * this function alone.
 * Returns { ok, rootName, xmlns, errors }.
 */
export function validateXml(xml) {
  const errors = [];
  const NAME_RE = /^[A-Za-z_:][A-Za-z0-9._:-]*$/;
  let i = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  const stack = [];
  let rootName = null;
  let rootOpenTag = null;
  let afterRoot = false; // the single root element has closed
  const len = xml.length;

  let stopped = false; // set when a fatal error ends scanning early
  while (i < len) {
    if (xml.startsWith("<!--", i)) {
      const end = xml.indexOf("-->", i + 4);
      if (end < 0) { errors.push(`unterminated comment at offset ${i}`); stopped = true; break; }
      i = end + 3;
    } else if (xml.startsWith("<![CDATA[", i)) {
      if (afterRoot) { errors.push(`content after the root element at offset ${i}`); stopped = true; break; }
      const end = xml.indexOf("]]>", i + 9);
      if (end < 0) { errors.push(`unterminated CDATA at offset ${i}`); stopped = true; break; }
      i = end + 3;
    } else if (xml.startsWith("<?", i)) {
      const end = xml.indexOf("?>", i + 2);
      if (end < 0) { errors.push(`unterminated processing instruction at offset ${i}`); stopped = true; break; }
      i = end + 2;
    } else if (xml.startsWith("<!", i)) {
      if (afterRoot) { errors.push(`declaration after the root element at offset ${i}`); stopped = true; break; }
      const end = xml.indexOf(">", i + 2);
      if (end < 0) { errors.push(`unterminated declaration at offset ${i}`); stopped = true; break; }
      i = end + 1;
    } else if (xml[i] === "<") {
      if (afterRoot) {
        const peek = xml.slice(i + 1).match(/^\s*([^\s/>]+)/);
        errors.push(
          `second root element <${peek ? peek[1] : "?"}> at offset ${i} — exactly one root element is allowed`
        );
        stopped = true;
        break;
      }
      let j = i + 1;
      let quote = null;
      while (j < len) {
        const c = xml[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
        j++;
      }
      if (j >= len) { errors.push(`unterminated tag at offset ${i}`); stopped = true; break; }
      const tagBody = xml.slice(i + 1, j);
      i = j + 1;

      if (tagBody.startsWith("/")) {
        const name = tagBody.slice(1).trim();
        const top = stack.pop();
        const matched = top !== undefined && top === name;
        if (!top) errors.push(`closing </${name}> at offset ${i} has no matching opener`);
        else if (!matched) errors.push(`<${top}> closed by mismatched </${name}> at offset ${i}`);
        if (matched && stack.length === 0) afterRoot = true;
      } else {
        const selfClosing = tagBody.endsWith("/");
        const inner = selfClosing ? tagBody.slice(0, -1) : tagBody;
        const nameMatch = inner.match(/^([^\s/>]+)/);
        if (!nameMatch) { errors.push(`tag without a name at offset ${i}`); continue; }
        const name = nameMatch[1];
        if (!NAME_RE.test(name)) {
          errors.push(`invalid element name "${name}" at offset ${i}`);
          continue;
        }
        if (!rootName) { rootName = name; rootOpenTag = inner; }
        if (!selfClosing) stack.push(name);

        // Strict attribute region: everything after the name must parse as
        // whitespace-separated quoted name="value" pairs. Each attribute
        // must be preceded by whitespace, so glued pairs (xmlns="x"a="1")
        // are rejected; values may contain references but no bare '&'.
        let rest = inner.slice(name.length);
        let seenAttr = false;
        for (;;) {
          const leadWs = rest.match(/^\s+/);
          if (!leadWs) {
            if (rest === "") break;
            const looksLikeAttr = /^[\w:.-]+\s*=/.test(rest);
            errors.push(
              looksLikeAttr && seenAttr
                ? `missing whitespace between attributes in <${name}> near ${JSON.stringify(rest.slice(0, 24))} at offset ${i}`
                : `malformed attribute syntax in <${name}> near ${JSON.stringify(rest.slice(0, 24))} at offset ${i}`
            );
            break;
          }
          rest = rest.slice(leadWs[0].length);
          if (rest === "") break;
          const m = rest.match(/^([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/);
          if (!m) {
            errors.push(
              `malformed attribute syntax in <${name}> near ${JSON.stringify(rest.slice(0, 24))} at offset ${i}`
            );
            break;
          }
          seenAttr = true;
          const value = m[2] ?? m[3];
          const ampAt = stripReferences(value).indexOf("&");
          if (ampAt >= 0) {
            errors.push(
              `bare "&" in the value of ${m[1]} must be written as &amp; at offset ${i}`
            );
            break;
          }
          rest = rest.slice(m[0].length);
        }

        if (selfClosing && stack.length === 0) afterRoot = true;
      }
    } else {
      const next = xml.indexOf("<", i);
      const textEnd = next < 0 ? len : next;
      const text = xml.slice(i, textEnd);
      if (rootName === null && text.trim() !== "") {
        errors.push(`text before the root element at offset ${i}`);
        stopped = true;
        break;
      }
      if (rootName !== null && stack.length === 0 && text.trim() !== "") {
        errors.push(`text after the root element closed at offset ${i}`);
        stopped = true;
        break;
      }
      // Every '&' must begin a predefined or numeric character reference.
      const amp = stripReferences(text).indexOf("&");
      if (amp >= 0) {
        const named = text.slice(amp).match(/^&([A-Za-z][A-Za-z0-9]*);/);
        errors.push(
          named
            ? `unknown entity &${named[1]}; at offset ${i + amp}`
            : `bare "&" in text must be written as &amp; at offset ${i + amp}`
        );
        stopped = true;
        break;
      }
      i = textEnd;
    }
  }
  if (!stopped && stack.length) errors.push(`unclosed element(s): <${stack.join(">, <")}>`);
  if (rootName === null && errors.length === 0) {
    errors.push("no root element found");
  }

  let xmlns = null;
  if (rootOpenTag) {
    const m = rootOpenTag.match(/xmlns\s*=\s*("([^"]*)"|'([^']*)')/);
    if (m) xmlns = m[2] ?? m[3];
  }
  return { ok: errors.length === 0, rootName, xmlns, errors };
}

// ---------------------------------------------------------------------------
// sitemap parity + feeds + drafts

export function extractSitemapLocs(sitemapXml) {
  return [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decodeEntities(m[1]));
}

/**
 * URLs an Atom feed actually REFERENCES: every <link href> and every <id>
 * element's text. This is the set the draft-exclusion contract compares
 * against — exact parsed URLs, never a raw substring scan of the XML, so a
 * draft slug "post" cannot false-positive against a published "post-one"
 * route or against prose that merely mentions the word.
 */
export function extractFeedUrls(feedXml) {
  const urls = extractTagAttrs(feedXml, "link")
    .map((a) => a.href)
    .filter((h) => typeof h === "string" && h !== "");
  for (const m of feedXml.matchAll(/<id>([^<]*)<\/id>/g)) {
    urls.push(decodeEntities(m[1]));
  }
  return urls;
}

export function findDraftSlugs(postsDir) {
  if (!existsSync(postsDir)) return null;
  const drafts = [];
  for (const name of readdirSync(postsDir).sort()) {
    if (!name.endsWith(".md")) continue;
    const src = readFileSync(join(postsDir, name), "utf8");
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm && /^\s*draft:\s*true\s*$/m.test(fm[1])) {
      drafts.push(name.replace(/\.md$/, ""));
    }
  }
  return drafts;
}

// ---------------------------------------------------------------------------
// image dimension headers (PNG / JPEG) — signatures only, no pixel decoding

/**
 * Read width/height from image dimension headers ONLY.
 *
 * PNG: requires the complete 8-byte signature (89 50 4e 47 0d 0a 1a 0a) AND
 * a well-formed dimension-bearing first chunk — declared data length 13 (the
 * PNG-mandated IHDR payload size), literal "IHDR" at bytes 12–15, then the
 * big-endian width/height at bytes 16–23.
 *
 * JPEG: requires the SOI signature (ff d8), then walks segment markers:
 * runs of 0xff fill bytes collapse; length-less standalone markers
 * (TEM/RSTn/EOI…) advance by 2; on the first SOS marker scanning stops
 * (entropy-coded data follows, and a frame header always precedes it).
 * Dimensions are reported only for a true SOFn frame code whose declared
 * segment length is at least the spec minimum Lf = 8 + 3·Nf ≥ 11 and whose
 * precision/height/width fields are fully inside the buffer.
 *
 * This inspects signatures and header fields ONLY: it does not decode
 * pixels, verify CRCs or entropy data, or confirm that the file renders.
 * Returns { width, height, format } or null when no such header is present.
 */
export function imageSize(buffer) {
  // PNG: signature + IHDR chunk shape before reading any fixed offset.
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a &&
    buffer.readUInt32BE(8) === 13 &&
    buffer.toString("latin1", 12, 16) === "IHDR"
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
  }
  // JPEG: walk segment markers until an SOFn frame header.
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i + 1 < buffer.length) {
      if (buffer[i] !== 0xff) { i++; continue; }
      if (buffer[i + 1] === 0xff) { i++; continue; } // fill byte before a marker
      const marker = buffer[i + 1];
      // Standalone markers carry no length field: TEM and RSTn…EOI.
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        // Frame header fields end at i+8 (length, precision, height, width).
        if (i + 9 > buffer.length) return null; // header truncated mid-dimensions
        if (buffer.readUInt16BE(i + 2) < 11) return null; // Lf must be ≥ 11
        return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7), format: "jpeg" };
      }
      if (marker === 0xda) break; // SOS: entropy data follows, stop walking
      if (i + 4 > buffer.length) return null; // segment header truncated
      const segLen = buffer.readUInt16BE(i + 2);
      if (segLen < 2) return null;
      i += 2 + segLen;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// check runner

/**
 * Run every rendered-site contract over a built tree.
 * Pure reads only. Returns { failures, stats }.
 *
 * `expectedRevision` (exactly 40 lowercase hex chars) is REQUIRED: the
 * revision-artifact contract compares `_site/revision.txt` byte-for-byte
 * against it. The CLI resolves it from SITE_REVISION / GITHUB_SHA /
 * `git rev-parse HEAD` when --revision is not given.
 */
export function runSiteChecks({
  siteDir = "_site",
  postsDir = "src/notes/posts",
  siteUrl = "https://waseemilyas.uk",
  expectedRevision,
} = {}) {
  assertRevision(expectedRevision, "expectedRevision");
  const failures = [];

  if (!existsSync(join(siteDir, "index.html"))) {
    return {
      failures: [{
        check: "build",
        file: siteDir,
        message: "contract build/output: no built site found — run the production build first",
      }],
      stats: { pages: 0 },
    };
  }

  const pages = walkFiles(siteDir).filter((f) => f.toLowerCase().endsWith(".html"));

  // Revision artifact ---------------------------------------------------------
  failures.push(...checkRevisionArtifact(siteDir, expectedRevision));

  // Per-page contracts -------------------------------------------------------
  for (const page of pages) {
    const html = readFileSync(join(siteDir, page), "utf8");
    failures.push(...checkRevisionMeta(page, html, expectedRevision));
    failures.push(...checkHeadings(page, html));
    failures.push(...checkMetadata(page, html, siteUrl));
    failures.push(...checkJsonLd(page, html));
    failures.push(...checkLinks(page, html, siteDir));

    const ogImage = extractTagAttrs(html, "meta").find(
      (a) => (a.property ?? "").toLowerCase() === "og:image"
    );
    if (ogImage?.content) {
      failures.push(...checkOgImage(page, ogImage.content, html, { siteDir, siteUrl }));
    }
  }

  // XML contracts ------------------------------------------------------------
  const xmlExpectations = [
    { file: "sitemap.xml", root: "urlset", xmlnsHint: "sitemaps.org/schemas/sitemap", optional: false },
    { file: "notes/feed.xml", root: "feed", xmlnsHint: "www.w3.org/2005/Atom", optional: false },
  ];
  for (const { file, root, xmlnsHint } of xmlExpectations) {
    const abs = join(siteDir, file);
    if (!isFile(abs)) {
      failures.push({
        check: "xml",
        file,
        message: `contract xml/present: expected built ${file}`,
      });
      continue;
    }
    const parsed = validateXml(readFileSync(abs, "utf8"));
    if (!parsed.ok) {
      failures.push({
        check: "xml",
        file,
        message: `contract xml/structure: ${parsed.errors.join("; ")}`,
      });
      continue;
    }
    if (parsed.rootName !== root || !(parsed.xmlns ?? "").includes(xmlnsHint)) {
      failures.push({
        check: "xml",
        file,
        message: `contract xml/declared-root: root is <${parsed.rootName}${
          parsed.xmlns ? ` xmlns="${parsed.xmlns}"` : ""
        }>, expected <${root}> declaring ${xmlnsHint}`,
      });
    }
  }

  // Sitemap parity -----------------------------------------------------------
  let sitemapUrlCount = 0;
  const sitemapAbs = join(siteDir, "sitemap.xml");
  if (isFile(sitemapAbs)) {
    const locs = extractSitemapLocs(readFileSync(sitemapAbs, "utf8"));
    sitemapUrlCount = locs.length;
    const locPaths = [];
    for (const loc of locs) {
      const path = pathFromAbsolute(loc, siteUrl);
      if (path === null) {
        failures.push({
          check: "sitemap-parity",
          file: "sitemap.xml",
          message: `contract sitemap-parity/origin: <loc>${loc}</loc> is outside ${siteUrl}`,
        });
        continue;
      }
      locPaths.push(path);
      if (!localTargetExists(siteDir, path)) {
        failures.push({
          check: "sitemap-parity",
          file: "sitemap.xml",
          message: `contract sitemap-parity/built-target: sitemap URL ${loc} resolves to no built file`,
        });
      }
    }
    const exempt = new Set(["404.html"]);
    for (const page of pages) {
      if (exempt.has(page)) continue;
      const expected = urlPathFromFile(page);
      if (!locPaths.includes(expected)) {
        failures.push({
          check: "sitemap-parity",
          file: page,
          message: `contract sitemap-parity/listed: built page is absent from sitemap.xml (expected ${expected})`,
        });
      }
    }
  }

  // Draft exclusion ----------------------------------------------------------
  const drafts = findDraftSlugs(postsDir);
  if (drafts === null) {
    failures.push({
      check: "draft-exclusion",
      file: postsDir,
      message: `contract draft-exclusion/source: posts directory ${postsDir} not found`,
    });
  } else {
    // The contract compares EXACT parsed referenced routes, never raw
    // substrings of the XML: a draft slug "post" must not collide with a
    // published "post-one" URL, a longer route, or prose that contains the
    // word. Routes referenced by each document are extracted with the same
    // parsers used elsewhere in this checker (sitemap <loc>s; feed <link
    // href>s and <id>s) and reduced to site-root paths for comparison.
    const referencedPaths = (label) => {
      const abs = join(siteDir, label);
      if (!isFile(abs)) return null;
      const text = readFileSync(abs, "utf8");
      const urls =
        label === "sitemap.xml" ? extractSitemapLocs(text) : extractFeedUrls(text);
      return urls
        .map((u) => pathFromAbsolute(u, siteUrl) ?? u)
        .map((p) => (p.startsWith("/") ? p : null))
        .filter((p) => p !== null);
    };
    const referenced = [
      ["sitemap.xml", referencedPaths("sitemap.xml")],
      ["notes/feed.xml", referencedPaths("notes/feed.xml")],
    ];
    for (const slug of drafts) {
      const builtDir = join(siteDir, "notes", slug);
      if (existsSync(builtDir)) {
        failures.push({
          check: "draft-exclusion",
          file: `notes/${slug}/`,
          message: `contract draft-exclusion/built: draft post "${slug}" has a built directory/page`,
        });
      }
      const draftRoute = `/notes/${slug}/`;
      for (const [label, paths] of referenced) {
        if (paths !== null && paths.some((p) => p === draftRoute || p === draftRoute.slice(0, -1))) {
          failures.push({
            check: "draft-exclusion",
            file: label,
            message: `contract draft-exclusion/referenced: draft post route ${draftRoute} is referenced by ${label}`,
          });
        }
      }
    }
  }

  return {
    failures,
    stats: { pages: pages.length, sitemapUrls: sitemapUrlCount, revision: expectedRevision },
  };
}

/** Every rendered HTML document identifies the exact build that emitted it. */
export function checkRevisionMeta(page, html, expectedRevision) {
  const markers = extractTagAttrs(html, "meta").filter(
    (attrs) => (attrs.name ?? "").toLowerCase() === "waseemilyas-revision",
  );
  if (markers.length !== 1) {
    return [{
      check: "revision-meta",
      file: page,
      message: `contract revision-meta/one: found ${markers.length}, expected exactly one <meta name="waseemilyas-revision">`,
    }];
  }
  if (markers[0].content !== expectedRevision) {
    return [{
      check: "revision-meta",
      file: page,
      message: `contract revision-meta/exact: marker carries ${markers[0].content ?? "no content"}, but this build is ${expectedRevision}`,
    }];
  }
  return [];
}

/**
 * The build's machine-readable revision proof: /revision.txt must exist and
 * contain EXACTLY the expected 40-char SHA followed by one newline.
 * Classifies violations as missing, malformed (wrong shape: not a bare
 * full SHA + single newline) or stale (well-formed but a different
 * revision). Read-only.
 */
export function checkRevisionArtifact(siteDir, expectedRevision) {
  const failures = [];
  const abs = join(siteDir, REVISION_ARTIFACT_PATH);
  if (!isFile(abs)) {
    failures.push({
      check: "revision-artifact",
      file: REVISION_ARTIFACT_PATH,
      message: `contract revision-artifact/present: expected built ${REVISION_ARTIFACT_PATH} — the production build must emit it`,
    });
    return failures;
  }
  const raw = readFileSync(abs, "utf8");
  const expectedBytes = `${expectedRevision}\n`;
  if (raw === expectedBytes) return failures;

  const body = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  const preview = (s) =>
    JSON.stringify(s.length > 80 ? `${s.slice(0, 77)}…(${s.length} bytes)` : s);
  if (!REVISION_RE.test(body) || raw !== `${body}\n`) {
    failures.push({
      check: "revision-artifact",
      file: REVISION_ARTIFACT_PATH,
      message: `contract revision-artifact/malformed: content ${preview(raw)} is not exactly the revision followed by one newline`,
    });
    return failures;
  }
  failures.push({
    check: "revision-artifact",
    file: REVISION_ARTIFACT_PATH,
    message: `contract revision-artifact/stale: artifact carries ${body}, but this build is ${expectedRevision}`,
  });
  return failures;
}

function checkOgImage(page, imageUrl, html, { siteDir, siteUrl }) {
  const failures = [];
  const localPath = pathFromAbsolute(imageUrl, siteUrl) ?? imageUrl;
  if (!localPath.startsWith("/")) {
    failures.push({
      check: "og-image",
      file: page,
      message: `contract og-image/local: og:image "${imageUrl}" is neither ${siteUrl}-relative nor root-relative`,
    });
    return failures;
  }
  const abs = join(siteDir, localPath.slice(1));
  if (!isFile(abs)) {
    failures.push({
      check: "og-image",
      file: page,
      message: `contract og-image/exists: og:image target "${localPath}" has no built file`,
    });
    return failures;
  }
  const actual = imageSize(readFileSync(abs));
  if (!actual) {
    failures.push({
      check: "og-image",
      file: localPath,
      message:
        "contract og-image/header: file carries no readable PNG/JPEG dimension header (signature + IHDR or SOFn)",
    });
    return failures;
  }
  const metas = extractTagAttrs(html, "meta");
  const declaredW = Number(metas.find((a) => a.property === "og:image:width")?.content);
  const declaredH = Number(metas.find((a) => a.property === "og:image:height")?.content);

  const problems = [];
  if (!Number.isInteger(declaredW) || !Number.isInteger(declaredH)) {
    problems.push("declared og:image:width/height are missing or non-integer");
  } else if (actual.width !== declaredW || actual.height !== declaredH) {
    problems.push(`header reports ${actual.width}x${actual.height} != declared ${declaredW}x${declaredH}`);
  }
  if (actual.width !== REQUIRED_OG_SIZE.width || actual.height !== REQUIRED_OG_SIZE.height) {
    problems.push(`header reports ${actual.width}x${actual.height} != required ${REQUIRED_OG_SIZE.width}x${REQUIRED_OG_SIZE.height}`);
  }
  if (problems.length) {
    failures.push({
      check: "og-image",
      file: localPath,
      message: `contract og-image/dimensions: ${problems.join("; ")}`,
    });
  }
  return failures;
}

// ---------------------------------------------------------------------------
// CLI

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };

  // Expected revision: explicit --revision wins; otherwise resolve exactly as
  // the build does, so a developer's local check compares against what their
  // local build actually emitted.
  let expectedRevision;
  try {
    expectedRevision = flag("--revision")
      ? assertRevision(flag("--revision"), "--revision")
      : resolveRevision().revision;
  } catch (err) {
    console.error(`site-check: ${err.message}`);
    process.exit(1);
  }

  const { failures, stats } = runSiteChecks({
    siteDir: flag("--site-dir") ?? "_site",
    postsDir: flag("--posts-dir") ?? "src/notes/posts",
    siteUrl: flag("--site-url") ?? "https://waseemilyas.uk",
    expectedRevision,
  });

  if (failures.length) {
    console.error(`site-check: FAILED — ${failures.length} violation(s)\n`);
    for (const f of failures) {
      console.error(`  [${f.check}] ${f.file}: ${f.message}`);
    }
    process.exit(1);
  }
  console.log(
    `site-check: OK — ${stats.pages} HTML pages, ${stats.sitemapUrls} sitemap URLs; revision artifact matches build ${stats.revision}; headings, metadata, JSON-LD, links, feeds, drafts and og-image all pass their contracts`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
