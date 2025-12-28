// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import rehypeHighlight from "rehype-highlight";
var Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `**/*.md`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: false
    },
    published: {
      type: "boolean",
      default: true
    },
    order: {
      type: "number",
      default: 0
    }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (doc) => `/docs/${doc._raw.flattenedPath.replace(/\/index$/, "")}`
    },
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/").pop() || ""
    },
    section: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/")[0] || ""
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content/docs",
  documentTypes: [Doc],
  mdx: {
    rehypePlugins: [rehypeHighlight]
  }
});
export {
  Doc,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-GY5MVL6T.mjs.map
