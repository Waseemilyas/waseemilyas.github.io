// Eleventy config for WI-PF1 — Waseem Ilyas portfolio.
// Source in src/, static output in _site/. No client framework; pure HTML/CSS/vanilla JS.
import { resolveRevision } from "./scripts/revision.mjs";

/**
 * Only the Eleventy boundary used here; page data comes from front matter.
 * @typedef {{data: {order?: number, draft?: boolean}, date: Date}} CollectionItem
 * @param {{
 * addGlobalData(name: string, value: string): void,
 * addPassthroughCopy(paths: Record<string, string>): void,
 * addCollection(name: string, collect: (api: {getFilteredByTag(tag: string): CollectionItem[]}) => CollectionItem[]): void,
 * addFilter(name: string, filter: (date: Date | string | number) => string): void
 * }} eleventyConfig
 */
export default function (eleventyConfig) {
  // Resolve the built revision up front: an invalid, missing or contradictory
  // revision input fails the build here rather than publishing ambiguity.
  // Precedence and validation live in scripts/revision.mjs.
  const { revision, source } = resolveRevision();
  console.log(`eleventy: building revision ${revision} (from ${source})`);
  eleventyConfig.addGlobalData("siteRevision", revision);

  // Static passthrough: assets, plus the root-level files GitHub Pages needs.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  // Prayer-time audio fetched over HTTP by Home Assistant; intentional, do not remove (see audio/README.md).
  eleventyConfig.addPassthroughCopy({ audio: "audio" });

  // Case studies collection (datasheet narratives in src/work/).
  eleventyConfig.addCollection("casestudies", (api) =>
    api.getFilteredByTag("casestudy").sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
  );

  // Notes collection — published (non-draft) posts, newest first.
  eleventyConfig.addCollection("notes", (api) =>
    api
      .getFilteredByTag("note")
      .filter((item) => !item.data.draft)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  );

  // Readable date filter for notes/feed.
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString());
  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
}
