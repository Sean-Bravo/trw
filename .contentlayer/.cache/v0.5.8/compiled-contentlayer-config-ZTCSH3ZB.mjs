// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import rehypeHighlight from "rehype-highlight";
var Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `docs/**/*.{md,mdx}`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string"
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
      resolve: (doc) => `/${doc._raw.flattenedPath}`
    },
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/")
    },
    section: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/")[1]
    }
  }
}));
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `blog/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: true
    },
    date: {
      type: "date",
      required: true
    },
    author: {
      type: "string",
      default: "TaxFormatter Team"
    },
    category: {
      type: "enum",
      options: ["crypto-tax", "guides", "updates", "tax-tips", "crypto-news"],
      default: "guides"
    },
    tags: {
      type: "list",
      of: { type: "string" },
      default: []
    },
    image: {
      type: "string"
    },
    published: {
      type: "boolean",
      default: true
    },
    featured: {
      type: "boolean",
      default: false
    }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (post) => `/${post._raw.flattenedPath}`
    },
    slug: {
      type: "string",
      resolve: (post) => post._raw.flattenedPath.split("/").pop()
    },
    readingTime: {
      type: "number",
      resolve: (post) => {
        const wordsPerMinute = 200;
        const wordCount = post.body.raw.split(/\s+/g).length;
        return Math.ceil(wordCount / wordsPerMinute);
      }
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content",
  documentTypes: [Doc, Post],
  mdx: {
    rehypePlugins: [rehypeHighlight]
  }
});
export {
  Doc,
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-ZTCSH3ZB.mjs.map
