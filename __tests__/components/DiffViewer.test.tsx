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
    expect(screen.getByText(/Virus scan in progress/)).toBeInTheDocument();
  });

  it('should show processing state when job is running', () => {
    const runningJob = createRunningJob();
    mockUseJobPolling.mockReturnValue({
      job: runningJob,
      isPolling: true,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    expect(screen.getByText(/Detecting exchange format/)).toBeInTheDocument();
  });

  it('should show diff data when job succeeds', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: [
          { date: '2024-01-01', type: 'buy', amount: '1.5' },
          { date: '2024-01-02', type: 'sell', amount: '0.5' },
        ],
        processed: [
          { Date: '01/01/2024', 'Sent Amount': '1.50', 'Sent Currency': 'BTC' },
          { Date: '01/02/2024', 'Sent Amount': '0.50', 'Sent Currency': 'ETH' },
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

    // Should show the transformation header
    expect(screen.getByText('Transformation Preview')).toBeInTheDocument();

    // Should show Original and Converted labels
    expect(screen.getByText('Original (Exchange Format)')).toBeInTheDocument();
    expect(screen.getByText('Converted (Koinly Format)')).toBeInTheDocument();
  });

  it('should show legend for diff colors', () => {
    const succeededJob = createSucceededJob();
    mockUseJobPolling.mockReturnValue({
      job: succeededJob,
      isPolling: false,
      error: null,
    });

    renderWithProvider(<DiffViewer />);

    expect(screen.getByText('Original exchange data')).toBeInTheDocument();
    expect(screen.getByText('Tax-ready Koinly format')).toBeInTheDocument();
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
    expect(screen.getByText('Original (Exchange Format)')).toBeInTheDocument();

    // Find the collapse button
    const collapseButton = screen.getByRole('button');
    await user.click(collapseButton);

    // After collapse, tables should not be visible
    await waitFor(() => {
      expect(screen.queryByText('Original exchange data')).not.toBeInTheDocument();
    });

    // Click again to expand
    await user.click(collapseButton);

    await waitFor(() => {
      expect(screen.getByText('Original exchange data')).toBeInTheDocument();
    });
  });

  it('should show "Show more rows" button when there are more than 3 rows', () => {
    const succeededJob = createSucceededJob({
      result: {
        original: Array.from({ length: 10 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'buy',
          amount: String(i + 1),
        })),
        processed: Array.from({ length: 10 }, (_, i) => ({
          Date: `01/${String(i + 1).padStart(2, '0')}/2024`,
          'Sent Amount': String(i + 1) + '.00',
          'Sent Currency': 'BTC',
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

    expect(screen.getByText('Show more rows')).toBeInTheDocument();
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
          Date: `01/${String(i + 1).padStart(2, '0')}/2024`,
          'Sent Amount': String(i + 1) + '.00',
          'Sent Currency': 'BTC',
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

    const showMoreButton = screen.getByText('Show more rows');
    await user.click(showMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Show less'));

    await waitFor(() => {
      expect(screen.getByText('Show more rows')).toBeInTheDocument();
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

    // Should still render (uses Object.keys fallback for columns)
    expect(screen.getByText('Transformation Preview')).toBeInTheDocument();
  });
});
