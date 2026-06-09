/**
 * YouTube OAuth 2.0 Authentication Helper
 */

const YOUTUBE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

const TOKEN_STORAGE_KEY = 'youtube_oauth_token';
const REFRESH_TOKEN_KEY = 'youtube_refresh_token';
const TOKEN_EXPIRY_KEY = 'youtube_token_expiry';

export interface YouTubeToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Timestamp in ms
}

/**
 * Start OAuth flow by redirecting to Google
 */
export function startOAuthFlow(): void {
  const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      'Missing YouTube OAuth credentials. Please set NEXT_PUBLIC_YOUTUBE_CLIENT_ID and NEXT_PUBLIC_YOUTUBE_REDIRECT_URI in .env.local'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to get refresh token
  });

  const authUrl = `${YOUTUBE_AUTH_ENDPOINT}?${params.toString()}`;
  window.location.href = authUrl;
}

/**
 * Exchange authorization code for access token
 * Calls our secure server-side API route
 */
export async function exchangeCodeForToken(code: string): Promise<YouTubeToken> {
  const response = await fetch('/api/auth/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to exchange code for token');
  }

  const data = await response.json();

  const token: YouTubeToken = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + data.expiresIn * 1000,
  };

  // Store token
  storeToken(token);

  return token;
}

/**
 * Store token in localStorage
 */
export function storeToken(token: YouTubeToken): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token.accessToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, token.expiresAt.toString());

  if (token.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken);
  }
}

/**
 * Get stored token from localStorage
 */
export function getStoredToken(): YouTubeToken | null {
  const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !expiryStr) {
    return null;
  }

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresAt: parseInt(expiryStr, 10),
  };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: YouTubeToken): boolean {
  // Add 5-minute buffer
  return Date.now() > token.expiresAt - 5 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 * Calls our secure server-side API route
 */
export async function refreshAccessToken(refreshToken: string): Promise<YouTubeToken> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refresh token');
  }

  const data = await response.json();

  const token: YouTubeToken = {
    accessToken: data.accessToken,
    refreshToken: refreshToken, // Keep existing refresh token
    expiresAt: Date.now() + data.expiresIn * 1000,
  };

  // Update stored token
  storeToken(token);

  return token;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredToken();

  if (!token) {
    return null;
  }

  // If token is expired, try to refresh
  if (isTokenExpired(token)) {
    if (!token.refreshToken) {
      // No refresh token, need to re-authenticate
      clearStoredToken();
      return null;
    }

    try {
      const newToken = await refreshAccessToken(token.refreshToken);
      return newToken.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearStoredToken();
      return null;
    }
  }

  return token.accessToken;
}

/**
 * Clear stored token (logout)
 */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getStoredToken();
  return token !== null && !isTokenExpired(token);
}
