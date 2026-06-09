/**
 * Screen and Microphone Recorder using MediaRecorder API
 */

import { VideoCompositor, type CompositorOptions } from './compositor';

export interface RecorderOptions {
  onDataAvailable?: (blob: Blob) => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  enableWebcam?: boolean;
  webcamOptions?: CompositorOptions;
}

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private screenStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private compositor: VideoCompositor | null = null;
  private chunks: Blob[] = [];
  private options: RecorderOptions;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      audioBitsPerSecond: 128000,  // 128 kbps for audio
      enableWebcam: false,
      ...options,
    };
  }

  /**
   * Start recording screen and microphone
   */
  async start(): Promise<void> {
    try {
      // Request screen capture
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Request microphone
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      // Request webcam if enabled
      if (this.options.enableWebcam) {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
      }

      // Combine streams
      this.combinedStream = new MediaStream();

      // Get screen video track (needed for stop handler)
      const screenVideoTrack = this.screenStream.getVideoTracks()[0];

      // If webcam is enabled, use compositor to overlay webcam on screen
      if (this.options.enableWebcam && this.webcamStream) {
        this.compositor = new VideoCompositor(this.options.webcamOptions);
        const compositedStream = await this.compositor.start(
          this.screenStream,
          this.webcamStream
        );

        // Add composited video track
        const compositedVideoTrack = compositedStream.getVideoTracks()[0];
        if (compositedVideoTrack) {
          this.combinedStream.addTrack(compositedVideoTrack);
        }
      } else {
        // Add video track from screen only
        if (screenVideoTrack) {
          this.combinedStream.addTrack(screenVideoTrack);
        }
      }

      // Create audio context to mix screen audio + mic audio
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add screen audio if available
      const screenAudioTracks = this.screenStream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([screenAudioTracks[0]])
        );
        screenAudioSource.connect(destination);
      }

      // Add microphone audio
      const micAudioSource = audioContext.createMediaStreamSource(this.micStream);
      micAudioSource.connect(destination);

      // Add combined audio track
      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) {
        this.combinedStream.addTrack(audioTrack);
      }

      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.combinedStream, {
        mimeType,
        videoBitsPerSecond: this.options.videoBitsPerSecond,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      });

      // Handle data available (chunks)
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          if (this.options.onDataAvailable) {
            this.options.onDataAvailable(event.data);
          }
        }
      };

      // Handle stop
      this.mediaRecorder.onstop = () => {
        if (this.options.onStop) {
          this.options.onStop();
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event: Event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        console.error(error);
        if (this.options.onError) {
          this.options.onError(error);
        }
      };

      // Start recording with 5-second chunks
      this.mediaRecorder.start(5000);

      // Handle screen share stop button (browser UI)
      if (screenVideoTrack) {
        screenVideoTrack.onended = () => {
          this.stop();
        };
      }
    } catch (error) {
      const recordError = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to start recording:', recordError);
      this.cleanup();
      if (this.options.onError) {
        this.options.onError(recordError);
      }
      throw recordError;
    }
  }

  /**
   * Stop recording
   */
  stop(): Blob | null {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.cleanup();

    // Return final blob
    if (this.chunks.length > 0) {
      const mimeType = this.getSupportedMimeType();
      const blob = new Blob(this.chunks, { type: mimeType });
      this.chunks = [];
      return blob;
    }

    return null;
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    if (!this.mediaRecorder) return 'inactive';
    return this.mediaRecorder.state as RecordingState;
  }

  /**
   * Update webcam position (only if webcam is enabled)
   */
  updateWebcamPosition(position: CompositorOptions['webcamPosition']): void {
    if (this.compositor) {
      this.compositor.updatePosition(position);
    }
  }

  /**
   * Update webcam size (only if webcam is enabled)
   */
  updateWebcamSize(size: number): void {
    if (this.compositor) {
      this.compositor.updateSize(size);
    }
  }

  /**
   * Clean up streams and resources
   */
  private cleanup(): void {
    // Stop compositor
    if (this.compositor) {
      this.compositor.stop();
      this.compositor = null;
    }

    // Stop all tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Check if browser supports screen recording
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }
}

type RecordingState = 'inactive' | 'recording' | 'paused';
