/**
 * Tests for AIInsightsPanel component (P1)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AIInsightsPanel, formatDateRange } from '@/components/dashboard/AIInsightsPanel';
import { JobProvider } from '@/contexts/JobContext';
import { createSucceededJob, createFailedJob, createRunningJob } from '../../factories/jobs';
import { getJobInsights } from '@/lib/upload-client';

// The polled job; null keeps the panel idle.
let mockPolledJob: unknown = null;
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: () => ({ job: mockPolledJob, isPolling: false, error: null, retry: jest.fn() }),
}));

jest.mock('@/lib/upload-client', () => ({
  getJobInsights: jest.fn().mockResolvedValue({ quick_stats: {}, ai_insights: {} }),
  retryJobWithExchange: jest.fn().mockResolvedValue({}),
  getDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: 'https://example.com/f' }),
}));

const mockGetJobInsights = getJobInsights as jest.Mock;

function renderWithProvider() {
  return render(
    <JobProvider userId="u1" initialJobs={[]}>
      <AIInsightsPanel />
    </JobProvider>
  );
}

const INSIGHTS = {
  success: true,
  tier: 'free',
  quick_stats: {
    total_transactions: 20,
    transaction_types: { buy: 7, sell: 6, transfer: 7, fee: 12 },
    assets: [],
    unique_assets: 5,
    date_range: { start: '2024-01-03 14:05:00', end: '2024-11-15 16:00:00' },
  },
  ai_insights: {
    summary: 'Your Coinbase export has 20 transactions.',
    total_transactions: 20,
    date_range: { start: '2024-01-03', end: '2024-11-15' },
    transaction_types: {},
    top_assets: [{ asset: 'ETH', count: 6 }, { asset: 'SOL', count: 4 }],
    data_notes: ['3 staking rows (ETH) are usually treated as income.'],
  },
};

describe('AIInsightsPanel', () => {
  beforeEach(() => {
    mockPolledJob = null;
    mockGetJobInsights.mockResolvedValue({ quick_stats: {}, ai_insights: {} });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jobs: [] }) });
  });

  it('is headed "Insights"', () => {
    renderWithProvider();
    expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
  });

  it('shows a calm empty state when no job is active', () => {
    renderWithProvider();
    expect(screen.getByText('No file yet')).toBeInTheDocument();
    // The old idle state looked like a scan in progress
    expect(screen.queryByText(/Checking for issues/i)).not.toBeInTheDocument();
  });

  it('shows the exchange by display name and the record count in the file line', () => {
    mockPolledJob = createSucceededJob({ filename: 'trades.csv', result: { exchange: 'coinbase', record_count: 20 } });
    renderWithProvider();
    expect(screen.getByText('trades.csv')).toBeInTheDocument();
    expect(screen.getByText('Coinbase')).toBeInTheDocument();
    expect(screen.getByText('20 transactions')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('falls back to the raw id for an exchange the registry does not list', () => {
    mockPolledJob = createSucceededJob({ result: { exchange: 'some_new_exchange' } });
    renderWithProvider();
    expect(screen.getByText('some_new_exchange')).toBeInTheDocument();
  });

  it('shows the breakdown, fee note, summary and notes once insights load', async () => {
    mockGetJobInsights.mockResolvedValue(INSIGHTS);
    mockPolledJob = createSucceededJob({ result: { exchange: 'coinbase', record_count: 20 } });
    renderWithProvider();

    expect(await screen.findByText('Your Coinbase export has 20 transactions.')).toBeInTheDocument();
    expect(screen.getByText('Buys').nextSibling).toHaveTextContent('7');
    expect(screen.getByText('Sells').nextSibling).toHaveTextContent('6');
    expect(screen.getByText('Transfers').nextSibling).toHaveTextContent('7');
    // Fees count rows that carry a fee, so they are a note, not a fourth tile
    expect(screen.getByText('12 of these rows also carry a fee.')).toBeInTheDocument();
    expect(screen.getByText('Jan 3 – Nov 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('ETH · 6')).toBeInTheDocument();
    expect(screen.getByText('3 staking rows (ETH) are usually treated as income.')).toBeInTheDocument();
    expect(screen.getByLabelText('Export for')).toBeInTheDocument();
  });

  it('never shows the old placeholder exchange details', async () => {
    mockGetJobInsights.mockResolvedValue(INSIGHTS);
    mockPolledJob = createSucceededJob({ result: { exchange: 'coinbase' } });
    renderWithProvider();
    await screen.findByText('Your Coinbase export has 20 transactions.');
    expect(screen.queryByText('Confidence')).not.toBeInTheDocument();
    expect(screen.queryByText('YYYY-MM-DD')).not.toBeInTheDocument();
  });

  it('shows progress while the job runs', () => {
    mockPolledJob = createRunningJob();
    renderWithProvider();
    expect(screen.getByText('Converting…')).toBeInTheDocument();
  });

  it('explains a failed job', () => {
    mockPolledJob = createFailedJob({ error: 'File has no transaction rows' });
    renderWithProvider();
    expect(screen.getByText("Couldn't convert this file")).toBeInTheDocument();
    expect(screen.getByText('File has no transaction rows')).toBeInTheDocument();
  });
});

describe('formatDateRange', () => {
  it('formats a same-year range compactly', () => {
    expect(formatDateRange('2024-01-03 14:05:00', '2024-11-15 16:00:00')).toBe('Jan 3 – Nov 15, 2024');
  });

  it('keeps both years across a year boundary', () => {
    expect(formatDateRange('2023-12-30', '2024-01-02')).toBe('Dec 30, 2023 – Jan 2, 2024');
  });

  it('reads a bare date as a local date, not the day before', () => {
    expect(formatDateRange('2024-01-10', '2024-01-10')).toBe('Jan 10 – Jan 10, 2024');
  });

  it('returns nothing without both ends', () => {
    expect(formatDateRange(null, '2024-01-01')).toBeUndefined();
  });
});
