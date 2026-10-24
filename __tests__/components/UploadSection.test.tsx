import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadSection } from '@/components/dashboard/UploadSection';
import { useJobContext } from '@/contexts/JobContext';
import { createQueuedJob, createRunningJob, createSucceededJob } from '../factories/jobs';

jest.mock('@/contexts/JobContext', () => ({ useJobContext: jest.fn() }));
jest.mock('@/components/dashboard/FileUploader', () => ({ FileUploader: () => <div>uploader</div> }));
jest.mock('@/components/dashboard/BankPDFUploader', () => ({ BankPDFUploader: () => <div>bank</div> }));

const mockUseJobContext = useJobContext as jest.Mock;

function withContext(overrides: Record<string, unknown>) {
  const ctx = {
    activeJob: null,
    clearActiveJob: jest.fn(),
    cancelActiveJob: jest.fn().mockResolvedValue(undefined),
    pollError: null,
    retryPolling: jest.fn(),
    ...overrides,
  };
  mockUseJobContext.mockReturnValue(ctx);
  return ctx;
}

describe('UploadSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is the "New conversion" card with a crypto/bank toggle', async () => {
    withContext({});
    render(<UploadSection />);

    expect(screen.getByRole('heading', { name: 'New conversion' })).toBeInTheDocument();
    const crypto = screen.getByRole('button', { name: 'Crypto CSV → tax software' });
    const bank = screen.getByRole('button', { name: 'Bank PDF → CSV' });
    expect(crypto).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('uploader')).toBeInTheDocument();

    await userEvent.click(bank);
    expect(bank).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('bank')).toBeInTheDocument();
  });

  it('shows a status line with Cancel while a job is running', async () => {
    const ctx = withContext({ activeJob: createRunningJob({ filename: 'trades.csv' }) });
    render(<UploadSection />);

    expect(screen.getByText('Converting your file…')).toBeInTheDocument();
    expect(screen.getByText('trades.csv')).toBeInTheDocument();
    expect(screen.queryByText('uploader')).not.toBeInTheDocument();
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(ctx.cancelActiveJob).toHaveBeenCalledTimes(1);
  });

  it('says the upload is waiting while the job is queued', () => {
    withContext({ activeJob: createQueuedJob() });
    render(<UploadSection />);
    expect(screen.getByText('Upload received, waiting to start…')).toBeInTheDocument();
  });

  it('shows the cancel error when canceling fails', async () => {
    withContext({
      activeJob: createRunningJob(),
      cancelActiveJob: jest.fn().mockRejectedValue(new Error('Failed to cancel job')),
    });
    render(<UploadSection />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(await screen.findByText('Failed to cancel job')).toBeInTheDocument();
  });

  it('offers Try again when polling gave up', async () => {
    const ctx = withContext({ activeJob: createRunningJob(), pollError: new Error('Network error') });
    render(<UploadSection />);

    expect(screen.getByText('Lost connection to the status check')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(ctx.retryPolling).toHaveBeenCalledTimes(1);
  });

  it('keeps the uploader on screen once the job is complete', () => {
    withContext({ activeJob: createSucceededJob() });
    render(<UploadSection />);

    expect(screen.getByText('uploader')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
  });
});
