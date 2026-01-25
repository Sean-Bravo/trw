/**
 * Tests for BankPDFUploader component (P1)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BankPDFUploader } from '@/components/dashboard/BankPDFUploader';

const originalFetch = global.fetch;

describe('BankPDFUploader', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders format selector (QBO, Xero, Excel)', () => {
    render(<BankPDFUploader />);
    expect(screen.getByText('QuickBooks Online')).toBeInTheDocument();
    expect(screen.getByText('Xero')).toBeInTheDocument();
    expect(screen.getByText('Excel/CSV')).toBeInTheDocument();
  });

  it('shows drop zone for PDF files', () => {
    render(<BankPDFUploader />);
    expect(screen.getByText(/Drop your bank statement PDF/i)).toBeInTheDocument();
  });

  it('accepts only PDF (dropzone accept config)', () => {
    render(<BankPDFUploader />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input?.getAttribute('accept')?.includes('application/pdf') || input?.getAttribute('accept')?.includes('.pdf')).toBe(true);
  });

  it('shows Process Bank Statement when file selected via input change', async () => {
    render(<BankPDFUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'stmt.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Process Bank Statement/i)).toBeInTheDocument());
  });
});
