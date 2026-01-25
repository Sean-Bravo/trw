/**
 * Tests for AIInsightsPanel component (P1)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { JobProvider } from '@/contexts/JobContext';

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
});
