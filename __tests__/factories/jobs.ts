import { JobData, JobStatus } from '@/hooks/useJobPolling';

// Simple ID generator for tests (no external dependencies to avoid ESM issues)
let idCounter = 0;
const generateId = () => `test-${Date.now()}-${++idCounter}`;

export const createMockJobData = (overrides?: Partial<JobData>): JobData => ({
  jobId: generateId(),
  uploadId: generateId(),
  status: 'queued' as JobStatus,
  result: null,
  error: null,
  createdAt: new Date().toISOString(),
  startedAt: null,
  finishedAt: null,
  filename: `upload-${idCounter}.csv`,
  ...overrides,
});

export const createQueuedJob = (overrides?: Partial<JobData>): JobData =>
  createMockJobData({ status: 'queued', ...overrides });

export const createRunningJob = (overrides?: Partial<JobData>): JobData =>
  createMockJobData({
    status: 'running',
    startedAt: new Date().toISOString(),
    ...overrides,
  });

export const createSucceededJob = (overrides?: Partial<JobData>): JobData =>
  createMockJobData({
    status: 'succeeded',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    result: {
      exchangeDetected: 'Coinbase',
      transactionCount: 100,
      original: [
        { date: '2024-01-01', type: 'buy', amount: '1.5' },
        { date: '2024-01-02', type: 'sell', amount: '0.5' },
      ],
      processed: [
        { date: '01/01/2024', type: 'Buy', amount: '1.50000000' },
        { date: '01/02/2024', type: 'Sell', amount: '0.50000000' },
      ],
      columns: ['date', 'type', 'amount'],
    },
    ...overrides,
  });

export const createFailedJob = (overrides?: Partial<JobData>): JobData =>
  createMockJobData({
    status: 'failed',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    error: 'Failed to process file: Invalid CSV format',
    ...overrides,
  });

export const createMockJobs = (count: number): JobData[] =>
  Array.from({ length: count }, () => createMockJobData());
