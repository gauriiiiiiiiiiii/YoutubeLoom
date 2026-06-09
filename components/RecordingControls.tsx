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
  const [webcamPosition, setWebcamPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [webcamSize, setWebcamSize] = useState(20);

  // Clean up leftover IndexedDB chunks from crashed sessions
  useEffect(() => {
    const cleanup = new IndexedDBStorage();
    cleanup.clearAllRecordings().catch(() => {});
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  // Storage size polling
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && storage) {
      interval = setInterval(async () => {
        setStorageSize(await storage.getTotalSize());
      }, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording, storage]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const formatBytes = (b: number) => {
    if (b === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      setError(null);
      if (!ScreenRecorder.isSupported()) throw new Error('Screen recording not supported in this browser');

      const db = new IndexedDBStorage();
      await db.init();
      setStorage(db);

      const rec = new ScreenRecorder({
        enableWebcam,
        webcamOptions: { webcamPosition, webcamSize, webcamBorderRadius: 12, frameRate: 15 },
        onDataAvailable: async (blob) => { await db.storeChunk(blob); },
        onStop: async () => {
          setIsRecording(false);
          setIsProcessing(true);
          const finalBlob = await db.combineChunks();
          await db.clearChunks();
          db.close();
          setIsProcessing(false);
          onRecordingComplete?.(finalBlob);
        },
        onError: (err) => {
          setError(err.message);
          setIsRecording(false);
          setIsProcessing(false);
        },
      });

      await rec.start();
      setRecorder(rec);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    recorder?.stop();
    setRecorder(null);
  };

  // ── Processing state ──
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">Processing recording…</p>
          <p className="text-xs text-neutral-500 mt-0.5">Combining video chunks</p>
        </div>
      </div>
    );
  }

  // ── Recording active state ──
  if (isRecording) {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Timer */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-3xl font-mono font-bold tracking-wider text-white">
              {formatTime(recordingTime)}
            </span>
          </div>
          {storageSize > 0 && (
            <span className="text-xs text-neutral-500">{formatBytes(storageSize)} saved</span>
          )}
        </div>

        {/* Stop button */}
        <button
          onClick={stopRecording}
          className="relative w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all record-pulse flex items-center justify-center"
        >
          <div className="w-5 h-5 bg-white rounded-sm" />
        </button>

        <p className="text-xs text-neutral-600 text-center max-w-xs">
          Click the button or use the browser&apos;s stop sharing control to finish
        </p>
      </div>
    );
  }

  // ── Idle state ──
  return (
    <div className="flex flex-col items-center gap-6 py-2">

      {/* Webcam toggle */}
      <div className="flex items-center justify-between w-full px-1">
        <div>
          <p className="text-sm font-medium text-white">Webcam overlay</p>
          <p className="text-xs text-neutral-500">Picture-in-picture on recording</p>
        </div>
        <button
          onClick={() => setEnableWebcam((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            enableWebcam ? 'bg-blue-600' : 'bg-white/10'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
              enableWebcam ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Webcam settings */}
      {enableWebcam && (
        <div className="w-full">
          <WebcamPreview
            position={webcamPosition}
            size={webcamSize}
            onPositionChange={(p) => { setWebcamPosition(p); recorder?.updateWebcamPosition(p); }}
            onSizeChange={(s) => { setWebcamSize(s); recorder?.updateWebcamSize(s); }}
          />
        </div>
      )}

      {/* Divider */}
      <div className="w-full h-px bg-white/[0.06]" />

      {/* Error */}
      {error && (
        <div className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <p className="font-medium">Error</p>
          <p className="text-xs mt-0.5 text-red-400/70">{error}</p>
        </div>
      )}

      {/* Record button */}
      <button
        onClick={startRecording}
        className="group relative w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all duration-150 flex items-center justify-center shadow-lg shadow-blue-600/20"
      >
        {/* Outer ring */}
        <span className="absolute inset-0 rounded-full border-2 border-blue-400/30 group-hover:border-blue-400/50 transition-colors" />
        {/* Icon */}
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="6" />
        </svg>
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-white">Start Recording</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          Screen · Microphone{enableWebcam ? ' · Webcam' : ''}
        </p>
      </div>
    </div>
  );
}
