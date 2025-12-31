import { Organization, WebSite, WithContext } from 'schema-dts';

export function OrganizationSchema() {
  const schema: WithContext<Organization> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TaxFormatter',
    url: 'https://taxformatter.com',
    logo: 'https://taxformatter.com/logo-icon.svg',
    description: 'Cloud-based software that validates, cleans, and formats cryptocurrency transaction CSV files for compatibility with tax and accounting software.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/taxformatter',
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
    description: 'Fix broken crypto CSV files in 30 seconds. Export to any tax platform.',
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
