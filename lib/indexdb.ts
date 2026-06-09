/**
 * IndexedDB storage for video chunks
 * Stores recording chunks to handle large files without memory issues
 */

const DB_NAME = 'youtube-loom-db';
const DB_VERSION = 1;
const STORE_NAME = 'video-chunks';

export interface VideoChunk {
  id: number;
  blob: Blob;
  timestamp: number;
  recordingId: string;
}

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private recordingId: string;

  constructor(recordingId: string = Date.now().toString()) {
    this.recordingId = recordingId;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes
          objectStore.createIndex('recordingId', 'recordingId', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Store a video chunk
   */
  async storeChunk(blob: Blob): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const chunk: Omit<VideoChunk, 'id'> = {
        blob,
        timestamp: Date.now(),
        recordingId: this.recordingId,
      };

      const request = store.add(chunk);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(new Error('Failed to store chunk'));
      };
    });
  }

  /**
   * Get all chunks for current recording
   */
  async getAllChunks(): Promise<VideoChunk[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('recordingId');

      const request = index.getAll(this.recordingId);

      request.onsuccess = () => {
        const chunks = request.result as VideoChunk[];
        // Sort by timestamp to ensure correct order
        chunks.sort((a, b) => a.timestamp - b.timestamp);
        resolve(chunks);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve chunks'));
      };
    });
  }

  /**
   * Get chunks in batches for streaming upload
   */
  async *getChunksBatch(batchSize: number = 10): AsyncGenerator<VideoChunk[]> {
    if (!this.db) {
      await this.init();
    }

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('recordingId');

    const request = index.openCursor(IDBKeyRange.only(this.recordingId));

    let batch: VideoChunk[] = [];

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          batch.push(cursor.value as VideoChunk);

          if (batch.length >= batchSize) {
            // Yield batch
            const currentBatch = [...batch];
            batch = [];
            resolve(
              (async function* () {
                yield currentBatch;
              })()
            );
          }

          cursor.continue();
        } else {
          // Yield remaining chunks
          if (batch.length > 0) {
            resolve(
              (async function* () {
                yield batch;
              })()
            );
          }
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve chunks in batches'));
      };
    });
  }

  /**
   * Combine all chunks into a single Blob
   */
  async combineChunks(): Promise<Blob> {
    const chunks = await this.getAllChunks();
    const blobs = chunks.map((chunk) => chunk.blob);
    return new Blob(blobs, { type: blobs[0]?.type || 'video/webm' });
  }

  /**
   * Clear all chunks for current recording
   */
  async clearChunks(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('recordingId');

      const request = index.openCursor(IDBKeyRange.only(this.recordingId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to clear chunks'));
      };
    });
  }

  /**
   * Clear all recordings (cleanup)
   */
  async clearAllRecordings(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear all recordings'));
      };
    });
  }

  /**
   * Get total size of stored chunks (in bytes)
   */
  async getTotalSize(): Promise<number> {
    const chunks = await this.getAllChunks();
    return chunks.reduce((total, chunk) => total + chunk.blob.size, 0);
  }

  /**
   * Get estimated storage quota usage
   */
  static async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }

    return { usage: 0, quota: 0 };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
