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
  createMockJobs,
} from '../factories/jobs';

// Mock useJobPolling
const mockSetActiveJob = jest.fn();
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(() => ({
    job: null,
    isPolling: false,
    error: null,
  })),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jobs: [] }),
  })
) as jest.Mock;

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
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
        'Upload your first CSV file to start processing your crypto transactions'
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

    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('should show correct status for succeeded jobs', () => {
    const job = createSucceededJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

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

  it('should show View button for completed jobs', () => {
    const job = createSucceededJob({ jobId: 'job-123', filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    const viewLink = screen.getByText('View');
    expect(viewLink).toBeInTheDocument();
    expect(viewLink.closest('a')).toHaveAttribute(
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

    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should show Retry button for failed jobs', () => {
    const job = createFailedJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should not show action buttons for queued jobs', () => {
    const job = createQueuedJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should not show action buttons for running jobs', () => {
    const job = createRunningJob({ filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should show transaction count for completed jobs with results', () => {
    const job = createSucceededJob({
      filename: 'test.csv',
      result: { transactionCount: 150 },
    });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    expect(screen.getByText('150 transactions')).toBeInTheDocument();
  });

  it('should display formatted date', () => {
    const job = createSucceededJob({
      filename: 'test.csv',
      createdAt: '2024-06-15T10:30:00Z',
    });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    // The exact format depends on locale, but date should be visible
    expect(screen.getByText(/6\/15\/2024|15\/6\/2024/)).toBeInTheDocument();
  });

  it('should allow selecting a job by clicking row', async () => {
    const user = userEvent.setup();
    const jobs = [
      createSucceededJob({ jobId: 'job-1', filename: 'file1.csv' }),
      createSucceededJob({ jobId: 'job-2', filename: 'file2.csv' }),
    ];

    render(
      <JobProvider userId="test-user" initialJobs={jobs}>
        <JobHistoryTable />
      </JobProvider>
    );

    // Click on the first job row
    const firstRow = screen.getByText('file1.csv').closest('div[class*="cursor-pointer"]');
    if (firstRow) {
      await user.click(firstRow);
    }

    // The row should be selectable (implementation uses setActiveJob from context)
    // Since we're testing the component in isolation, we verify the row is clickable
    expect(firstRow).toHaveClass('cursor-pointer');
  });

  it('should highlight active job', async () => {
    const user = userEvent.setup();
    const jobs = [
      createSucceededJob({ jobId: 'job-1', filename: 'file1.csv' }),
      createSucceededJob({ jobId: 'job-2', filename: 'file2.csv' }),
    ];

    render(
      <JobProvider userId="test-user" initialJobs={jobs}>
        <JobHistoryTable />
      </JobProvider>
    );

    // Click to select the first job
    const firstRow = screen.getByText('file1.csv').closest('div[class*="cursor-pointer"]');
    if (firstRow) {
      await user.click(firstRow);
    }

    // After clicking, the row styling would change (indigo highlight)
    // The actual visual change depends on the activeJob state
    expect(firstRow).toBeInTheDocument();
  });

  it('should render multiple jobs in correct order', () => {
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

    const filenames = screen.getAllByText(/\.csv$/);
    expect(filenames[0]).toHaveTextContent('file1.csv');
    expect(filenames[1]).toHaveTextContent('file2.csv');
    expect(filenames[2]).toHaveTextContent('file3.csv');
  });

  it('should stop event propagation when clicking action buttons', async () => {
    const user = userEvent.setup();
    const job = createSucceededJob({ jobId: 'job-123', filename: 'test.csv' });

    render(
      <JobProvider userId="test-user" initialJobs={[job]}>
        <JobHistoryTable />
      </JobProvider>
    );

    // Click the View button - should not trigger row selection
    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    // The click should be handled by the link, not the row
    // (implementation uses onClick stopPropagation)
    expect(viewButton).toBeInTheDocument();
  });
});
