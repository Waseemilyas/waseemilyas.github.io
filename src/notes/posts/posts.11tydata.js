// Directory data for note posts. Every Markdown file here becomes a note at
// /notes/<slug>/. Drafts are never written to disk and never appear in the
// collection or feed, so launch ships zero published posts while the route,
// layout, and feed already exist.
export default {
  layout: "note.njk",
  tags: "note",
  draft: false,
  eleventyComputed: {
    permalink: (data) =>
      data.draft ? false : `/notes/${data.page.fileSlug}/`,
    eleventyExcludeFromCollections: (data) =>
      data.draft ? true : false,
  },
};
