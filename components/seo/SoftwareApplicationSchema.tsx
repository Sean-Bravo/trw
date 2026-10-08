import { SoftwareApplication, WithContext } from 'schema-dts';
import { BANK_SOURCES } from '@/lib/bank-registry';
import { EXCHANGE_COUNT, EXCHANGE_SOURCES } from '@/lib/exchange-registry';
import { TIERS, formatFiles } from '@/lib/tier-registry';

// Offers generate from the plan registry so structured data can never quote
// a price or quota the pricing page doesn't.
const offers = TIERS.map((t) =>
  t.priceUsd === 0
    ? {
        '@type': 'Offer',
        name: `${t.name} Tier`,
        price: '0',
        priceCurrency: 'USD',
        description: `${formatFiles(t)} API calls/month, ${t.requestsPerMinute} RPM — no credit card required`,
      }
    : {
        '@type': 'Offer',
        name: `${t.name} API`,
        price: String(t.priceUsd),
        priceCurrency: 'USD',
        description: `${formatFiles(t)} API calls/month, ${t.requestsPerMinute} RPM`,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: String(t.priceUsd),
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
      }
);

export function SoftwareApplicationSchema() {
  const schema: WithContext<SoftwareApplication> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TaxFormatter API',
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    description: `Developer API for parsing crypto exchange CSVs and bank statement PDFs into structured JSON. Supports ${EXCHANGE_COUNT} exchanges, ${BANK_SOURCES.length} banks, and 4 tax output formats. Includes MCP server for AI agents and SDKs for Node.js and Python.`,
    url: 'https://www.taxformatter.com',
    screenshot: 'https://www.taxformatter.com/og-image.png',
    offers: offers as any,
    featureList: [
      `${EXCHANGE_COUNT} crypto exchange parsers (${EXCHANGE_SOURCES.slice(0, 5).map((e) => e.name).join(', ')}, and more)`,
      `${BANK_SOURCES.length} bank statement PDF parsers (${BANK_SOURCES.map((b) => b.name).join(', ')})`,
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
