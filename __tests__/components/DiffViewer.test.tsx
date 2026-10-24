import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from '@/components/dashboard/DiffViewer';
import { JobProvider } from '@/contexts/JobContext';
import { createQueuedJob, createRunningJob, createSucceededJob, createFailedJob } from '../factories/jobs';

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

const renderWithProvider = (ui: React.ReactElement) =>
  render(
    <JobProvider userId="test-user" initialJobs={[]}>
      {ui}
    </JobProvider>
  );

function withJob(job: unknown) {
  mockUseJobPolling.mockReturnValue({ job, isPolling: false, error: null, retry: jest.fn() });
}

const processedRow = (i: number) => ({
  Date: `2024-01-0${i + 1} 14:05:00`,
  'Sent Amount': 8800,
  'Sent Currency': 'USD',
  'Received Amount': 0.2,
  'Received Currency': 'BTC',
  Description: 'Coinbase buy',
});

describe('DiffViewer ("What changed")', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withJob(null);
  });

  it('renders nothing without a finished job', () => {
    const { container } = renderWithProvider(<DiffViewer />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['queued', createQueuedJob()],
    ['running', createRunningJob()],
    ['failed', createFailedJob()],
  ])('renders nothing while the job is %s (Insights covers those states)', (_, job) => {
    withJob(job);
    const { container } = renderWithProvider(<DiffViewer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the converted rows of a finished job', () => {
    withJob(createSucceededJob({ result: { exchange: 'coinbase', record_count: 2, processed: [processedRow(0), processedRow(1)] } }));
    renderWithProvider(<DiffViewer />);

    expect(screen.getByRole('heading', { name: 'What changed' })).toBeInTheDocument();
    expect(screen.getByText(/Coinbase export → tax-ready rows · 2 of 2 shown/)).toBeInTheDocument();
    expect(screen.getAllByText('8,800 USD')).toHaveLength(2);
    expect(screen.getAllByText('0.2 BTC')).toHaveLength(2);
    expect(screen.getByText('Jan 1, 2024 14:05')).toBeInTheDocument();
  });

  it('writes a blank amount as a dash, never 0', () => {
    withJob(createSucceededJob({
      result: { processed: [{ Date: '2024-01-10', 'Sent Amount': 0.05, 'Sent Currency': 'BTC', 'Received Amount': null, 'Received Currency': '', Description: 'Coinbase send' }] },
    }));
    renderWithProvider(<DiffViewer />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
  });

  it('shows 3 rows and expands to all of them', async () => {
    const rows = [0, 1, 2, 3, 4].map(processedRow);
    withJob(createSucceededJob({ result: { exchange: 'coinbase', record_count: 20, processed: rows } }));
    renderWithProvider(<DiffViewer />);

    expect(screen.getAllByText('Coinbase buy')).toHaveLength(3);
    expect(screen.getByText(/3 of 20 shown/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show all 5 rows' }));
    expect(screen.getAllByText('Coinbase buy')).toHaveLength(5);

    await userEvent.click(screen.getByRole('button', { name: 'Show fewer rows' }));
    expect(screen.getAllByText('Coinbase buy')).toHaveLength(3);
  });

  it('renders nothing for a finished job without converted rows', () => {
    withJob(createSucceededJob({ result: { processed: [] } }));
    const { container } = renderWithProvider(<DiffViewer />);
    expect(container).toBeEmptyDOMElement();
  });
});
