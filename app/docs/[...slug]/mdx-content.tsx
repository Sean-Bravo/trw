import { MDXRemote } from 'next-mdx-remote-client/rsc';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { MDXComponents } from 'mdx/types';
import { CopyButton } from '@/components/docs/CopyButton';

interface MDXContentProps {
  source: string;
}

// Custom `pre` wrapper: attaches a copy button next to each code block.
// Intentionally preserves the children.props.children extraction the old
// contentlayer pipeline used — same shape goes into CopyButton either way.
const components: MDXComponents = {
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
};

export function MDXContent({ source }: MDXContentProps) {
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
