import { SoftwareApplication, WithContext, AggregateRating } from 'schema-dts';

export function SoftwareApplicationSchema() {
  const schema: WithContext<SoftwareApplication> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TaxFormatter',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    description: 'Fix broken crypto CSV files in 30 seconds. Export to any tax platform. No manual editing required. Perfect for TurboTax, Koinly, CoinLedger & ZenLedger.',
    url: 'https://taxformatter.com',
    screenshot: 'https://taxformatter.com/og-image.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free audit, paid plans for full features',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '100',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI-powered CSV validation and repair',
      'Support for 18+ crypto exchanges',
      'Export to multiple tax platforms',
      'End-to-end encryption',
      'Automatic error detection and fixing',
      'Wash sale detection',
      'Data deleted after 24 hours',
    ],
    creator: {
      '@type': 'Organization',
      name: 'TaxFormatter',
    },
    datePublished: '2024-01-01',
    softwareVersion: '2.4',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
