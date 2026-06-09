import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDefaultTitle, getYouTubeUrl, YouTubeUploader } from '@/lib/youtube-upload';

describe('generateDefaultTitle', () => {
  it('returns a string containing "Screen Recording"', () => {
    const title = generateDefaultTitle();
    expect(title).toContain('Screen Recording');
  });

  it('returns a different title each minute (contains time component)', () => {
    const title = generateDefaultTitle();
    // Format: "Screen Recording - Jun 10, 2026 at 12:00 AM"
    expect(title).toMatch(/Screen Recording - .+ at .+/);
  });
});

describe('getYouTubeUrl', () => {
  it('returns correct watch URL for a video ID', () => {
    expect(getYouTubeUrl('abc123')).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('handles special characters in video ID', () => {
    expect(getYouTubeUrl('xYz-_AB')).toBe('https://www.youtube.com/watch?v=xYz-_AB');
  });
});

describe('YouTubeUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads a video and returns the video ID', async () => {
    const mockFetch = vi.fn();

    // initiate upload → returns Location header
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'https://upload.example.com/session' },
    });

    // final chunk upload → returns video ID
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ id: 'video-id-xyz' }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const progressCalls: number[] = [];
    const uploader = new YouTubeUploader('fake-token', (p) => {
      progressCalls.push(p.percentage);
    });

    // Use a blob smaller than the 5MB chunk to trigger single-chunk upload
    const blob = new Blob(['hello video'], { type: 'video/webm' });
    const videoId = await uploader.upload(blob, {
      title: 'Test',
      description: 'desc',
      privacyStatus: 'private',
    });

    expect(videoId).toBe('video-id-xyz');
    expect(progressCalls).toContain(100);
  });

  it('throws when initiate upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => 'Unauthorized',
    }));

    const uploader = new YouTubeUploader('bad-token');
    const blob = new Blob(['x'], { type: 'video/webm' });

    await expect(uploader.upload(blob, {
      title: 'T',
      description: '',
      privacyStatus: 'private',
    })).rejects.toThrow('Failed to initiate upload');
  });

  it('throws when no upload URL received', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: () => null },
    }));

    const uploader = new YouTubeUploader('tok');
    const blob = new Blob(['x'], { type: 'video/webm' });

    await expect(uploader.upload(blob, {
      title: 'T',
      description: '',
      privacyStatus: 'private',
    })).rejects.toThrow('No upload URL received');
  });
});
