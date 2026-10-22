import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadSection } from '@/components/dashboard/UploadSection';
import { useJobContext } from '@/contexts/JobContext';
import { createRunningJob, createSucceededJob } from '../factories/jobs';

jest.mock('@/contexts/JobContext', () => ({ useJobContext: jest.fn() }));
jest.mock('@/components/dashboard/FileUploader', () => ({ FileUploader: () => <div>uploader</div> }));
jest.mock('@/components/dashboard/BankPDFUploader', () => ({ BankPDFUploader: () => <div>bank</div> }));
jest.mock('@/components/dashboard/AnalysisAnimation', () => ({
  AnalysisAnimation: ({ statusText }: { statusText: string }) => <div>{statusText}</div>,
}));

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

  it('offers Cancel while a job is running and calls cancelActiveJob', async () => {
    const ctx = withContext({ activeJob: createRunningJob() });
    render(<UploadSection />);

    expect(screen.getByText('AI Analysis Running...')).toBeInTheDocument();
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(ctx.cancelActiveJob).toHaveBeenCalledTimes(1);
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

  it('does not offer Cancel once the job is complete', () => {
    withContext({ activeJob: createSucceededJob() });
    render(<UploadSection />);

    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Upload Another File')).toBeInTheDocument();
  });
});
