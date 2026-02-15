import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadLandingPage from '@/app/upload/page';
import * as bankUploadClient from '@/lib/bank-upload-client';
import * as analytics from '@/lib/analytics';

// Mock bank-upload-client
jest.mock('@/lib/bank-upload-client', () => ({
  uploadBankStatement: jest.fn(),
  validateBankFile: jest.fn(),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackConversion: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

const mockUploadBankStatement = bankUploadClient.uploadBankStatement as jest.Mock;
const mockValidateBankFile = bankUploadClient.validateBankFile as jest.Mock;
const mockTrackConversion = analytics.trackConversion as jest.Mock;

// Helper to create a mock PDF file
const createMockPDFFile = (name = 'statement.pdf', size = 2048) => {
  const content = '%PDF-1.4 mock content';
  const blob = new Blob([content], { type: 'application/pdf' });
  return new File([blob], name, { type: 'application/pdf' });
};

// Helper to simulate file drop on the upload zone
const dropFileOnZone = async (file: File) => {
  const dropzone = screen.getByText('Drop your bank statement PDF here').closest('div[class*="border-dashed"]')!;
  const dataTransfer = {
    files: [file],
    items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
    types: ['Files'],
  };

  await act(async () => {
    fireEvent.drop(dropzone, { dataTransfer });
  });
};

// Helper to select file via the hidden input
const selectFileViaInput = async (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

// Helper to mock window.location.search for UTM param tests.
let mockSearchParams: Record<string, string> = {};
const OriginalURLSearchParams = URLSearchParams;

beforeAll(() => {
  global.URLSearchParams = class extends OriginalURLSearchParams {
    constructor(_init?: any) {
      super('');
      this.get = (key: string) => mockSearchParams[key] ?? null;
    }
  } as typeof URLSearchParams;
});

afterAll(() => {
  global.URLSearchParams = OriginalURLSearchParams;
});

describe('UploadLandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateBankFile.mockReturnValue({ valid: true });
    mockSearchParams = {};
  });

  // =========================================================================
  // RENDERING — Static content
  // =========================================================================
  describe('Rendering', () => {
    it('renders the hero heading', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText(/Upload your bank statement/)).toBeInTheDocument();
      expect(screen.getByText(/clean CSV/)).toBeInTheDocument();
    });

    it('renders the pain badge', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText(/PROBLEM: Can't import your bank statement/)).toBeInTheDocument();
    });

    it('renders the beta bar', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Free Beta')).toBeInTheDocument();
    });

    it('renders the upload dropzone in idle state', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
      expect(screen.getByText(/browse files/)).toBeInTheDocument();
      expect(screen.getByText(/\.pdf up to 50MB/)).toBeInTheDocument();
    });

    it('renders trust signals in header', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Files deleted after 24hrs')).toBeInTheDocument();
      expect(screen.getAllByText('No signup required').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the TaxFormatter logo', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('TaxFormatter')).toBeInTheDocument();
    });

    it('renders the bottom CTA button', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Convert My Statement for Free')).toBeInTheDocument();
    });

    it('renders bottom trust signals', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Free during beta')).toBeInTheDocument();
      expect(screen.getByText('Files auto-deleted in 24hrs')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // PAIN POINT SHOWCASE
  // =========================================================================
  describe('Pain Point Showcase', () => {
    it('renders the section heading', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText(/Sound familiar\? We can help/)).toBeInTheDocument();
    });

    it('renders all three pain point cards', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText(/couldn't read your bank statement PDF/)).toBeInTheDocument();
      expect(screen.getByText(/Import failed — unexpected file format/)).toBeInTheDocument();
      expect(screen.getByText(/Unable to extract transactions from PDF/)).toBeInTheDocument();
    });

    it('renders pain point source labels', () => {
      render(<UploadLandingPage />);
      expect(screen.getAllByText('QuickBooks').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Xero').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Excel').length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // FEATURES — Feature grid
  // =========================================================================
  describe('Features', () => {
    it('renders all three feature cards', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Auto-detects your bank')).toBeInTheDocument();
      expect(screen.getByText('Extracts every transaction')).toBeInTheDocument();
      expect(screen.getByText('Exports to your format')).toBeInTheDocument();
    });

    it('renders feature descriptions', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText(/We detect if it's Chase/)).toBeInTheDocument();
      expect(screen.getByText(/Dates, descriptions, amounts/)).toBeInTheDocument();
      expect(screen.getByText(/Get a clean file formatted/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // BANKS & OUTPUT FORMATS
  // =========================================================================
  describe('Banks & Output Formats', () => {
    it('renders supported banks heading', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Supported banks')).toBeInTheDocument();
    });

    it('renders all 11 bank tags', () => {
      render(<UploadLandingPage />);
      const banks = ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'US Bank', 'PNC', 'TD Bank', 'Regions', 'HSBC', 'BMO'];
      banks.forEach((name) => {
        expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders all 4 output format badges', () => {
      render(<UploadLandingPage />);
      expect(screen.getByText('Converts to')).toBeInTheDocument();
      ['CSV', 'QuickBooks (QBO)', 'Xero', 'Excel'].forEach((name) => {
        expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // =========================================================================
  // FOOTER
  // =========================================================================
  describe('Footer', () => {
    it('renders copyright with current year', () => {
      render(<UploadLandingPage />);
      const year = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${year} TaxFormatter`))).toBeInTheDocument();
    });

    it('renders footer links', () => {
      render(<UploadLandingPage />);
      expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security');
      expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
      expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy-policy');
      expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    });
  });

  // =========================================================================
  // FILE UPLOAD — Drag & Drop
  // =========================================================================
  describe('File Upload — Drag & Drop', () => {
    it('accepts a dropped PDF file and starts upload', async () => {
      mockUploadBankStatement.mockResolvedValue({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      render(<UploadLandingPage />);

      const file = createMockPDFFile();
      await dropFileOnZone(file);

      await waitFor(() => {
        expect(mockUploadBankStatement).toHaveBeenCalledWith(file, 'excel', expect.any(Function));
      });
    });

    it('applies drag-over visual state', () => {
      render(<UploadLandingPage />);
      const dropzone = screen.getByText('Drop your bank statement PDF here').closest('div[class*="border-dashed"]')!;

      fireEvent.dragOver(dropzone, { preventDefault: jest.fn() });
      fireEvent.dragLeave(dropzone);
    });
  });

  // =========================================================================
  // FILE UPLOAD — File Input
  // =========================================================================
  describe('File Upload — File Input', () => {
    it('accepts a file selected via the file input', async () => {
      mockUploadBankStatement.mockResolvedValue({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      render(<UploadLandingPage />);

      const file = createMockPDFFile();
      await selectFileViaInput(file);

      await waitFor(() => {
        expect(mockUploadBankStatement).toHaveBeenCalledWith(file, 'excel', expect.any(Function));
      });
    });

    it('renders hidden file input with pdf accept attribute', () => {
      render(<UploadLandingPage />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('accept', '.pdf');
      expect(input).toHaveClass('hidden');
    });
  });

  // =========================================================================
  // FILE VALIDATION
  // =========================================================================
  describe('File Validation', () => {
    it('shows error state when validateBankFile rejects the file', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'Only PDF files are supported' });
      render(<UploadLandingPage />);

      const file = createMockPDFFile('data.xlsx', 1024);
      await selectFileViaInput(file);

      expect(await screen.findByText('Upload failed')).toBeInTheDocument();
      expect(await screen.findByText('Only PDF files are supported')).toBeInTheDocument();
    });

    it('shows error for empty file', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'File is empty' });
      render(<UploadLandingPage />);

      const file = createMockPDFFile('empty.pdf', 0);
      await selectFileViaInput(file);

      expect(await screen.findByText('File is empty')).toBeInTheDocument();
    });

    it('shows error for oversized file', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'File size exceeds 50MB limit' });
      render(<UploadLandingPage />);

      const file = createMockPDFFile('huge.pdf', 60 * 1024 * 1024);
      await selectFileViaInput(file);

      expect(await screen.findByText(/File size exceeds 50MB limit/)).toBeInTheDocument();
    });

    it('does not call uploadBankStatement when validation fails', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'Invalid file' });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(mockUploadBankStatement).not.toHaveBeenCalled();
    });

    it('shows fallback error when validation error is undefined', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Invalid file')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // UPLOAD PROGRESS
  // =========================================================================
  describe('Upload Progress', () => {
    it('shows processing state during upload', async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadBankStatement.mockImplementation((_file: File, _format: string, onProgress: Function) => {
        onProgress('requesting', 10);
        return new Promise((resolve) => { resolveUpload = resolve; });
      });

      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Processing your file...')).toBeInTheDocument();
      expect(await screen.findByText('Detecting bank format...')).toBeInTheDocument();

      await act(async () => {
        resolveUpload!({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      });
    });

    it('updates progress label for uploading stage', async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadBankStatement.mockImplementation((_file: File, _format: string, onProgress: Function) => {
        onProgress('uploading', 50);
        return new Promise((resolve) => { resolveUpload = resolve; });
      });

      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Uploading your statement...')).toBeInTheDocument();

      await act(async () => {
        resolveUpload!({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      });
    });

    it('updates progress label for processing stage', async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadBankStatement.mockImplementation((_file: File, _format: string, onProgress: Function) => {
        onProgress('processing', 70);
        return new Promise((resolve) => { resolveUpload = resolve; });
      });

      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Extracting transactions...')).toBeInTheDocument();

      await act(async () => {
        resolveUpload!({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      });
    });

    it('shows "Complete!" when processing at 100%', async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadBankStatement.mockImplementation((_file: File, _format: string, onProgress: Function) => {
        onProgress('processing', 100);
        return new Promise((resolve) => { resolveUpload = resolve; });
      });

      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Complete!')).toBeInTheDocument();

      await act(async () => {
        resolveUpload!({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      });
    });
  });

  // =========================================================================
  // UPLOAD SUCCESS
  // =========================================================================
  describe('Upload Success', () => {
    it('shows transaction count and detected bank after upload completes', async () => {
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: 'Chase',
        transactionCount: 42,
        downloadUrl: 'https://s3.example.com/result.csv',
      });
      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('42 transactions extracted!')).toBeInTheDocument();
      expect(await screen.findByText('Detected: Chase')).toBeInTheDocument();
      expect(await screen.findByText(/Your file is ready/)).toBeInTheDocument();
    });

    it('shows fallback heading when transactionCount is missing', async () => {
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: null,
        transactionCount: null,
        downloadUrl: 'https://s3.example.com/result.csv',
      });
      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Statement converted!')).toBeInTheDocument();
    });

    it('shows "Download CSV" button when downloadUrl is returned', async () => {
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: 'Chase',
        transactionCount: 42,
        downloadUrl: 'https://s3.example.com/result.csv',
      });
      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      const downloadLink = await screen.findByText('Download CSV');
      expect(downloadLink.closest('a')).toHaveAttribute('href', 'https://s3.example.com/result.csv');
      expect(downloadLink.closest('a')).toHaveAttribute('download');
    });

    it('shows "Create Free Account" fallback when no downloadUrl', async () => {
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: 'Chase',
        transactionCount: 42,
      });
      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      const signupLink = await screen.findByText('Create Free Account');
      expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('shows "Upload another file" button that resets to idle', async () => {
      const user = userEvent.setup();
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: 'Chase',
        transactionCount: 42,
        downloadUrl: 'https://s3.example.com/result.csv',
      });
      render(<UploadLandingPage />);
      await selectFileViaInput(createMockPDFFile());

      const resetButton = await screen.findByText('Upload another file');
      await user.click(resetButton);

      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // UPLOAD ERRORS
  // =========================================================================
  describe('Upload Errors', () => {
    it('shows error with message from upload failure', async () => {
      mockUploadBankStatement.mockRejectedValue({ message: 'Rate limit exceeded. Please try again later.' });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Upload failed')).toBeInTheDocument();
      expect(await screen.findByText('Rate limit exceeded. Please try again later.')).toBeInTheDocument();
    });

    it('shows generic error when rejection has no message', async () => {
      mockUploadBankStatement.mockRejectedValue('something broke');
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument();
    });

    it('shows error when rejection is null', async () => {
      mockUploadBankStatement.mockRejectedValue(null);
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument();
    });

    it('shows "Try again" button that resets to idle', async () => {
      const user = userEvent.setup();
      mockUploadBankStatement.mockRejectedValue({ message: 'Network error' });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      const tryAgainButton = await screen.findByText('Try again');
      await user.click(tryAgainButton);

      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
    });

    it('handles network error from uploadBankStatement', async () => {
      mockUploadBankStatement.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network error during upload',
      });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Network error during upload')).toBeInTheDocument();
    });

    it('handles server error from uploadBankStatement', async () => {
      mockUploadBankStatement.mockRejectedValue({
        code: 'SERVER_ERROR',
        message: 'Failed to request upload URL',
      });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(await screen.findByText('Failed to request upload URL')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // CONVERSION TRACKING — Google Ads
  // =========================================================================
  describe('Conversion Tracking', () => {
    it('tracks landing_page_view when UTM source is present', () => {
      mockSearchParams = { utm_source: 'google', utm_medium: 'cpc' };

      render(<UploadLandingPage />);

      expect(mockTrackConversion).toHaveBeenCalledWith('landing_page_view');
    });

    it('does not track landing_page_view without UTM source', () => {
      mockSearchParams = {};

      render(<UploadLandingPage />);

      expect(mockTrackConversion).not.toHaveBeenCalledWith('landing_page_view');
    });

    it('tracks bank_upload_started when a valid file begins uploading', async () => {
      mockUploadBankStatement.mockResolvedValue({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(mockTrackConversion).toHaveBeenCalledWith('bank_upload_started');
    });

    it('tracks bank_upload_completed after successful upload', async () => {
      mockUploadBankStatement.mockResolvedValue({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      await waitFor(() => {
        expect(mockTrackConversion).toHaveBeenCalledWith('bank_upload_completed');
      });
    });

    it('does not track bank_upload_completed on upload failure', async () => {
      mockUploadBankStatement.mockRejectedValue({ message: 'Error' });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });

      expect(mockTrackConversion).not.toHaveBeenCalledWith('bank_upload_completed');
    });

    it('does not track bank_upload_started when validation fails', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'Invalid' });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      expect(mockTrackConversion).not.toHaveBeenCalledWith('bank_upload_started');
    });

    it('fires events in correct order: started then completed', async () => {
      mockUploadBankStatement.mockResolvedValue({ success: true, detectedBank: 'Chase', transactionCount: 42 });
      render(<UploadLandingPage />);

      await selectFileViaInput(createMockPDFFile());

      await waitFor(() => {
        expect(mockTrackConversion).toHaveBeenCalledWith('bank_upload_completed');
      });

      const calls = mockTrackConversion.mock.calls.map((c: string[]) => c[0]);
      const startIdx = calls.indexOf('bank_upload_started');
      const completeIdx = calls.indexOf('bank_upload_completed');
      expect(startIdx).toBeLessThan(completeIdx);
    });
  });

  // =========================================================================
  // BOTTOM CTA — Triggers file input
  // =========================================================================
  describe('Bottom CTA', () => {
    it('clicking bottom CTA triggers file input click', async () => {
      const user = userEvent.setup();
      render(<UploadLandingPage />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click');

      const ctaButton = screen.getByText('Convert My Statement for Free');
      await user.click(ctaButton);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  // =========================================================================
  // RESET FLOW — Full cycle
  // =========================================================================
  describe('Reset Flow', () => {
    it('completes full cycle: idle → upload → success → reset → idle', async () => {
      const user = userEvent.setup();
      mockUploadBankStatement.mockResolvedValue({
        success: true,
        detectedBank: 'Chase',
        transactionCount: 42,
        downloadUrl: 'https://s3.example.com/result.csv',
      });

      render(<UploadLandingPage />);

      // Idle state
      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();

      // Trigger upload
      await selectFileViaInput(createMockPDFFile());

      // Success state
      expect(await screen.findByText('42 transactions extracted!')).toBeInTheDocument();

      // Reset
      const resetButton = screen.getByText('Upload another file');
      await user.click(resetButton);

      // Back to idle
      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
    });

    it('completes full cycle: idle → upload → error → try again → idle', async () => {
      const user = userEvent.setup();
      mockUploadBankStatement.mockRejectedValue({ message: 'Something went wrong' });

      render(<UploadLandingPage />);

      // Trigger upload
      await selectFileViaInput(createMockPDFFile());

      // Error state
      expect(await screen.findByText('Upload failed')).toBeInTheDocument();

      // Reset
      const tryAgainButton = screen.getByText('Try again');
      await user.click(tryAgainButton);

      // Back to idle
      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
    });
  });
});
