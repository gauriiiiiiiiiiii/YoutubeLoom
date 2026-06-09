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

  const formatBytes = (b: number) => {
    if (b === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  };

  const statusConfig = {
    uploading:   { label: 'Uploading to YouTube…', color: 'text-blue-400'  },
    processing:  { label: 'YouTube is processing…', color: 'text-yellow-400' },
    complete:    { label: 'Upload complete!',         color: 'text-green-400' },
    error:       { label: 'Upload failed',            color: 'text-red-400'  },
  };

  const { label, color } = statusConfig[progress.status];

  return (
    <div className="rounded-2xl bg-[#161616] border border-white/[0.06] p-6 space-y-4">

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.status === 'uploading' && (
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          )}
          {progress.status === 'processing' && (
            <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          )}
          {progress.status === 'complete' && (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {progress.status === 'error' && (
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={`text-sm font-medium ${color}`}>{label}</span>
        </div>

        {progress.status === 'uploading' && (
          <span className="text-xs font-mono text-neutral-400">{progress.percentage}%</span>
        )}
      </div>

      {/* Progress bar */}
      {(progress.status === 'uploading' || progress.status === 'processing') && (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress.status === 'processing'
                ? 'w-full bg-yellow-500 animate-pulse'
                : 'progress-shimmer'
            }`}
            style={progress.status === 'uploading' ? { width: `${progress.percentage}%` } : undefined}
          />
        </div>
      )}

      {/* Bytes info */}
      {progress.status === 'uploading' && (
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{formatBytes(progress.bytesUploaded)} uploaded</span>
          <span>{formatBytes(progress.totalBytes - progress.bytesUploaded)} remaining</span>
        </div>
      )}

      {/* Success state */}
      {progress.status === 'complete' && youtubeUrl && (
        <div className="space-y-3 pt-1">
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-400 font-mono truncate">
            {youtubeUrl}
          </div>
          <div className="flex gap-3">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              View on YouTube
            </a>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {progress.status === 'error' && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {progress.error || 'An unknown error occurred'}
        </div>
      )}

      {/* Processing hint */}
      {progress.status === 'processing' && (
        <p className="text-xs text-neutral-500">This may take a few minutes…</p>
      )}
    </div>
  );
}
