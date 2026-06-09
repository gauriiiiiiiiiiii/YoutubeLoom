'use client';

import { useState, useEffect } from 'react';
import { ScreenRecorder } from '@/lib/recorder';
import { IndexedDBStorage } from '@/lib/indexdb';
import WebcamPreview from './WebcamPreview';

interface RecordingControlsProps {
  onRecordingComplete?: (videoBlob: Blob) => void;
}

export default function RecordingControls({ onRecordingComplete }: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recorder, setRecorder] = useState<ScreenRecorder | null>(null);
  const [storage, setStorage] = useState<IndexedDBStorage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [enableWebcam, setEnableWebcam] = useState(true);
  const [webcamPosition, setWebcamPosition] = useState<
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  >('bottom-right');
  const [webcamSize, setWebcamSize] = useState(20);

  // Clean up any leftover IndexedDB chunks from previous sessions
  useEffect(() => {
    const cleanup = new IndexedDBStorage();
    cleanup.clearAllRecordings().catch(() => {});
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  // Update storage size periodically
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && storage) {
      interval = setInterval(async () => {
        const size = await storage.getTotalSize();
        setStorageSize(size);
      }, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording, storage]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      setError(null);

      if (!ScreenRecorder.isSupported()) {
        throw new Error('Screen recording is not supported in your browser');
      }

      const db = new IndexedDBStorage();
      await db.init();
      setStorage(db);

      const newRecorder = new ScreenRecorder({
        enableWebcam,
        webcamOptions: {
          webcamPosition,
          webcamSize,
          webcamBorderRadius: 12,
          frameRate: 15,
        },
        onDataAvailable: async (blob) => {
          await db.storeChunk(blob);
        },
        onStop: async () => {
          setIsRecording(false);
          setIsProcessing(true);
          const finalBlob = await db.combineChunks();
          await db.clearChunks();
          db.close();
          setIsProcessing(false);
          if (onRecordingComplete) {
            onRecordingComplete(finalBlob);
          }
        },
        onError: (err) => {
          setError(err.message);
          setIsRecording(false);
          setIsProcessing(false);
        },
      });

      await newRecorder.start();
      setRecorder(newRecorder);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setRecorder(null);
    }
  };

  const handleWebcamPositionChange = (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    setWebcamPosition(position);
    if (recorder) recorder.updateWebcamPosition(position);
  };

  const handleWebcamSizeChange = (size: number) => {
    setWebcamSize(size);
    if (recorder) recorder.updateWebcamSize(size);
  };

  // Processing state — combining chunks
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-medium">Processing recording...</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Combining video chunks, please wait</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {!isRecording && (
        <>
          {/* Webcam toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Webcam Overlay</span>
            <button
              onClick={() => setEnableWebcam((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enableWebcam ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableWebcam ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {enableWebcam && (
            <WebcamPreview
              position={webcamPosition}
              size={webcamSize}
              onPositionChange={handleWebcamPositionChange}
              onSizeChange={handleWebcamSizeChange}
            />
          )}
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg max-w-md text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {isRecording ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</span>
            </div>
            {storageSize > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatBytes(storageSize)} stored</p>
            )}
          </div>

          <button
            onClick={stopRecording}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Stop Recording
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md text-center">
            Recording in progress. Click "Stop Recording" or use the browser's stop sharing button.
          </p>
        </>
      ) : (
        <>
          <button
            onClick={startRecording}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Start Recording
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md text-center">
            Click to start recording your screen and microphone
            {enableWebcam ? ' with webcam overlay' : ''}.
          </p>
        </>
      )}
    </div>
  );
}
