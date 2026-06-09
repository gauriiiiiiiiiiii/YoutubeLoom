# YouTube Loom

Record your screen and upload directly to YouTube. No server storage, no file size limits.

**Live demo:** https://youtubeloom.vercel.app

---

## Quick Start

```bash
git clone https://github.com/gauriiiiiiiiiiii/YoutubeLoom
cd YoutubeLoom
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment Variables

```env
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=        # OAuth Client ID (Google Cloud Console)
NEXT_PUBLIC_YOUTUBE_REDIRECT_URI=     # http://localhost:3000/auth/callback
YOUTUBE_CLIENT_SECRET=                # Server-side only — never NEXT_PUBLIC_
```

Get credentials: [Google Cloud Console](https://console.cloud.google.com) → enable YouTube Data API v3 → create OAuth 2.0 Client ID (Web application). Publish the OAuth consent screen for public access.

## Tests

```bash
npm run test:run    # 42 tests
```
