import { Organization, WebSite, WithContext } from 'schema-dts';

export function OrganizationSchema() {
  const schema: WithContext<Organization> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TaxFormatter',
    url: 'https://taxformatter.com',
    logo: 'https://taxformatter.com/logo-icon.svg',
    description: 'Developer API platform for parsing crypto exchange CSVs and bank statement PDFs into structured, tax-ready data. REST API, MCP server, and SDKs for Node.js and Python.',
    foundingDate: '2024',
    sameAs: [
      'https://www.npmjs.com/package/@taxformatter/mcp-server',
      'https://www.npmjs.com/package/@taxformatter/sdk',
      'https://pypi.org/project/taxformatter/',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@taxformatter.com',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema: WithContext<WebSite> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TaxFormatter',
    url: 'https://taxformatter.com',
    description: 'Parse any crypto exchange CSV or bank statement PDF via REST API. 14 exchanges, 13 banks, 4 tax formats. MCP server for AI agents.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://taxformatter.com/docs?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    } as any,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
