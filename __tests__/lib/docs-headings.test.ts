/**
 * Docs "On this page" anchors.
 *
 * Regression guard for the dead-TOC bug: TableOfContents built `#slug` links
 * from the raw markdown, but the MDX renderer never put an `id` on any
 * heading, so all 13-37 links on every docs page pointed at nothing. The
 * fix routes both sides through lib/docs-headings.ts; these tests pin that
 * the two sides agree, including the awkward cases (inline code,
 * underscores, duplicate headings), and that the real content has no
 * heading the slugger cannot address.
 */
import { createElement } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { allDocs } from '@/lib/content/docs';
import { createHeadingSlugger, getDocHeadings, getNodeText, slugifyHeading } from '@/lib/docs-headings';
import { createMdxHeadings } from '@/components/docs/MdxHeading';

describe('slugifyHeading', () => {
  it.each([
    ['Parse a File', 'parse-a-file'],
    ['MCP Server (AI Agents)', 'mcp-server-ai-agents'],
    ['GET `/v1/sources`', 'get-v1-sources'],
    ['**Rate Limits** and _Quotas_', 'rate-limits-and-quotas'],
    ['output_format', 'outputformat'],
    ["What's the cheapest plan?", 'what-s-the-cheapest-plan'],
  ])('%s -> %s', (text, expected) => {
    expect(slugifyHeading(text)).toBe(expected);
  });
});

describe('createHeadingSlugger', () => {
  it('numbers repeated headings so each stays addressable', () => {
    const slug = createHeadingSlugger();
    expect(slug('Request')).toBe('request');
    expect(slug('Response')).toBe('response');
    expect(slug('Request')).toBe('request-2');
    expect(slug('Request')).toBe('request-3');
  });
});

describe('getDocHeadings', () => {
  it('lists h2/h3 only, with level and cleaned text', () => {
    const md = [
      '# Title (not in TOC)',
      '## Base URL',
      'text',
      '### GET `/v1/sources`',
      '#### Too deep',
      '## Base URL',
    ].join('\n');

    expect(getDocHeadings(md)).toEqual([
      { id: 'base-url', text: 'Base URL', level: 2 },
      { id: 'get-v1-sources', text: 'GET /v1/sources', level: 3 },
      { id: 'base-url-2', text: 'Base URL', level: 2 },
    ]);
  });
});

describe('rendered heading ids match the TOC', () => {
  it('gives the rendered h2 the same id the TOC links to, and clears the sticky header', () => {
    const { h2 } = createMdxHeadings();
    // MDX hands inline code to the component as an element, not as backticks.
    const { container } = render(createElement(h2, null, 'GET ', createElement('code', null, '/v1/sources')));
    const el = container.querySelector('h2');
    expect(el).toHaveAttribute('id', getDocHeadings('## GET `/v1/sources`')[0]?.id);
    expect(el).toHaveClass('scroll-mt-24');
  });

  it('de-duplicates in render order exactly like the TOC', () => {
    const { h3 } = createMdxHeadings();
    const { container } = render(
      createElement('div', null, createElement(h3, null, 'Request'), createElement(h3, null, 'Request')),
    );
    const ids = Array.from(container.querySelectorAll('h3')).map((el) => el.id);
    const toc = getDocHeadings('### Request\n### Request').map((h) => h.id);
    expect(ids).toEqual(toc);
    expect(ids).toEqual(['request', 'request-2']);
  });

  it('flattens nested inline elements to text', () => {
    const node = ['Rate ', createElement('strong', { key: 's' }, 'Limits'), ' and ', createElement('em', { key: 'e' }, 'Quotas')];
    expect(getNodeText(node)).toBe('Rate Limits and Quotas');
  });
});

describe('every docs page', () => {
  it.each(allDocs.map((d) => [d.url, d.body.raw] as const))(
    '%s has a non-empty, unique id for every TOC entry',
    (_url, raw) => {
      const headings = getDocHeadings(raw);
      const ids = headings.map((h) => h.id);
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );
});
