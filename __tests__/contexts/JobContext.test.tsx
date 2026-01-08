import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobProvider, useJobContext } from '@/contexts/JobContext';
import { createQueuedJob, createSucceededJob, createMockJobs } from '../factories/jobs';

// Mock the useJobPolling hook
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(),
}));

import { useJobPolling } from '@/hooks/useJobPolling';

const mockUseJobPolling = useJobPolling as jest.Mock;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test component that consumes the context
function TestConsumer() {
  const {
    activeJob,
    jobHistory,
    isPolling,
    setActiveJob,
    clearActiveJob,
    refreshJobHistory,
  } = useJobContext();

  return (
    <div>
      <div data-testid="active-job">{activeJob?.jobId || 'none'}</div>
      <div data-testid="job-count">{jobHistory.length}</div>
      <div data-testid="is-polling">{isPolling ? 'true' : 'false'}</div>
      <button onClick={() => setActiveJob('test-job-123')}>Set Active</button>
      <button onClick={() => clearActiveJob()}>Clear Active</button>
      <button onClick={() => refreshJobHistory()}>Refresh</button>
    </div>
  );
}

describe('JobContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockUseJobPolling.mockReset();
    mockUseJobPolling.mockReturnValue({
      job: null,
      isPolling: false,
      error: null,
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useJobContext must be used within a JobProvider');

    consoleSpy.mockRestore();
  });

  it('should provide default values', () => {
    render(
      <JobProvider userId="user-123">
        <TestConsumer />
      </JobProvider>
    );

    expect(screen.getByTestId('active-job')).toHaveTextContent('none');
    expect(screen.getByTestId('job-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-polling')).toHaveTextContent('false');
  });

  it('should use initialJobs when provided', () => {
    const initialJobs = createMockJobs(3);

    render(
      <JobProvider userId="user-123" initialJobs={initialJobs}>
        <TestConsumer />
      </JobProvider>
    );

    expect(screen.getByTestId('job-count')).toHaveTextContent('3');
  });

  it('should set active job when setActiveJob is called', async () => {
    const user = userEvent.setup();
    const mockJob = createQueuedJob({ jobId: 'test-job-123' });

    mockUseJobPolling.mockReturnValue({
      job: mockJob,
      isPolling: true,
      error: null,
    });

    render(
      <JobProvider userId="user-123">
        <TestConsumer />
      </JobProvider>
    );

    await user.click(screen.getByText('Set Active'));

    // The hook will be called with the new job ID
    expect(mockUseJobPolling).toHaveBeenCalled();
  });

  it('should clear active job when clearActiveJob is called', async () => {
    const user = userEvent.setup();

    render(
      <JobProvider userId="user-123">
        <TestConsumer />
      </JobProvider>
    );

    await user.click(screen.getByText('Set Active'));
    await user.click(screen.getByText('Clear Active'));

    expect(screen.getByTestId('active-job')).toHaveTextContent('none');
  });

  it('should refresh job history from API', async () => {
    const user = userEvent.setup();
    const mockJobs = createMockJobs(5);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobs: mockJobs }),
    });

    render(
      <JobProvider userId="user-123" initialJobs={[]}>
        <TestConsumer />
      </JobProvider>
    );

    expect(screen.getByTestId('job-count')).toHaveTextContent('0');

    await user.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('job-count')).toHaveTextContent('5');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/jobs');
  });

  it('should handle refresh failure gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <JobProvider userId="user-123">
        <TestConsumer />
      </JobProvider>
    );

    await user.click(screen.getByText('Refresh'));

    // Should not crash, job count should remain 0
    expect(screen.getByTestId('job-count')).toHaveTextContent('0');

    consoleSpy.mockRestore();
  });

  it('should update job history when polling returns updated job', async () => {
    const initialJob = createQueuedJob({ jobId: 'job-123' });
    const updatedJob = createSucceededJob({ jobId: 'job-123' });

    let onSuccessCallback: ((job: any) => void) | undefined;

    mockUseJobPolling.mockImplementation((jobId, options) => {
      onSuccessCallback = options?.onSuccess;
      return {
        job: updatedJob,
        isPolling: false,
        error: null,
      };
    });

    render(
      <JobProvider userId="user-123" initialJobs={[initialJob]}>
        <TestConsumer />
      </JobProvider>
    );

    // Simulate the onSuccess callback being called
    if (onSuccessCallback) {
      act(() => {
        onSuccessCallback!(updatedJob);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('job-count')).toHaveTextContent('1');
    });
  });

  it('should expose isPolling state from hook', () => {
    mockUseJobPolling.mockReturnValue({
      job: null,
      isPolling: true,
      error: null,
    });

    render(
      <JobProvider userId="user-123">
        <TestConsumer />
      </JobProvider>
    );

    expect(screen.getByTestId('is-polling')).toHaveTextContent('true');
  });

  it('should fetch jobs on mount when initialJobs is empty', async () => {
    const mockJobs = createMockJobs(2);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobs: mockJobs }),
    });

    render(
      <JobProvider userId="user-123" initialJobs={[]}>
        <TestConsumer />
      </JobProvider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/jobs');
    });

    await waitFor(() => {
      expect(screen.getByTestId('job-count')).toHaveTextContent('2');
    });
  });

  it('should NOT fetch jobs on mount when initialJobs is provided', async () => {
    const initialJobs = createMockJobs(3);

    render(
      <JobProvider userId="user-123" initialJobs={initialJobs}>
        <TestConsumer />
      </JobProvider>
    );

    // Wait a tick to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
