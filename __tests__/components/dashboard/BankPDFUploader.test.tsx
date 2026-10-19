/**
 * Tests for BankPDFUploader component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BankPDFUploader } from '@/components/dashboard/BankPDFUploader';
import { JobProvider } from '@/contexts/JobContext';

// Mock useJobPolling
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(() => ({
    job: null,
    isPolling: false,
    error: null,
  })),
}));

// Mock fetch
const originalFetch = global.fetch;

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <JobProvider userId="test-user" initialJobs={[]}>
      {ui}
    </JobProvider>
  );
};

describe('BankPDFUploader', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobs: [] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders format selector (QBO, Xero, Excel)', () => {
    renderWithProvider(<BankPDFUploader />);
    expect(screen.getByText('QuickBooks Online')).toBeInTheDocument();
    expect(screen.getByText('Xero')).toBeInTheDocument();
    expect(screen.getByText('Excel/CSV')).toBeInTheDocument();
  });

  it('shows drop zone for PDF files', () => {
    renderWithProvider(<BankPDFUploader />);
    expect(screen.getByText(/Drop your bank statement PDF/i)).toBeInTheDocument();
  });

  it('accepts only PDF (dropzone accept config)', () => {
    renderWithProvider(<BankPDFUploader />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input?.getAttribute('accept')?.includes('application/pdf') || input?.getAttribute('accept')?.includes('.pdf')).toBe(true);
  });

  it('shows Process Bank Statement when file selected via input change', async () => {
    renderWithProvider(<BankPDFUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'stmt.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Process Bank Statement/i)).toBeInTheDocument());
  });

  it('downloads the result by fetching it into a blob, not by opening a new tab', async () => {
    // Opening the presigned S3 URL in a new tab after an await is blocked as
    // a popup, so the button did nothing. The file must be fetched and saved.
    const fileBlob = new Blob(['Date,Description,Amount\n'], { type: 'text/csv' });
    global.fetch = jest.fn((url: string) => {
      const json = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      if (url === '/api/bank/presigned-url') return json({ uploadUrl: 'https://s3.test/upload', jobId: 'job-1', key: 'bank/job-1/x.pdf' });
      if (url === 'https://s3.test/upload') return json({});
      if (url === '/api/bank/process') return json({ success: true, transactionCount: 16, detectedBank: 'Unknown Bank' });
      if (url.startsWith('/api/bank/job/job-1/download')) return json({ downloadUrl: 'https://s3.test/output_qbo.csv' });
      if (url === 'https://s3.test/output_qbo.csv') return Promise.resolve({ ok: true, blob: () => Promise.resolve(fileBlob) });
      return json({ jobs: [] });
    }) as jest.Mock;
    const createObjectURL = jest.fn(() => 'blob:local-file');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: HTMLAnchorElement[] = [];
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    renderWithProvider(<BankPDFUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF'], 'stmt.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByText(/Process Bank Statement/i));
    fireEvent.click(await screen.findByText('Download QBO'));

    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(global.fetch).toHaveBeenCalledWith('https://s3.test/output_qbo.csv');
    expect(createObjectURL).toHaveBeenCalledWith(fileBlob);
    expect(clicked[0].href).toBe('blob:local-file');
    expect(clicked[0].download).toBe('bank_job-1_qbo.csv');
    expect(clicked[0].target).toBe('');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-file');
    clickSpy.mockRestore();
  });
});
