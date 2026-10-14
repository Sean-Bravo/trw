/**
 * /bank-statement-to-csv — the bank funnel's own destination.
 *
 * What this page promises (daily schedule, Oct 12–14): a dedicated route,
 * the upload box above the fold, a headline on the outcome, and no
 * developer language anywhere — no API, keys, code, or model names.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BankStatementLandingPage from '@/app/bank-statement-to-csv/page';
import { metadata } from '@/app/bank-statement-to-csv/layout';
import * as bankUploadClient from '@/lib/bank-upload-client';
import * as analytics from '@/lib/analytics';
import { BETA_BANKS, VERIFIED_BANKS } from '@/lib/bank-registry';
import { STATEMENTS_PER_HOUR_ACCOUNT, STATEMENTS_PER_HOUR_ANON } from '@/lib/bank-allowance';
import { OUTCOMES } from '@/components/upload/BankBeforeAfter';

jest.mock('@/lib/bank-upload-client', () => ({
  uploadBankStatement: jest.fn(),
  validateBankFile: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  trackConversion: jest.fn(),
}));

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

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
const PAGE = 'app/bank-statement-to-csv/page.tsx';
const BOX = 'components/upload/BankUploadBox.tsx';

// Developer vocabulary that must not reach a bank visitor.
const API_LANGUAGE = /\b(API|APIs|curl|base64|SDK|endpoint|developer|webhook|JSON|MCP|rate limit|api key)\b/i;
// Same list the pricing surfaces are held to: which model serves a plan.
const VENDOR_OR_MODEL =
  /\b(Opus|Sonnet|Haiku|GPT-?\d|gemini-\d|Gemini (2\.\d|Flash|Pro|AI)|claude-\d|Claude (Opus|Sonnet|Haiku|\d)|Anthropic|OpenAI)\b/;

let mockSearchParams: Record<string, string> = {};
const OriginalURLSearchParams = URLSearchParams;

beforeAll(() => {
  global.URLSearchParams = class extends OriginalURLSearchParams {
    constructor(_init?: string | URLSearchParams) {
      super('');
      this.get = (key: string) => mockSearchParams[key] ?? null;
    }
  } as typeof URLSearchParams;
});

afterAll(() => {
  global.URLSearchParams = OriginalURLSearchParams;
});

const pdf = (name = 'statement.pdf') =>
  new File([new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })], name, { type: 'application/pdf' });

const selectFile = async (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

describe('BankStatementLandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateBankFile.mockReturnValue({ valid: true });
    mockSearchParams = {};
  });

  describe('dedicated, indexable route', () => {
    it('has its own canonical and is not noindexed', () => {
      expect(metadata.alternates?.canonical).toBe('/bank-statement-to-csv');
      expect(metadata.robots).toBeUndefined();
      expect(String(metadata.title)).toMatch(/bank statement/i);
    });

    it('is listed in the sitemap', () => {
      expect(read('app/sitemap.ts')).toContain('/bank-statement-to-csv');
    });
  });

  describe('headline and fold', () => {
    it('leads with the outcome, not the mechanism', () => {
      render(<BankStatementLandingPage />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(/Your bank statement, as a clean spreadsheet/);
    });

    it('puts the upload box before any supporting section', () => {
      render(<BankStatementLandingPage />);
      const dropzone = screen.getByText('Drop your bank statement PDF here');
      const howItWorks = screen.getByText('How it works');
      // DOCUMENT_POSITION_FOLLOWING: the section comes after the dropzone.
      expect(dropzone.compareDocumentPosition(howItWorks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // And the box is inside the first <main> section after the hero: no
      // feature grid, bank list or pain cards sit between headline and box.
      const main = document.querySelector('main')!;
      const sections = Array.from(main.querySelectorAll(':scope > section'));
      expect(sections[0]).toContainElement(screen.getByRole('heading', { level: 1 }));
      expect(sections[1]).toContainElement(dropzone);
    });

    it('renders the trust line under the box with the retention policy', () => {
      render(<BankStatementLandingPage />);
      expect(screen.getByText(/Free while we're in beta · No account needed · Files deleted within 30 days/)).toBeInTheDocument();
      expect(screen.getByText('Files deleted within 30 days')).toBeInTheDocument();
    });
  });

  describe('before/after example and outcomes', () => {
    it('shows statement → extracted table → spreadsheet, after the box', () => {
      render(<BankStatementLandingPage />);
      expect(screen.getByText('From statement to spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('Your statement PDF')).toBeInTheDocument();
      expect(screen.getByText('Every transaction, found')).toBeInTheDocument();
      expect(screen.getByText('Your spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('Date,Description,Amount,Balance')).toBeInTheDocument();
      // The extracted table is a real table with one row per transaction.
      expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(5);
      const box = screen.getByText('Drop your bank statement PDF here');
      const example = screen.getByText('From statement to spreadsheet');
      expect(box.compareDocumentPosition(example) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('states the three outcomes', () => {
      render(<BankStatementLandingPage />);
      expect(OUTCOMES.map((o) => o.title)).toEqual(['Automatic extraction', 'A clean spreadsheet', 'No manual data entry']);
      OUTCOMES.forEach((o) => expect(screen.getByText(o.title)).toBeInTheDocument());
    });

    it('does not repeat the upload box hint now that the example exists', () => {
      render(<BankStatementLandingPage />);
      expect(screen.queryByText(/What's a bank statement PDF\?/)).not.toBeInTheDocument();
    });
  });

  describe('price and privacy', () => {
    it('states the allowance with the numbers the limiter enforces', () => {
      render(<BankStatementLandingPage />);
      expect(screen.getByText("Free while we're in beta")).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`up to ${STATEMENTS_PER_HOUR_ANON} statements an hour, or ${STATEMENTS_PER_HOUR_ACCOUNT} an hour with a free account`)),
      ).toBeInTheDocument();
    });

    it('allowance constants match lib/rate-limit.ts', () => {
      // The copy is only true while these agree with the enforced limits.
      const src = read('lib/rate-limit.ts');
      const limit = (name: string) => {
        const m = new RegExp(`${name}:\\s*new RateLimiter\\(\\{[^}]*uniqueTokenPerInterval:\\s*(\\d+)`).exec(src);
        if (!m) throw new Error(`limiter ${name} not found`);
        return Number(m[1]);
      };
      expect(limit('fileUploadAnon')).toBe(STATEMENTS_PER_HOUR_ANON);
      expect(limit('fileUpload')).toBe(STATEMENTS_PER_HOUR_ACCOUNT);
    });

    it('states the retention policy in its own words', () => {
      render(<BankStatementLandingPage />);
      expect(screen.getByText('Deleted within 30 days')).toBeInTheDocument();
      expect(screen.getByText(/Everything you send us is deleted within 30 days/)).toBeInTheDocument();
      expect(screen.getByText(/We never train on your data/)).toBeInTheDocument();
    });
  });

  describe('no developer language', () => {
    it('renders no API, code, or model vocabulary', () => {
      const { container } = render(<BankStatementLandingPage />);
      const text = container.textContent ?? '';
      expect(text).not.toMatch(API_LANGUAGE);
      expect(text).not.toMatch(VENDOR_OR_MODEL);
      expect(container.querySelector('pre, code')).toBeNull();
    });

    it('does not pull in the API panel or link to the developer docs', () => {
      const src = read(PAGE);
      expect(src).not.toMatch(/ApiEquivalentPanel/);
      expect(src).not.toMatch(/href="\/docs/);
      expect(src).not.toMatch(/href="\/playground/);
      expect(src).not.toMatch(VENDOR_OR_MODEL);
      // The metadata is what search results and link previews show.
      const visibleMetadata = [
        metadata.title, metadata.description, metadata.openGraph?.title, metadata.openGraph?.description,
      ].map(String).join(' ');
      expect(visibleMetadata).not.toMatch(API_LANGUAGE);
      expect(visibleMetadata).not.toMatch(VENDOR_OR_MODEL);
      expect(read(BOX)).not.toMatch(VENDOR_OR_MODEL);
    });
  });

  describe('banks from the registry', () => {
    it('shows verified banks as supported and beta banks apart, nothing else', () => {
      render(<BankStatementLandingPage />);
      VERIFIED_BANKS.forEach((bank) => {
        expect(screen.getAllByText(bank.name).length).toBeGreaterThanOrEqual(1);
      });
      const testing = screen.getByText(/^In testing:/);
      BETA_BANKS.forEach((bank) => {
        expect(testing).toHaveTextContent(bank.name);
      });
      ['Capital One', 'US Bank', 'PNC', 'TD Bank', 'Regions', 'HSBC', 'BMO'].forEach((name) => {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      });
    });
  });

  describe('upload flow (shared BankUploadBox)', () => {
    it('uploads a selected PDF with the default CSV format and tracks the funnel', async () => {
      mockUploadBankStatement.mockResolvedValue({
        success: true, detectedBank: 'Chase', transactionCount: 42,
        downloadUrl: 'https://s3.example.com/result.csv', jobId: 'job-1',
      });
      render(<BankStatementLandingPage />);
      const file = pdf();
      await selectFile(file);

      await waitFor(() => {
        expect(mockUploadBankStatement).toHaveBeenCalledWith(file, 'csv', expect.any(Function));
      });
      expect(await screen.findByText('42 transactions extracted!')).toBeInTheDocument();
      expect((await screen.findByText('Download CSV')).closest('a')).toHaveAttribute('href', 'https://s3.example.com/result.csv');
      expect(mockTrackConversion).toHaveBeenCalledWith('bank_upload_started');
      expect(mockTrackConversion).toHaveBeenCalledWith('bank_upload_completed');
      // Success state on this page never shows the API panel either.
      expect(document.body.textContent).not.toMatch(API_LANGUAGE);
    });

    it('shows the error state and recovers', async () => {
      const user = userEvent.setup();
      mockUploadBankStatement.mockRejectedValue({ message: 'Network error during upload' });
      render(<BankStatementLandingPage />);
      await selectFile(pdf());

      expect(await screen.findByText('Upload failed')).toBeInTheDocument();
      expect(screen.getByText('Network error during upload')).toBeInTheDocument();
      await user.click(screen.getByText('Try again'));
      expect(screen.getByText('Drop your bank statement PDF here')).toBeInTheDocument();
    });

    it('rejects invalid files without uploading', async () => {
      mockValidateBankFile.mockReturnValue({ valid: false, error: 'Only PDF files are supported' });
      render(<BankStatementLandingPage />);
      await selectFile(pdf('data.xlsx'));
      expect(await screen.findByText('Only PDF files are supported')).toBeInTheDocument();
      expect(mockUploadBankStatement).not.toHaveBeenCalled();
    });

    it('the single CTA opens the file picker', async () => {
      const user = userEvent.setup();
      render(<BankStatementLandingPage />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click');
      await user.click(screen.getByRole('button', { name: /Convert my statement/ }));
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('tracks landing_page_view only when a UTM source is present', () => {
      mockSearchParams = { utm_source: 'google' };
      render(<BankStatementLandingPage />);
      expect(mockTrackConversion).toHaveBeenCalledWith('landing_page_view');
    });
  });
});
