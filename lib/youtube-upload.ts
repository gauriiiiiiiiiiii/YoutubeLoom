/**
 * YouTube Resumable Upload Implementation
 * https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */

const YOUTUBE_UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

export interface VideoMetadata {
  title: string;
  description: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  categoryId?: string;
  tags?: string[];
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  videoId?: string;
  error?: string;
}

export class YouTubeUploader {
  private accessToken: string;
  private uploadUrl: string | null = null;
  private chunkSize: number = 5 * 1024 * 1024; // 5MB chunks
  private onProgress?: (progress: UploadProgress) => void;
  private uploadedVideoId: string | null = null;

  constructor(accessToken: string, onProgress?: (progress: UploadProgress) => void) {
    this.accessToken = accessToken;
    this.onProgress = onProgress;
  }

  /**
   * Upload video to YouTube
   */
  async upload(videoBlob: Blob, metadata: VideoMetadata): Promise<string> {
    try {
      // Step 1: Initiate resumable upload session
      this.uploadUrl = await this.initiateUpload(videoBlob.size, metadata);

      // Step 2: Upload video in chunks
      await this.uploadChunks(videoBlob);

      // Step 3: Get video ID captured from final chunk response
      const videoId = this.getVideoId();

      this.reportProgress({
        bytesUploaded: videoBlob.size,
        totalBytes: videoBlob.size,
        percentage: 100,
        status: 'complete',
        videoId,
      });

      return videoId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.reportProgress({
        bytesUploaded: 0,
        totalBytes: videoBlob.size,
        percentage: 0,
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Step 1: Initiate resumable upload session
   */
  private async initiateUpload(fileSize: number, metadata: VideoMetadata): Promise<string> {
    const body = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        categoryId: metadata.categoryId || '22', // Default: People & Blogs
        tags: metadata.tags || [],
      },
      status: {
        privacyStatus: metadata.privacyStatus,
      },
    };

    const response = await fetch(YOUTUBE_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': fileSize.toString(),
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initiate upload: ${error}`);
    }

    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    return uploadUrl;
  }

  /**
   * Step 2: Upload video in chunks
   */
  private async uploadChunks(videoBlob: Blob): Promise<void> {
    if (!this.uploadUrl) {
      throw new Error('Upload URL not initialized');
    }

    const totalBytes = videoBlob.size;
    let bytesUploaded = 0;

    while (bytesUploaded < totalBytes) {
      const chunkStart = bytesUploaded;
      const chunkEnd = Math.min(bytesUploaded + this.chunkSize, totalBytes);
      const chunk = videoBlob.slice(chunkStart, chunkEnd);

      await this.uploadChunk(chunk, chunkStart, chunkEnd - 1, totalBytes);

      bytesUploaded = chunkEnd;

      this.reportProgress({
        bytesUploaded,
        totalBytes,
        percentage: Math.round((bytesUploaded / totalBytes) * 100),
        status: 'uploading',
      });
    }
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunk(
    chunk: Blob,
    start: number,
    end: number,
    total: number,
    retries: number = 3
  ): Promise<void> {
    if (!this.uploadUrl) {
      throw new Error('Upload URL not initialized');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.size.toString(),
            'Content-Range': `bytes ${start}-${end}/${total}`,
          },
          body: chunk,
        });

        if (response.status === 200 || response.status === 201) {
          const data = await response.json();
          this.uploadedVideoId = data.id;
          return;
        }
        if (response.status === 308) {
          return;
        }

        if (response.status >= 500) {
          // Server error, retry
          if (attempt < retries) {
            await this.delay(1000 * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }
        }

        const error = await response.text();
        throw new Error(`Chunk upload failed: ${error}`);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(1000 * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Step 3: Get video ID (captured from final chunk response)
   */
  private getVideoId(): string {
    if (!this.uploadedVideoId) {
      throw new Error('Video ID not available — upload may not have completed');
    }
    return this.uploadedVideoId;
  }

  /**
   * Resume upload from where it left off
   */
  async resumeUpload(videoBlob: Blob): Promise<void> {
    if (!this.uploadUrl) {
      throw new Error('No upload session to resume');
    }

    // Query upload status
    const response = await fetch(this.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': '0',
        'Content-Range': `bytes */${videoBlob.size}`,
      },
    });

    if (response.status === 308) {
      // Get range of bytes received
      const rangeHeader = response.headers.get('Range');
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match) {
          const bytesUploaded = parseInt(match[1], 10) + 1;

          // Resume from where we left off
          const remainingBlob = videoBlob.slice(bytesUploaded);
          await this.uploadChunks(remainingBlob);
        }
      }
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: UploadProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set chunk size (default: 5MB)
   */
  setChunkSize(bytes: number): void {
    this.chunkSize = bytes;
  }
}

/**
 * Helper to generate default video title
 */
export function generateDefaultTitle(): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Screen Recording - ${date} at ${time}`;
}

/**
 * Helper to generate YouTube watch URL
 */
export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
