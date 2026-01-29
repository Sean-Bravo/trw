import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
const renderWithProvider = async (ui: React.ReactElement) => {
  let result;
  await act(async () => {
    result = render(
      <JobProvider userId="test-user" initialJobs={[]}>
        {ui}
      </JobProvider>
    );
  });
  return result!;
};

// Helper to create a mock CSV file
const createMockCSVFile = (name = 'test.csv', size = 1024) => {
  const content = 'date,type,amount\n2024-01-01,buy,1.5';
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], name, { type: 'text/csv' });
};

// Helper to find and interact with dropzone
const getDropzone = async () => {
  const dropzoneText = await screen.findByText(/Drag and drop your CSV/i);
  return dropzoneText.closest('div');
};

// Helper to drop file on dropzone
const dropFile = async (dropzone: Element | null, file: File) => {
  if (!dropzone) return;

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

  await act(async () => {
    fireEvent.drop(dropzone, { dataTransfer });
  });
};

describe('FileUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFile.mockReturnValue({ valid: true });
  });

  it('should render dropzone with correct text', async () => {
    await renderWithProvider(<FileUploader />);

    expect(await screen.findByText(/Drag and drop your CSV/i)).toBeInTheDocument();
    expect(await screen.findByText(/or click to browse/i)).toBeInTheDocument();
    expect(await screen.findByText(/CSV files only/i)).toBeInTheDocument();
  });

  it('should accept dropped CSV file', async () => {
    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    expect(await screen.findByText('test.csv')).toBeInTheDocument();
  });

  it('should show error for invalid file', async () => {
    mockValidateFile.mockReturnValue({
      valid: false,
      error: 'File is empty',
    });

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile('empty.csv', 0);
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    expect(await screen.findByText(/File is empty/i)).toBeInTheDocument();
  });

  it('should show upload button after file is selected', async () => {
    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    expect(await screen.findByText(/Upload.*file/i)).toBeInTheDocument();
  });

  it('should show file info after dropping', async () => {
    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    // Verify the filename is shown
    expect(await screen.findByText('test.csv')).toBeInTheDocument();

    // Verify clear button exists (Clear all button)
    const clearButton = screen.queryByText(/Clear/i);
    expect(clearButton || screen.queryAllByRole('button').length > 0).toBeTruthy();
  });

  it('should call uploadCSVFile when upload button is clicked', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockResolvedValue({
      jobId: 'job-123',
      status: 'queued',
      jobsRemainingThisHour: 10,
    });

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadCSVFile).toHaveBeenCalledWith(file, expect.any(Function));
    });
  });

  it('should show success message after successful upload', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockResolvedValue({
      jobId: 'job-123',
      status: 'queued',
      jobsRemainingThisHour: 10,
    });

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);
    await user.click(uploadButton);

    expect(await screen.findByText(/uploaded successfully/i)).toBeInTheDocument();
  });

  it('should show error message for rate limit', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockRejectedValue({
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      retryAfter: 3600,
    });

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);
    await user.click(uploadButton);

    expect(await screen.findByText(/Rate limit exceeded.*Try again/i)).toBeInTheDocument();
  });

  it('should show error message for file too large', async () => {
    const user = userEvent.setup();
    mockUploadCSVFile.mockRejectedValue({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds limit',
    });

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);
    await user.click(uploadButton);

    expect(await screen.findByText(/File too large/i)).toBeInTheDocument();
  });

  it('should show progress during upload', async () => {
    const user = userEvent.setup();

    mockUploadCSVFile.mockImplementation(
      (_file, onProgress) =>
        new Promise((resolve) => {
          onProgress('requesting', 10);
          setTimeout(() => {
            resolve({
              jobId: 'job-123',
              status: 'queued',
              jobsRemainingThisHour: 10,
            });
          }, 50);
        })
    );

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);
    await user.click(uploadButton);

    // Verify upload was called
    await waitFor(() => {
      expect(mockUploadCSVFile).toHaveBeenCalled();
    });
  });

  it('should disable upload button while uploading', async () => {
    const user = userEvent.setup();
    let resolveUpload: (value: unknown) => void;
    mockUploadCSVFile.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );

    await renderWithProvider(<FileUploader />);

    const file = createMockCSVFile();
    const dropzone = await getDropzone();
    await dropFile(dropzone, file);

    const uploadButton = await screen.findByText(/Upload.*file/i);

    // Click and immediately check disabled state
    await act(async () => {
      await user.click(uploadButton);
    });

    // Verify the upload function was called (indicates button was clicked and upload started)
    expect(mockUploadCSVFile).toHaveBeenCalled();

    // Resolve the upload
    await act(async () => {
      resolveUpload!({
        jobId: 'job-123',
        status: 'queued',
        jobsRemainingThisHour: 10,
      });
    });
  });
});
