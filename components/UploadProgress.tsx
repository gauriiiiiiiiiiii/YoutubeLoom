'use client';

import { useState } from 'react';
import { type UploadProgress as UploadProgressType } from '@/lib/youtube-upload';

interface UploadProgressProps {
  progress: UploadProgressType;
  youtubeUrl?: string;
}

export default function UploadProgress({ progress, youtubeUrl }: UploadProgressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!youtubeUrl) return;
    navigator.clipboard.writeText(youtubeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 space-y-4 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {progress.status === 'uploading' && 'Uploading to YouTube...'}
          {progress.status === 'processing' && 'Processing...'}
          {progress.status === 'complete' && 'Upload Complete!'}
          {progress.status === 'error' && 'Upload Failed'}
        </h3>

        {progress.status === 'uploading' && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {progress.percentage}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {(progress.status === 'uploading' || progress.status === 'processing') && (
        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progress.status === 'processing'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-blue-600'
            }`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}

      {/* Upload Stats */}
      {progress.status === 'uploading' && (
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
          </span>
          <span>{formatBytes(progress.totalBytes - progress.bytesUploaded)} remaining</span>
        </div>
      )}

      {/* Success State */}
      {progress.status === 'complete' && youtubeUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-semibold">Your video is now on YouTube!</span>
          </div>

          <div className="flex gap-3">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-center transition-colors"
            >
              View on YouTube
            </a>

            <button
              onClick={handleCopy}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {progress.status === 'error' && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          <p className="font-semibold">Upload Error</p>
          <p className="text-sm">{progress.error || 'An unknown error occurred'}</p>
        </div>
      )}

      {/* Processing State */}
      {progress.status === 'processing' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          YouTube is processing your video. This may take a few minutes...
        </p>
      )}
    </div>
  );
}
