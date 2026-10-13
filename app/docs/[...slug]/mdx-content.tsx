import { MDXRemote } from 'next-mdx-remote-client/rsc';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { MDXComponents } from 'mdx/types';
import { CopyButton } from '@/components/docs/CopyButton';
import { createMdxHeadings } from '@/components/docs/MdxHeading';

interface MDXContentProps {
  source: string;
}

// Custom `pre` wrapper: attaches a copy button next to each code block.
// Intentionally preserves the children.props.children extraction the old
// contentlayer pipeline used — same shape goes into CopyButton either way.
const baseComponents: MDXComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ children, ...props }: any) => {
    const code = children?.props?.children || '';
    return (
      <div className="relative group">
        <pre {...props}>{children}</pre>
        <CopyButton code={code} />
      </div>
    );
  },
  // Markdown tables have no intrinsic max width; without a scroll container a
  // 6-column table forces the whole page wider than a phone screen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto">
      <table {...props}>{children}</table>
    </div>
  ),
};

export function MDXContent({ source }: MDXContentProps) {
  // Heading components are created per render so their slug de-duplication
  // is scoped to this document (see lib/docs-headings.ts).
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
