import { WithContext } from 'schema-dts';

// schema-dts doesn't have WebAPI type, so we use a plain object
// WebAPI is a valid schema.org type: https://schema.org/WebAPI
interface WebAPISchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url: string;
  documentation: string;
  provider: {
    '@type': string;
    name: string;
    url: string;
  };
  termsOfService: string;
  offers: Array<{
    '@type': string;
    name: string;
    price: string;
    priceCurrency: string;
    description: string;
  }>;
}

export function WebAPISchemaComponent() {
  const schema: WebAPISchema = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'TaxFormatter API',
    description: 'REST API for parsing crypto exchange CSVs and bank statement PDFs into structured JSON. Auto-detects source format, normalizes dates and amounts, supports 14 exchanges and 13 banks.',
    url: 'https://api.taxformatter.com',
    documentation: 'https://www.taxformatter.com/docs/api',
    provider: {
      '@type': 'Organization',
      name: 'TaxFormatter',
      url: 'https://www.taxformatter.com',
    },
    termsOfService: 'https://www.taxformatter.com/terms',
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '29',
        priceCurrency: 'USD',
        description: '100 files/month, 30 requests/minute',
      },
      {
        '@type': 'Offer',
        name: 'Growth',
        price: '99',
        priceCurrency: 'USD',
        description: '500 files/month, 60 requests/minute',
      },
      {
        '@type': 'Offer',
        name: 'Business',
        price: '249',
        priceCurrency: 'USD',
        description: '2,000 files/month, 120 requests/minute',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
