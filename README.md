# YouTube Loom

A browser-based screen recorder that uploads directly to your YouTube channel — no server storage, no file size limits, no third-party services.

**Live:** https://youtubeloom.vercel.app

---

## Features

- Screen capture at up to 1920×1080 @ 30fps
- Microphone audio mixed with system audio
- Webcam picture-in-picture overlay (toggleable, 4 corner positions, adjustable size)
- Direct upload to YouTube via the resumable upload protocol (5 MB chunks, retry on failure)
- Set title, description, and privacy (public / unlisted / private) before uploading
- Token auto-refresh — no mid-session logout surprises
- Toast notifications for every action (no `alert()` calls)
- Stale recording chunks cleaned up on each page load

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Recording | MediaRecorder API + Canvas API |
| Storage | IndexedDB (chunk buffer during recording) |
| Auth | Google OAuth 2.0 (authorization code flow, server-side token exchange) |
| Upload | YouTube Data API v3 (resumable upload) |
| Hosting | Vercel |
| Tests | Vitest + Testing Library + fake-indexeddb |

---

## Project Structure

```
app/
  page.tsx                  Main UI (recording, upload, auth state)
  layout.tsx                Root layout — Inter font, ToastProvider
  globals.css               Dark theme, animations
  auth/callback/page.tsx    OAuth redirect handler
  api/auth/
    exchange/route.ts       Server: auth code → access + refresh token
    refresh/route.ts        Server: refresh token → new access token

components/
  RecordingControls.tsx     Record button, timer, webcam toggle, processing state
  WebcamPreview.tsx         Corner picker + size slider
  UploadProgress.tsx        Progress bar, bytes info, YouTube link on complete
  Toaster.tsx               Toast context + auto-dismiss notifications

lib/
  recorder.ts               ScreenRecorder — getDisplayMedia, MediaRecorder wrapper
  compositor.ts             VideoCompositor — Canvas webcam PiP at 15fps
  indexdb.ts                IndexedDBStorage — chunk store/retrieve/combine
  youtube-auth.ts           OAuth helpers — token storage, expiry, refresh
  youtube-upload.ts         YouTubeUploader — resumable upload, retry logic

tests/
  setup.ts                  jsdom setup (localStorage mock, clipboard mock)
  lib/youtube-auth.test.ts  Token expiry, store/retrieve, isAuthenticated
  lib/youtube-upload.test.ts generateDefaultTitle, getYouTubeUrl, upload flow
  lib/indexdb.test.ts       IndexedDB store/retrieve/clear/combine (fake-indexeddb)
  components/Toaster.test.tsx         Toast render, auto-dismiss, styling
  components/UploadProgress.test.tsx  All four status states
  components/WebcamPreview.test.tsx   Position buttons, size display

public/
  favicon.svg               SVG record-button icon
```

---

## Environment Variables

Create `.env.local` (copy from `.env.local.example`):

```env
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=...      # From Google Cloud Console — safe to expose
NEXT_PUBLIC_YOUTUBE_REDIRECT_URI=...   # Must match exactly what's in Google Console
YOUTUBE_CLIENT_SECRET=...              # Server-side only — never prefix with NEXT_PUBLIC_
```

### Getting credentials

1. [Google Cloud Console](https://console.cloud.google.com) → Create project
2. Enable **YouTube Data API v3**
3. APIs & Services → Credentials → **OAuth 2.0 Client ID** (Web application type)
4. Authorized JavaScript origins: `http://localhost:3000`
5. Authorized redirect URIs: `http://localhost:3000/auth/callback`
6. OAuth consent screen → Audience → **Publish App** (required for public access)

---

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in the three env vars above
npm run dev
# Open http://localhost:3000
```

---

## Running Tests

```bash
npm test          # watch mode
npm run test:run  # single pass (CI)
```

42 tests across 6 files — pure functions, upload flow (mocked fetch), IndexedDB (fake-indexeddb), and all UI components.

---

## Deployment

The app is deployed on Vercel. For your own deployment:

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all three env vars in Project → Settings → Environment Variables
4. Add the Vercel URL to **Authorized JavaScript origins** and **Authorized redirect URIs** in Google Console
5. Redeploy

---

## How It Works

```
User clicks "Connect to YouTube"
  → startOAuthFlow() redirects to Google
  → Google redirects to /auth/callback?code=...
  → POST /api/auth/exchange (server) swaps code for tokens using client_secret
  → Tokens stored in localStorage, redirect to /?auth=success

User clicks "Start Recording"
  → getDisplayMedia() + getUserMedia() (mic + webcam)
  → VideoCompositor draws webcam over screen on a Canvas at 15fps
  → AudioContext mixes both audio tracks
  → MediaRecorder records the composed stream
  → Every 5s: chunk saved to IndexedDB (avoids memory blow-up)

User clicks Stop
  → IndexedDB chunks combined into one Blob → video preview shown
  → Stale chunks cleared

User clicks "Upload to YouTube"
  → getValidAccessToken() — refreshes silently if expired
  → YouTubeUploader: POST to initiate resumable session → Location URL
  → Blob uploaded in 5 MB PUT chunks with Content-Range headers
  → Final chunk returns 200/201 with video ID → YouTube URL shown
```
