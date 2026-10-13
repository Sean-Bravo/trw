import { MDXRemote } from 'next-mdx-remote-client/rsc';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { MDXComponents } from 'mdx/types';
import { createMdxHeadings } from '@/components/docs/MdxHeading';

interface MDXContentProps {
  source: string;
}

// Markdown tables have no intrinsic max width; without a scroll container a
// wide comparison table forces the whole post wider than a phone screen.
const baseComponents: MDXComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto">
      <table {...props}>{children}</table>
    </div>
  ),
};

export function MDXContent({ source }: MDXContentProps) {
  // Same heading ids as the docs, so in-post "#section" links resolve.
  const components: MDXComponents = { ...baseComponents, ...createMdxHeadings() };

  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeHighlight],
        },
      }}
    />
  );
}
