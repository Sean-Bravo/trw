import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from '@/components/dashboard/FileUploader';
import { JobProvider } from '@/contexts/JobContext';
import * as uploadClient from '@/lib/upload-client';

// Mock the upload-client module
jest.mock('@/lib/upload-client', () => ({
  uploadCSVFile: jest.fn(),
  validateFile: jest.fn(),
  formatFileSize: jest.fn((bytes: number) => `${Math.round(bytes / 1024)} KB`),
}));

// Mock useJobPolling
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(() => ({
    job: null,
    isPolling: false,
    error: null,
  })),
}));

// Mock fetch for refreshJobHistory
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jobs: [] }),
  })
) as jest.Mock;

const mockUploadCSVFile = uploadClient.uploadCSVFile as jest.Mock;
const mockValidateFile = uploadClient.validateFile as jest.Mock;

// Helper to render with providers
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <JobProvider userId="test-user" initialJobs={[]}>
      {ui}
    </JobProvider>
  );
};

// Helper to create a mock CSV file
const createMockCSVFile = (name = 'test.csv', size = 1024) => {
  const content = 'date,type,amount\n2024-01-01,buy,1.5';
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], name, { type: 'text/csv' });
};

describe('FileUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFile.mockReturnValue({ valid: true });
  });

  it('should render dropzone with correct text', () => {
    renderWithProvider(<FileUploader />);

    expect(screen.getByText('Drag and drop your CSV')).toBeInTheDocument();
    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('CSV files only • Max 50MB')).toBeInTheDocument();
  });

  it('should accept dropped CSV file', async () => {
    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });

  it('should show error for invalid file', async () => {
    // Simulate a CSV file that fails validation (e.g., empty or malformed)
    mockValidateFile.mockReturnValue({
      valid: false,
      error: 'File is empty',
    });

    renderWithProvider(<FileUploader />);

    // Use a CSV file that will pass the dropzone accept filter but fail validation
    const file = createMockCSVFile('empty.csv', 0);
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('File is empty')).toBeInTheDocument();
    });
  });

  it('should show upload button after file is selected', async () => {
    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });
  });

  it('should allow removing selected file', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Remove file'));

    await waitFor(() => {
      expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
      expect(screen.getByText('Drag and drop your CSV')).toBeInTheDocument();
    });
  });

  it('should call uploadCSVFile when upload button is clicked', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockResolvedValue({
      jobId: 'job-123',
      status: 'queued',
      jobsRemainingThisHour: 10,
    });

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    expect(mockUploadCSVFile).toHaveBeenCalledWith(file, expect.any(Function));
  });

  it('should show success message after successful upload', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockResolvedValue({
      jobId: 'job-123',
      status: 'queued',
      jobsRemainingThisHour: 10,
    });

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    await waitFor(() => {
      expect(
        screen.getByText('Upload successful! Your file is being processed.')
      ).toBeInTheDocument();
    });
  });

  it('should show error message for rate limit', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockRejectedValue({
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      retryAfter: 3600,
    });

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    await waitFor(() => {
      expect(
        screen.getByText(/Rate limit exceeded.*Please try again in 60 minutes/)
      ).toBeInTheDocument();
    });
  });

  it('should show error message for file too large', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockRejectedValue({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds limit',
    });

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    await waitFor(() => {
      expect(
        screen.getByText('File size exceeds your tier limit. Upgrade for larger files.')
      ).toBeInTheDocument();
    });
  });

  it('should show progress during upload', async () => {
    const user = userEvent.setup();
    let progressCallback: (stage: string, percent: number) => void = () => {};

    mockUploadCSVFile.mockImplementation(
      (file, onProgress) =>
        new Promise((resolve) => {
          progressCallback = onProgress;
          // Simulate progress
          onProgress('requesting', 10);
          setTimeout(() => {
            onProgress('uploading', 50);
            setTimeout(() => {
              onProgress('confirming', 90);
              resolve({
                jobId: 'job-123',
                status: 'queued',
                jobsRemainingThisHour: 10,
              });
            }, 10);
          }, 10);
        })
    );

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('should disable upload button while uploading', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              jobId: 'job-123',
              status: 'queued',
              jobsRemainingThisHour: 10,
            });
          }, 100);
        })
    );

    renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = screen.getByText('Drag and drop your CSV').closest('div');

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload & Process')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload & Process'));

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Processing/i });
      expect(button).toBeDisabled();
    });
  });
});
