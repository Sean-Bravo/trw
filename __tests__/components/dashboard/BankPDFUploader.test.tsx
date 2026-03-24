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
});
