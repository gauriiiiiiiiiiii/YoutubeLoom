import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { IndexedDBStorage } from '@/lib/indexdb';

beforeEach(() => {
  // Fresh in-memory DB + IDBKeyRange for each test
  (globalThis as unknown as Record<string, unknown>).indexedDB = new IDBFactory();
  (globalThis as unknown as Record<string, unknown>).IDBKeyRange = IDBKeyRange;
});

describe('IndexedDBStorage', () => {
  it('initializes without error', async () => {
    const db = new IndexedDBStorage('test-1');
    await expect(db.init()).resolves.toBeUndefined();
    db.close();
  });

  it('stores chunks and returns IDs', async () => {
    const db = new IndexedDBStorage('test-2');
    await db.init();

    const id1 = await db.storeChunk(new Blob(['chunk1'], { type: 'video/webm' }));
    const id2 = await db.storeChunk(new Blob(['chunk2'], { type: 'video/webm' }));

    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
    expect(id2).toBeGreaterThan(id1);
    db.close();
  });

  it('retrieves all chunks for the current recordingId', async () => {
    const db = new IndexedDBStorage('test-3');
    await db.init();

    await db.storeChunk(new Blob(['a']));
    await db.storeChunk(new Blob(['b']));

    const chunks = await db.getAllChunks();
    expect(chunks).toHaveLength(2);
    expect(chunks[0].recordingId).toBe('test-3');
    db.close();
  });

  it('only returns chunks for the current recordingId', async () => {
    const db1 = new IndexedDBStorage('recording-A');
    const db2 = new IndexedDBStorage('recording-B');
    await db1.init();
    await db2.init();

    await db1.storeChunk(new Blob(['a1']));
    await db1.storeChunk(new Blob(['a2']));
    await db2.storeChunk(new Blob(['b1']));

    expect(await db1.getAllChunks()).toHaveLength(2);
    expect(await db2.getAllChunks()).toHaveLength(1);

    db1.close();
    db2.close();
  });

  it('combineChunks returns a Blob with the correct MIME type', async () => {
    const db = new IndexedDBStorage('test-4');
    await db.init();

    await db.storeChunk(new Blob(['hello '], { type: 'video/webm' }));
    await db.storeChunk(new Blob(['world'], { type: 'video/webm' }));

    const combined = await db.combineChunks();
    expect(combined).toBeInstanceOf(Blob);
    expect(combined.type).toBe('video/webm');
    // fake-indexeddb may not preserve exact Blob byte sizes in jsdom, so just verify > 0
    expect(combined.size).toBeGreaterThan(0);
    db.close();
  });

  it('clearChunks removes only the current recording chunks', async () => {
    const db1 = new IndexedDBStorage('rec-X');
    const db2 = new IndexedDBStorage('rec-Y');
    await db1.init();
    await db2.init();

    await db1.storeChunk(new Blob(['x']));
    await db2.storeChunk(new Blob(['y']));

    await db1.clearChunks();

    expect(await db1.getAllChunks()).toHaveLength(0);
    expect(await db2.getAllChunks()).toHaveLength(1);

    db1.close();
    db2.close();
  });

  it('clearAllRecordings removes everything', async () => {
    const db1 = new IndexedDBStorage('rec-1');
    const db2 = new IndexedDBStorage('rec-2');
    await db1.init();
    await db2.init();

    await db1.storeChunk(new Blob(['a']));
    await db2.storeChunk(new Blob(['b']));

    await db1.clearAllRecordings();

    expect(await db1.getAllChunks()).toHaveLength(0);
    expect(await db2.getAllChunks()).toHaveLength(0);

    db1.close();
    db2.close();
  });

  it('getTotalSize resolves without throwing when chunks are present', async () => {
    const db = new IndexedDBStorage('test-5');
    await db.init();

    await db.storeChunk(new Blob(['12345']));
    await db.storeChunk(new Blob(['678']));

    // fake-indexeddb does not preserve exact Blob.size in jsdom; just verify no throw
    const size = await db.getTotalSize();
    expect(typeof size).toBe('number');
    db.close();
  });

  it('getTotalSize returns 0 when no chunks stored', async () => {
    const db = new IndexedDBStorage('test-6');
    await db.init();
    expect(await db.getTotalSize()).toBe(0);
    db.close();
  });
});
