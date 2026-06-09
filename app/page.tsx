'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RecordingControls from '@/components/RecordingControls';
import UploadProgress from '@/components/UploadProgress';
import {
  startOAuthFlow,
  getValidAccessToken,
  isAuthenticated,
  clearStoredToken,
} from '@/lib/youtube-auth';
import {
  YouTubeUploader,
  generateDefaultTitle,
  getYouTubeUrl,
  type UploadProgress as UploadProgressType,
} from '@/lib/youtube-upload';
import { useToast } from '@/components/Toaster';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isAuthd, setIsAuthd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState(generateDefaultTitle());
  const [videoDescription, setVideoDescription] = useState('Recorded with YouTube Loom');
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('unlisted');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsAuthd(isAuthenticated());
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success') {
      setIsAuthd(true);
      window.history.replaceState({}, '', '/');
      toast('Connected to YouTube', 'success');
    }
  }, [searchParams, toast]);

  const handleRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
    setDownloadUrl(URL.createObjectURL(blob));
    setVideoTitle(generateDefaultTitle());
    setUploadProgress(null);
    setYoutubeUrl(null);
    setUploadError(null);
  };

  const handleNewRecording = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setVideoBlob(null);
    setDownloadUrl(null);
    setUploadProgress(null);
    setYoutubeUrl(null);
    setUploadError(null);
    setVideoTitle(generateDefaultTitle());
    setVideoDescription('Recorded with YouTube Loom');
    setPrivacyStatus('unlisted');
  };

  const handleUploadToYouTube = async () => {
    if (!videoBlob) return;
    setUploadError(null);
    try {
      setUploading(true);
      setUploadProgress(null);
      setYoutubeUrl(null);
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('Not authenticated. Please connect to YouTube first.');
      const uploader = new YouTubeUploader(accessToken, (progress) => setUploadProgress(progress));
      const videoId = await uploader.upload(videoBlob, {
        title: videoTitle,
        description: videoDescription,
        privacyStatus,
        tags: ['screen recording', 'youtube loom'],
      });
      const url = getYouTubeUrl(videoId);
      setYoutubeUrl(url);
      toast('Video uploaded successfully!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(msg);
      toast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">YouTube Loom</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            Record your screen and upload directly to YouTube
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Screen + Webcam', 'Microphone', 'Direct Upload', 'No limits'].map((f) => (
              <span key={f} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ── YouTube Auth Card ── */}
        <div className="mb-6">
          {isAuthd ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                Connected to YouTube
              </div>
              <button
                onClick={() => { clearStoredToken(); setIsAuthd(false); }}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => startOAuthFlow()}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 font-semibold transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Connect to YouTube
            </button>
          )}
        </div>

        {/* ── Recording Controls ── */}
        {!videoBlob && (
          <div className="rounded-2xl bg-[#161616] border border-white/[0.06] p-6 fade-in">
            <RecordingControls onRecordingComplete={handleRecordingComplete} />
          </div>
        )}

        {/* ── Upload Progress ── */}
        {uploadProgress && (
          <div className="mt-6 fade-in">
            <UploadProgress progress={uploadProgress} youtubeUrl={youtubeUrl || undefined} />
          </div>
        )}

        {/* ── Recording Preview ── */}
        {videoBlob && downloadUrl && !uploading && !uploadProgress && (
          <div className="rounded-2xl bg-[#161616] border border-white/[0.06] p-6 space-y-5 fade-in">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <h2 className="font-semibold text-sm">Recording ready</h2>
              </div>
              <button
                onClick={handleNewRecording}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                ↩ New Recording
              </button>
            </div>

            {/* Video preview */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/10">
              <video src={downloadUrl} controls className="w-full h-full" />
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-neutral-600 transition-colors"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Description</label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-neutral-600 transition-colors resize-none"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Privacy</label>
                <select
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value as 'private' | 'unlisted' | 'public')}
                  className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="unlisted" className="bg-[#161616]">🔗 Unlisted — only people with the link</option>
                  <option value="private" className="bg-[#161616]">🔒 Private — only you</option>
                  <option value="public" className="bg-[#161616]">🌐 Public — everyone</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {uploadError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <p className="font-medium">Upload failed</p>
                <p className="text-xs mt-0.5 text-red-400/70">{uploadError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <a
                href={downloadUrl}
                download={`${videoTitle}.webm`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <button
                onClick={handleUploadToYouTube}
                disabled={!isAuthd}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                {isAuthd ? 'Upload to YouTube' : 'Connect YouTube First'}
              </button>
            </div>

            <p className="text-xs text-neutral-600 text-center">
              {(videoBlob.size / 1024 / 1024).toFixed(2)} MB · {privacyStatus}
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-xs text-neutral-700 mt-8">
          No server storage · Videos go directly to your YouTube channel
        </p>
      </div>
    </div>
  );
}
