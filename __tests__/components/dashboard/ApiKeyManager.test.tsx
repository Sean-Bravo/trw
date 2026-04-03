/**
 * Tests for ApiKeyManager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Key: () => <span data-testid="key-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  X: () => <span data-testid="x-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  AlertCircle: () => <span data-testid="alert-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
}));

// Mock ConfirmDialog
jest.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

const mockKeys = [
  {
    id: 'key-1',
    name: 'Production',
    keyPrefix: 'tf_live_abc12345...',
    tier: 'starter',
    isActive: true,
    rateLimitRpm: 30,
    monthlyQuota: 100,
    lastUsedAt: '2026-03-17T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'key-2',
    name: 'Testing',
    keyPrefix: 'tf_live_def67890...',
    tier: 'free',
    isActive: false,
    rateLimitRpm: 10,
    monthlyQuota: 10,
    lastUsedAt: null,
    createdAt: '2026-03-02T00:00:00Z',
  },
];

const mockUsage = [
  {
    keyId: 'key-1',
    keyName: 'Production',
    tier: 'starter',
    monthlyQuota: 100,
    currentMonth: { fileCount: 42, requestCount: 100 },
  },
];

function mockFetchResponses(
  keysResponse = mockKeys,
  usageResponse = mockUsage
) {
  (global.fetch as jest.Mock) = jest.fn((url: string) => {
    if (url.includes('/api/developer/keys')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ keys: keysResponse }),
      });
    }
    if (url.includes('/api/developer/usage')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ usage: usageResponse }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(navigator, {
    clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

describe('ApiKeyManager', () => {
  describe('Rendering', () => {
    it('shows loading state initially', () => {
      (global.fetch as jest.Mock) = jest.fn(() => new Promise(() => {})); // never resolves
      render(<ApiKeyManager />);
      expect(screen.getByText(/Loading API keys/i)).toBeInTheDocument();
    });

    it('renders Create API Key section after load', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText('Create API Key')).toBeInTheDocument();
      });
    });

    it('renders Your API Keys heading', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText('Your API Keys')).toBeInTheDocument();
      });
    });
  });

  describe('Key List', () => {
    it('displays keys with name, prefix, and tier', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.getByText('tf_live_abc12345...')).toBeInTheDocument();
        expect(screen.getByText('starter')).toBeInTheDocument();
      });
    });

    it('shows empty state when no keys', async () => {
      mockFetchResponses([], []);
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText(/No API keys yet/i)).toBeInTheDocument();
      });
    });

    it('shows Revoked badge for inactive keys', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });
  });

  describe('Create Flow', () => {
    it('creates key on button click', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => screen.getByText('Create API Key'));

      const input = screen.getByPlaceholderText(/Key name/i);
      fireEvent.change(input, { target: { value: 'New Key' } });

      // Mock the POST response
      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
        if (opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'key-3',
                key: 'tf_live_newkey123',
                keyPrefix: 'tf_live_newkey12...',
              }),
          });
        }
        // Refetch after create
        if (url.includes('/api/developer/keys')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ keys: mockKeys }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ usage: mockUsage }),
        });
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('tf_live_newkey123')).toBeInTheDocument();
      });
    });

    it('disables create button when name is empty', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => screen.getByText('Create API Key'));

      const button = screen.getByText('Create');
      expect(button).toBeDisabled();
    });

    it('shows error on create failure', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => screen.getByText('Create API Key'));

      const input = screen.getByPlaceholderText(/Key name/i);
      fireEvent.change(input, { target: { value: 'Fail Key' } });

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
        if (opts?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Maximum of 5 active API keys allowed' }),
          });
        }
        if (url.includes('/api/developer/keys')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ keys: mockKeys }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ usage: mockUsage }) });
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText(/Maximum of 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Revoke', () => {
    it('calls DELETE endpoint on revoke button click', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => screen.getByText('Production'));

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
        if (opts?.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/developer/keys')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ keys: [] }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ usage: [] }) });
      });

      // Find the revoke button (only active keys have one)
      const revokeButtons = screen.getAllByTitle('Revoke key');
      fireEvent.click(revokeButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/developer/keys/key-1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Copy', () => {
    it('copies key to clipboard', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => screen.getByText('Create API Key'));

      const input = screen.getByPlaceholderText(/Key name/i);
      fireEvent.change(input, { target: { value: 'Copy Test' } });

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
        if (opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ key: 'tf_live_copytest' }),
          });
        }
        if (url.includes('/api/developer/keys')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ keys: mockKeys }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ usage: mockUsage }) });
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('tf_live_copytest')).toBeInTheDocument();
      });

      // Find and click the copy button (near the created key banner)
      const copyIcon = screen.getByTestId('copy-icon');
      fireEvent.click(copyIcon.closest('button')!);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('tf_live_copytest');
    });
  });

  describe('Usage Display', () => {
    it('shows usage stats for keys', async () => {
      mockFetchResponses();
      render(<ApiKeyManager />);
      await waitFor(() => {
        expect(screen.getByText(/42 \/ 100 files this month/i)).toBeInTheDocument();
      });
    });
  });
});
