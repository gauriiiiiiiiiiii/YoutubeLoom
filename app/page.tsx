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

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
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

  useEffect(() => {
    setIsAuthd(isAuthenticated());
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success') {
      setIsAuthd(true);
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

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

  const handleConnectYouTube = () => startOAuthFlow();

  const handleDisconnectYouTube = () => {
    clearStoredToken();
    setIsAuthd(false);
  };

  const handleUploadToYouTube = async () => {
    if (!videoBlob) return;
    setUploadError(null);

    try {
      setUploading(true);
      setUploadProgress(null);
      setYoutubeUrl(null);

      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated. Please connect to YouTube first.');
      }

      const uploader = new YouTubeUploader(accessToken, (progress) => {
        setUploadProgress(progress);
      });

      const videoId = await uploader.upload(videoBlob, {
        title: videoTitle,
        description: videoDescription,
        privacyStatus,
        tags: ['screen recording', 'youtube loom'],
      });

      setYoutubeUrl(getYouTubeUrl(videoId));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="z-10 max-w-5xl w-full font-mono text-sm">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-center mb-4">YouTube Loom</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Record your screen and upload directly to YouTube
          </p>

          {/* YouTube Auth Status */}
          <div className="flex justify-center">
            {isAuthd ? (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Connected to YouTube</span>
                <button onClick={handleDisconnectYouTube} className="ml-2 text-xs underline hover:no-underline">
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectYouTube}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Connect to YouTube
              </button>
            )}
          </div>
        </div>

        {/* Recording Controls (hidden when preview is showing) */}
        {!videoBlob && (
          <RecordingControls onRecordingComplete={handleRecordingComplete} />
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="mt-12">
            <UploadProgress progress={uploadProgress} youtubeUrl={youtubeUrl || undefined} />
          </div>
        )}

        {/* Recording Complete — Preview and Upload */}
        {videoBlob && downloadUrl && !uploading && !uploadProgress && (
          <div className="mt-12 w-full max-w-3xl mx-auto">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recording Complete!</h2>
                <button
                  onClick={handleNewRecording}
                  className="text-sm px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  New Recording
                </button>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video src={downloadUrl} controls className="w-full h-full" />
              </div>

              {/* Video Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Video Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter video description"
                />
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-medium mb-2">Privacy</label>
                <select
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value as 'private' | 'unlisted' | 'public')}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="unlisted">Unlisted — only people with the link can view</option>
                  <option value="private">Private — only you can view</option>
                  <option value="public">Public — anyone can view</option>
                </select>
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  <p className="font-semibold">Upload Failed</p>
                  <p>{uploadError}</p>
                </div>
              )}

              <div className="flex gap-4">
                <a
                  href={downloadUrl}
                  download={`${videoTitle}.webm`}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-center"
                >
                  Download
                </a>
                <button
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleUploadToYouTube}
                  disabled={!isAuthd}
                >
                  {isAuthd ? 'Upload to YouTube' : 'Connect YouTube to Upload'}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Video size: {(videoBlob.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
