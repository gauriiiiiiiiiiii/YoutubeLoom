import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/Toaster';
import UploadProgress from '@/components/UploadProgress';
import type { UploadProgress as UploadProgressType } from '@/lib/youtube-upload';

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const uploading: UploadProgressType = {
  status: 'uploading',
  bytesUploaded: 2 * 1024 * 1024,
  totalBytes: 10 * 1024 * 1024,
  percentage: 20,
};

const processing: UploadProgressType = {
  status: 'processing',
  bytesUploaded: 10 * 1024 * 1024,
  totalBytes: 10 * 1024 * 1024,
  percentage: 100,
};

const complete: UploadProgressType = {
  status: 'complete',
  bytesUploaded: 10 * 1024 * 1024,
  totalBytes: 10 * 1024 * 1024,
  percentage: 100,
};

const error: UploadProgressType = {
  status: 'error',
  bytesUploaded: 0,
  totalBytes: 10 * 1024 * 1024,
  percentage: 0,
  error: 'Network error',
};

describe('UploadProgress', () => {
  it('shows uploading label and percentage', () => {
    renderWithToast(<UploadProgress progress={uploading} />);
    expect(screen.getByText(/Uploading to YouTube/)).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('shows processing label', () => {
    renderWithToast(<UploadProgress progress={processing} />);
    expect(screen.getByText(/YouTube is processing/)).toBeInTheDocument();
    expect(screen.getByText(/This may take a few minutes/)).toBeInTheDocument();
  });

  it('shows complete state with YouTube URL', () => {
    renderWithToast(
      <UploadProgress progress={complete} youtubeUrl="https://www.youtube.com/watch?v=abc" />
    );
    expect(screen.getByText('Upload complete!')).toBeInTheDocument();
    expect(screen.getByText('https://www.youtube.com/watch?v=abc')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View on YouTube/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc'
    );
  });

  it('shows copy link button in complete state', () => {
    renderWithToast(
      <UploadProgress progress={complete} youtubeUrl="https://www.youtube.com/watch?v=abc" />
    );
    expect(screen.getByRole('button', { name: /Copy Link/ })).toBeInTheDocument();
  });

  it('shows error message', () => {
    renderWithToast(<UploadProgress progress={error} />);
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows bytes info during upload', () => {
    renderWithToast(<UploadProgress progress={uploading} />);
    expect(screen.getByText(/2\.0 MB uploaded/)).toBeInTheDocument();
    expect(screen.getByText(/8\.0 MB remaining/)).toBeInTheDocument();
  });
});
