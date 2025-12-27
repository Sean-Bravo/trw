import { defineDocumentType, makeSource } from 'contentlayer2/source-files'
import rehypeHighlight from 'rehype-highlight'

export const Doc = defineDocumentType(() => ({
  name: 'Doc',
  filePathPattern: `**/*.md`,
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
      required: false,
    },
    published: {
      type: 'boolean',
      default: true,
    },
    order: {
      type: 'number',
      default: 0,
    },
  },
  computedFields: {
    url: {
      type: 'string',
      resolve: (doc) => `/docs/${doc._raw.flattenedPath}`,
    },
    slug: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.split('/').pop() || '',
    },
    section: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.split('/')[0] || '',
    },
  },
}))

export default makeSource({
  contentDirPath: './content/docs',
  documentTypes: [Doc],
  mdx: {
    rehypePlugins: [rehypeHighlight],
  },
})
