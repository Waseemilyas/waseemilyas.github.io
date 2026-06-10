// Eleventy config for WI-PF1 — Waseem Ilyas portfolio.
// Source in src/, static output in _site/. No client framework; pure HTML/CSS/vanilla JS.
export default function (eleventyConfig) {
  // Static passthrough: assets, plus the root-level files GitHub Pages needs.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.addPassthroughCopy({ audio: "audio" });

  // Case studies collection (datasheet narratives in src/work/).
  eleventyConfig.addCollection("casestudies", (api) =>
    api.getFilteredByTag("casestudy").sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
  );

  // Notes collection — published (non-draft) posts only. Empty at launch by design.
  eleventyConfig.addCollection("notes", (api) =>
    api
      .getFilteredByTag("note")
      .filter((item) => !item.data.draft)
      .sort((a, b) => b.date - a.date)
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
