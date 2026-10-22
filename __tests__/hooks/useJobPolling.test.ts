import { renderHook, waitFor, act } from '@testing-library/react';
import { useJobPolling } from '@/hooks/useJobPolling';
import { createQueuedJob, createRunningJob, createSucceededJob, createFailedJob } from '../factories/jobs';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useJobPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not poll when jobId is null', () => {
    const { result } = renderHook(() => useJobPolling(null));

    expect(result.current.job).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not poll when enabled is false', () => {
    const { result } = renderHook(() =>
      useJobPolling('job-123', { enabled: false })
    );

    expect(result.current.isPolling).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch job data when jobId is provided', async () => {
    const mockJob = createQueuedJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result } = renderHook(() => useJobPolling('job-123'));

    expect(result.current.isPolling).toBe(true);

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/jobs/job-123');
  });

  it('should continue polling for queued jobs', async () => {
    const mockJob = createQueuedJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    expect(result.current.isPolling).toBe(true);

    // Advance timer to trigger next poll
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should have polled again
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should continue polling for running jobs', async () => {
    const mockJob = createRunningJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    expect(result.current.isPolling).toBe(true);
  });

  it('should stop polling when job succeeds', async () => {
    const mockJob = createSucceededJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });

    // Advance timer - should NOT trigger another poll
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should stop polling when job fails', async () => {
    const mockJob = createFailedJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });
  });

  it('should call onSuccess callback when job is fetched', async () => {
    const mockJob = createQueuedJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const onSuccess = jest.fn();
    renderHook(() => useJobPolling('job-123', { onSuccess }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockJob);
    });
  });

  it('should give up at once on a permanent error (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Job not found' }),
    });

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPolling('job-123', { onError })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });

    expect(result.current.error?.message).toBe('Job not found');
    expect(result.current.isPolling).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should keep polling through a transient error and recover', async () => {
    // A 500 for a job that had finished used to stop polling for good and
    // leave the dashboard on "Processing".
    const done = createSucceededJob({ jobId: 'job-123' });
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Internal server error' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(done) });

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000, onError })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.isPolling).toBe(true);

    // First retry backs off to 2x the interval.
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.job).toEqual(done);
    });
    expect(result.current.error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should give up after maxRetries consecutive network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000, maxRetries: 2, onError })
    );

    // 1 initial try + 2 retries (backoff 2s, then 4s).
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isPolling).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should start polling again when retry() is called after giving up', async () => {
    const running = createRunningJob({ jobId: 'job-123' });
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(running) });

    const { result } = renderHook(() =>
      useJobPolling('job-123', { maxRetries: 0 })
    );

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.job).toEqual(running);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isPolling).toBe(true);
  });

  it('should clean up on unmount', async () => {
    const mockJob = createRunningJob({ jobId: 'job-123' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { result, unmount } = renderHook(() =>
      useJobPolling('job-123', { interval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    unmount();

    // Advance timer - should NOT trigger another poll after unmount
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Only the initial fetch should have been called
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should restart polling when jobId changes', async () => {
    const job1 = createRunningJob({ jobId: 'job-1' });
    const job2 = createRunningJob({ jobId: 'job-2' });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(job1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(job2),
      });

    const { result, rerender } = renderHook(
      ({ jobId }) => useJobPolling(jobId),
      { initialProps: { jobId: 'job-1' } }
    );

    await waitFor(() => {
      expect(result.current.job?.jobId).toBe('job-1');
    });

    rerender({ jobId: 'job-2' });

    await waitFor(() => {
      expect(result.current.job?.jobId).toBe('job-2');
    });

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/jobs/job-1');
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/jobs/job-2');
  });
});
