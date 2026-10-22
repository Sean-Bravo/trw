/**
 * Tests for AIInsightsPanel component (P1)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { JobProvider } from '@/contexts/JobContext';
import { createSucceededJob } from '../../factories/jobs';

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

function renderWithProvider() {
  return render(
    <JobProvider userId="u1" initialJobs={[]}>
      <AIInsightsPanel />
    </JobProvider>
  );
}

describe('AIInsightsPanel', () => {
  beforeEach(() => {
    mockPolledJob = null;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jobs: [] }) });
  });

  it('renders AI Insights Panel heading', () => {
    renderWithProvider();
    expect(screen.getByText(/AI Insights Panel/i)).toBeInTheDocument();
  });

  it('shows idle/upload state when no active job', () => {
    renderWithProvider();
    expect(screen.getByText(/Upload a file to begin processing/i)).toBeInTheDocument();
  });

  it('shows the exchange from result.json\'s `exchange` id by its display name', () => {
    mockPolledJob = createSucceededJob({ result: { exchange: 'coinbase', record_count: 20 } });
    renderWithProvider();
    expect(screen.getByText('Coinbase')).toBeInTheDocument();
    expect(screen.queryByText('Waiting for upload...')).not.toBeInTheDocument();
  });

  it('falls back to the raw id for an exchange the registry does not list', () => {
    mockPolledJob = createSucceededJob({ result: { exchange: 'some_new_exchange' } });
    renderWithProvider();
    expect(screen.getByText('some_new_exchange')).toBeInTheDocument();
  });
});
