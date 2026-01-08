import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from '@/components/dashboard/DiffViewer';
import { JobProvider } from '@/contexts/JobContext';
import { createQueuedJob, createRunningJob, createSucceededJob } from '../factories/jobs';

// Mock useJobPolling
const mockUseJobPolling = jest.fn();
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: () => mockUseJobPolling(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jobs: [] }),
  })
) as jest.Mock;

// Helper to render with providers
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <JobProvider userId="test-user" initialJobs={[]}>
      {ui}
    </JobProvider>
  );
};

describe('DiffViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJobPolling.mockReturnValue({
      job: null,
      isPolling: false,
      error: null,
    });
  });

  it('should render empty state when no job is active', () => {
    renderWithProvider(<DiffViewer />);

    expect(screen.getByText('Changes Preview')).toBeInTheDocument();
    expect(
      screen.getByText('Upload a file to see the diff preview')
    ).toBeInTheDocument();
  });

  it('should show processing state when job is queued', () => {
    const queuedJob = createQueuedJob();
    mockUseJobPolling.mockReturnValue({
      job: queuedJob,
      isPolling: true,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    expect(screen.getByText('Changes Preview')).toBeInTheDocument();
    expect(screen.getByText('Processing your file...')).toBeInTheDocument();
  });

  it('should show processing state when job is running', () => {
    const runningJob = createRunningJob();
    mockUseJobPolling.mockReturnValue({
      job: runningJob,
      isPolling: true,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    expect(screen.getByText('Processing your file...')).toBeInTheDocument();
  });

  it('should show diff data when job succeeds', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: [
          { date: '2024-01-01', type: 'buy', amount: '1.5' },
          { date: '2024-01-02', type: 'sell', amount: '0.5' },
        ],
        processed: [
          { date: '01/01/2024', type: 'Buy', amount: '1.50000000' },
          { date: '01/02/2024', type: 'Sell', amount: '0.50000000' },
        ],
        columns: ['date', 'type', 'amount'],
        transactionCount: 2,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Should show the diff header with fixes count
    expect(screen.getByText('Changes Preview')).toBeInTheDocument();
    expect(screen.getByText(/fixes/)).toBeInTheDocument();

    // Should show Original and Formatted labels
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Formatted')).toBeInTheDocument();

    // Should show column headers
    expect(screen.getAllByText('date')).toHaveLength(2);
    expect(screen.getAllByText('type')).toHaveLength(2);
    expect(screen.getAllByText('amount')).toHaveLength(2);
  });

  it('should show legend for diff colors', () => {
    const succeededJob = createSucceededJob();
    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    expect(screen.getByText('Changed from')).toBeInTheDocument();
    expect(screen.getByText('Changed to')).toBeInTheDocument();
  });

  it('should be collapsible', async () => {
    const user = userEvent.setup();
    const succeededJob = createSucceededJob();
    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Initially expanded
    expect(screen.getByText('Original')).toBeInTheDocument();

    // Find the collapse button (the one with ChevronUp icon)
    const collapseButton = screen.getByRole('button');
    await user.click(collapseButton);

    // After collapse, tables should not be visible
    await waitFor(() => {
      expect(screen.queryByText('Changed from')).not.toBeInTheDocument();
    });

    // Click again to expand
    await user.click(collapseButton);

    await waitFor(() => {
      expect(screen.getByText('Changed from')).toBeInTheDocument();
    });
  });

  it('should show "Show more" button when there are more than 5 rows', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: Array.from({ length: 10 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'buy',
          amount: String(i + 1),
        })),
        processed: Array.from({ length: 10 }, (_, i) => ({
          date: `01/${String(i + 1).padStart(2, '0')}/2024`,
          type: 'Buy',
          amount: String(i + 1) + '.00000000',
        })),
        columns: ['date', 'type', 'amount'],
        transactionCount: 10,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Should show "Show X more rows" button
    expect(screen.getByText(/Show \d+ more rows/)).toBeInTheDocument();
  });

  it('should toggle showing all rows', async () => {
    const user = userEvent.setup();
    const succeededJob = createSucceededJob({
      result: {
        original: Array.from({ length: 10 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'buy',
          amount: String(i + 1),
        })),
        processed: Array.from({ length: 10 }, (_, i) => ({
          date: `01/${String(i + 1).padStart(2, '0')}/2024`,
          type: 'Buy',
          amount: String(i + 1) + '.00000000',
        })),
        columns: ['date', 'type', 'amount'],
        transactionCount: 10,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    const showMoreButton = screen.getByText(/Show \d+ more rows/);
    await user.click(showMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Show less'));

    await waitFor(() => {
      expect(screen.getByText(/Show \d+ more rows/)).toBeInTheDocument();
    });
  });

  it('should handle empty result gracefully', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: [],
        processed: [],
        columns: ['date', 'type', 'amount'],
        transactionCount: 0,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Should show empty state since no data
    expect(
      screen.getByText('Upload a file to see the diff preview')
    ).toBeInTheDocument();
  });

  it('should handle missing columns gracefully', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: [{ date: '2024-01-01' }],
        processed: [{ date: '01/01/2024' }],
        // Missing columns array
        transactionCount: 1,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Should show empty state since columns is missing
    expect(
      screen.getByText('Upload a file to see the diff preview')
    ).toBeInTheDocument();
  });

  it('should show empty cells as "empty" italic text', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: [{ date: '2024-01-01', type: '', amount: '1.5' }],
        processed: [{ date: '01/01/2024', type: 'Buy', amount: '1.50000000' }],
        columns: ['date', 'type', 'amount'],
        transactionCount: 1,
      },
    });

    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    // Should show "empty" for empty cells
    expect(screen.getByText('empty')).toBeInTheDocument();
  });
});
