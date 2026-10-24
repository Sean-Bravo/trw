import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobHistoryTable } from '@/components/dashboard/JobHistoryTable';
import { JobProvider } from '@/contexts/JobContext';
import {
  createQueuedJob,
  createRunningJob,
  createSucceededJob,
  createFailedJob,
} from '../factories/jobs';

// Mock useJobPolling
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(() => ({
    job: null,
    isPolling: false,
    error: null,
  })),
}));

// Mock fetch for bank jobs and crypto jobs
global.fetch = jest.fn((url: string) => {
  if (url === '/api/bank/jobs') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ jobs: [] }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jobs: [] }),
  });
}) as jest.Mock;

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock createPortal for delete modals
jest.mock('react-dom', () => {
  const original = jest.requireActual('react-dom');
  return {
    ...original,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('JobHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no jobs', () => {
    render(
      <JobProvider userId="test-user" initialJobs={[]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('No uploads yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload a CSV or bank statement to start processing'
      )
    ).toBeInTheDocument();
  });

  it('should render job list when jobs exist', () => {
    const jobs = [
      createSucceededJob({ filename: 'coinbase_2024.csv' }),
      createRunningJob({ filename: 'kraken_export.csv' }),
      createQueuedJob({ filename: 'binance_data.csv' }),
    ];

    render(
      <JobProvider userId="test-user" initialJobs={jobs}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('coinbase_2024.csv')).toBeInTheDocument();
    expect(screen.getByText('kraken_export.csv')).toBeInTheDocument();
    expect(screen.getByText('binance_data.csv')).toBeInTheDocument();
  });

  it('should show correct status for queued jobs', () => {
    const job = createQueuedJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('should show correct status for running jobs', () => {
    const job = createRunningJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    // Running crypto jobs are mapped to 'processing' in unified history
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('should show correct status for succeeded jobs', () => {
    const job = createSucceededJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    // Succeeded crypto jobs are mapped to 'completed' in unified history
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should show correct status for failed jobs', () => {
    const job = createFailedJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should show View button for completed crypto jobs', () => {
    const job = createSucceededJob({ jobId: 'job-123', filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    const viewLinks = screen.getAllByText('View');
    expect(viewLinks.length).toBeGreaterThan(0);
    expect(viewLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/jobs/job-123'
    );
  });

  it('should show Download button for completed jobs', () => {
    const job = createSucceededJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    const downloadButtons = screen.getAllByText('Download');
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('should offer Delete for failed jobs in the actions menu', async () => {
    const job = createFailedJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions for test.csv' }));
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
  });

  it('should offer Delete for processing jobs so a stuck one can be cleared', async () => {
    const job = createRunningJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Processing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for test.csv' }));
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
  });

  it('should show tabs for filtering', () => {
    const job = createSucceededJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByRole('button', { name: 'All · 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Crypto · 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bank · 0' })).toBeInTheDocument();
  });

  it('should render multiple jobs', () => {
    const jobs = [
      createSucceededJob({ filename: 'file1.csv' }),
      createRunningJob({ filename: 'file2.csv' }),
      createQueuedJob({ filename: 'file3.csv' }),
    ];

    render(
      <JobProvider userId="test-user" initialJobs={jobs}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('file1.csv')).toBeInTheDocument();
    expect(screen.getByText('file2.csv')).toBeInTheDocument();
    expect(screen.getByText('file3.csv')).toBeInTheDocument();
  });

  it('should show exchange and transaction count from what the processor writes', () => {
    // record_count, not the transactionCount nothing ever wrote
    const job = createSucceededJob({
      filename: 'test.csv',
      result: { exchange: 'coinbase', record_count: 150 },
    });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Coinbase · 150 transactions')).toBeInTheDocument();
  });

  it('shows a job stuck past 30 minutes as Timed out, with Retry', () => {
    const job = createQueuedJob({ filename: 'stuck.csv', createdAt: new Date(Date.now() - 31 * 60 * 1000).toISOString() });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Timed out')).toBeInTheDocument();
    expect(screen.getByText('No result after 30 minutes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a failed job with its reason and Retry', () => {
    const job = createFailedJob({ filename: 'bad.csv', error: 'Could not auto-detect exchange format' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Could not auto-detect exchange format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('shows 7 rows, then all of them on request', async () => {
    const jobs = Array.from({ length: 9 }, (_, i) => createSucceededJob({ filename: `file${i}.csv` }));

    render(
      <JobProvider userId="test-user" initialJobs={jobs}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Showing 7 of 9')).toBeInTheDocument();
    expect(screen.queryByText('file8.csv')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText('Showing 9 of 9')).toBeInTheDocument();
    expect(screen.getByText('file8.csv')).toBeInTheDocument();
  });
});
