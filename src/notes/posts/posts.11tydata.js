// Directory data for note posts. Every Markdown file here becomes a note at
// /notes/<slug>/. Drafts are never written to disk and never appear in the
// collection or feed, so a note in progress can sit here safely alongside the
// published ones.
export default {
  layout: "note.njk",
  tags: "note",
  draft: false,
  eleventyComputed: {
    permalink: (data) =>
      data.draft ? false : `/notes/${data.page.fileSlug}/`,
    eleventyExcludeFromCollections: (data) =>
      data.draft ? true : false,
    // A note's summary is its meta description unless one is set explicitly,
    // so no post has to repeat itself to get a real <meta name="description">.
    description: (data) => data.description || data.summary,
  },
};
