import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTokenExpired,
  storeToken,
  getStoredToken,
  clearStoredToken,
  isAuthenticated,
  type YouTubeToken,
} from '@/lib/youtube-auth';

beforeEach(() => {
  localStorage.clear();
});

describe('isTokenExpired', () => {
  it('returns false when token has not expired', () => {
    const token: YouTubeToken = { accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 };
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true when token is expired', () => {
    const token: YouTubeToken = { accessToken: 'tok', expiresAt: Date.now() - 1000 };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true within the 5-minute buffer window', () => {
    // Expires in 3 minutes — within the 5-minute buffer
    const token: YouTubeToken = { accessToken: 'tok', expiresAt: Date.now() + 3 * 60 * 1000 };
    expect(isTokenExpired(token)).toBe(true);
  });
});

describe('storeToken / getStoredToken', () => {
  it('stores and retrieves a token without refresh token', () => {
    const token: YouTubeToken = { accessToken: 'access-123', expiresAt: Date.now() + 3600000 };
    storeToken(token);
    const retrieved = getStoredToken();
    expect(retrieved).not.toBeNull();
    expect(retrieved!.accessToken).toBe('access-123');
    expect(retrieved!.refreshToken).toBeUndefined();
  });

  it('stores and retrieves a token with refresh token', () => {
    const token: YouTubeToken = {
      accessToken: 'access-456',
      refreshToken: 'refresh-789',
      expiresAt: Date.now() + 3600000,
    };
    storeToken(token);
    const retrieved = getStoredToken();
    expect(retrieved!.refreshToken).toBe('refresh-789');
  });

  it('returns null when nothing stored', () => {
    expect(getStoredToken()).toBeNull();
  });
});

describe('clearStoredToken', () => {
  it('removes all token keys from localStorage', () => {
    const token: YouTubeToken = {
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 3600000,
    };
    storeToken(token);
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe('isAuthenticated', () => {
  it('returns false when no token stored', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when valid non-expired token stored', () => {
    storeToken({ accessToken: 'tok', expiresAt: Date.now() + 3600000 });
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when stored token is expired', () => {
    storeToken({ accessToken: 'tok', expiresAt: Date.now() - 1000 });
    expect(isAuthenticated()).toBe(false);
  });
});
