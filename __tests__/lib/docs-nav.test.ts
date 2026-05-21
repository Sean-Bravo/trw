/**
 * Regression test for the /docs/faq 404.
 *
 * FAQ content lived at content/docs/faq/faq.md, which the loader maps to
 * /docs/faq/faq — but the docs home card and the breadcrumb both link to
 * /docs/faq (the section root, `/docs/<section>`), so that URL 404'd.
 *
 * These tests encode the invariant that every navigation target derivable
 * from DOCS_SECTIONS resolves to a real doc URL in allDocs:
 *   - each section landing `/docs/<slug>` (home card + breadcrumb), and
 *   - each sidebar page link (`page.href` override, else `/docs/<slug>/<page>`).
 */

import { allDocs } from '@/lib/content/docs';
import { DOCS_SECTIONS } from '@/lib/docs-config';

const docUrls = new Set(allDocs.map((d) => d.url));

describe('docs navigation targets resolve to real docs', () => {
  it('serves FAQ at /docs/faq, not the old /docs/faq/faq', () => {
    expect(docUrls.has('/docs/faq')).toBe(true);
    expect(docUrls.has('/docs/faq/faq')).toBe(false);
  });

  it.each(DOCS_SECTIONS.map((s) => [s.slug, `/docs/${s.slug}`] as const))(
    'section "%s" landing page %s exists (linked from docs home + breadcrumb)',
    (_slug, url) => {
      expect(docUrls.has(url)).toBe(true);
    },
  );

  const pageLinks = DOCS_SECTIONS.flatMap((section) =>
    section.pages.map(
      (page) =>
        [
          `${section.slug}/${page.slug}`,
          page.href ?? `/docs/${section.slug}/${page.slug}`,
        ] as const,
    ),
  );

  it.each(pageLinks)('sidebar link for "%s" (%s) points to a real doc', (_label, href) => {
    expect(docUrls.has(href)).toBe(true);
  });
});
