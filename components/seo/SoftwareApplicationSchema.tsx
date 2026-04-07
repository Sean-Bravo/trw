import { SoftwareApplication, WithContext } from 'schema-dts';

export function SoftwareApplicationSchema() {
  const schema: WithContext<SoftwareApplication> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TaxFormatter API',
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    description: 'Developer API for parsing crypto exchange CSVs and bank statement PDFs into structured JSON. Supports 14 exchanges, 13 banks, and 4 tax output formats. Includes MCP server for AI agents and SDKs for Node.js and Python.',
    url: 'https://taxformatter.com',
    screenshot: 'https://taxformatter.com/og-image.png',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Tier',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free uploads at taxformatter.com/upload — no signup required',
      },
      {
        '@type': 'Offer',
        name: 'Starter API',
        price: '29',
        priceCurrency: 'USD',
        description: '100 API calls/month, 30 RPM',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '29',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        } as any,
      },
      {
        '@type': 'Offer',
        name: 'Growth API',
        price: '99',
        priceCurrency: 'USD',
        description: '500 API calls/month, 60 RPM',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '99',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        } as any,
      },
      {
        '@type': 'Offer',
        name: 'Business API',
        price: '249',
        priceCurrency: 'USD',
        description: '2,000 API calls/month, 120 RPM',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '249',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        } as any,
      },
    ] as any,
    featureList: [
      '14 crypto exchange parsers (Coinbase, Binance, Kraken, Gemini, Robinhood, and more)',
      '13 bank statement PDF parsers (Chase, BofA, Wells Fargo, Citi, and more)',
      '4 tax output formats (Koinly, TurboTax, CoinLedger, ZenLedger)',
      'REST API with synchronous response (<2 seconds)',
      'MCP server for AI agents (Claude, Cursor, Windsurf)',
      'Node.js and Python SDKs',
      'Auto-detection of exchange and bank formats',
      'Stateless processing — files never written to disk',
    ],
    creator: {
      '@type': 'Organization',
      name: 'TaxFormatter',
    },
    datePublished: '2024-01-01',
    dateModified: '2026-03-18',
    softwareVersion: '1.0',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
