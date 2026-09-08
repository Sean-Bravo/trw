import {
  Code2,
  Rocket,
  BarChart3,
  AlertTriangle,
  Upload,
  HelpCircle,
} from 'lucide-react'
import type { DocSection } from '@/types/docs'

/**
 * Centralized documentation structure
 * Defines all doc sections and pages for the application
 */
export const DOCS_SECTIONS: DocSection[] = [
  {
    title: 'Developer API',
    slug: 'api',
    description: 'Parse crypto CSVs and bank statement PDFs programmatically over REST',
    icon: Code2,
    // Single-page section: the content lives at /docs/api, so the page needs
    // the explicit href override rather than the computed nested URL.
    pages: [
      { title: 'API Reference', slug: 'api', href: '/docs/api' },
    ],
  },
  {
    title: 'Getting Started',
    slug: 'getting-started',
    description: 'Learn how to upload your CSV and get started with TaxFormatter',
    icon: Rocket,
    pages: [
      { title: 'Upload Your First CSV', slug: 'upload-your-first-csv' },
      { title: 'Supported Exchanges', slug: 'supported-exchanges' },
      { title: 'File Format Requirements', slug: 'file-format-requirements' },
      { title: 'Troubleshooting Upload Errors', slug: 'troubleshooting-upload-errors' },
    ],
  },
  {
    title: 'Understanding Results',
    slug: 'understanding-your-results',
    description: 'Understand what the AI insights mean and how to read your formatted data',
    icon: BarChart3,
    pages: [
      { title: 'What the Insight Panels Mean', slug: 'what-the-insight-panels-mean' },
      { title: 'Reading Your Formatted CSV', slug: 'reading-your-formatted-csv' },
      { title: 'Free vs Pro Differences', slug: 'free-vs-pro-differences' },
    ],
  },
  {
    title: 'Tax Issues & Flags',
    slug: 'tax-issues-flags',
    description: 'Deep dive into wash sales, staking income, airdrops, and other tax issues',
    icon: AlertTriangle,
    pages: [
      { title: 'Wash Sales', slug: 'wash-sales' },
      { title: 'Staking Income', slug: 'staking-income' },
      { title: 'Airdrop Handling', slug: 'airdrop-handling' },
      { title: 'DeFi Classification', slug: 'defi-token-classification' },
      { title: 'Timestamp Issues', slug: 'timestamp-mismatches' },
    ],
  },
  {
    title: 'Exporting Your Data',
    slug: 'exporting-your-data',
    description: 'Export your formatted CSV and integrate with TurboTax, Koinly, and more',
    icon: Upload,
    pages: [
      { title: 'Free Tier Export Format', slug: 'free-tier-export-format' },
      { title: 'Pro Tier Flagged CSV', slug: 'pro-tier-flagged-csv' },
      { title: 'TurboTax Integration', slug: 'turbotax-integration' },
      { title: 'Koinly Integration', slug: 'koinly-integration' },
      { title: 'CoinLedger Integration', slug: 'coinledger-integration' },
      { title: 'ZenLedger Integration', slug: 'zenledger-integration' },
    ],
  },
  {
    title: 'FAQ',
    slug: 'faq',
    description: 'Common questions and answers about TaxFormatter',
    icon: HelpCircle,
    pages: [
      { title: 'FAQ', slug: 'faq', href: '/docs/faq' },
    ],
  },
]
