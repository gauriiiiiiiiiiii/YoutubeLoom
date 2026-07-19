<div align="center">

# 🎬 YouTube Loom

**Record your screen → upload straight to YouTube.**
No server. No storage. No file-size limits.

[**▶ Live Demo**](https://youtubeloom.vercel.app) · Next.js 15 · React 19 · TypeScript

</div>

---

Your browser does everything — capture, buffer, upload. The only backend is a
two-function relay that keeps your OAuth secret off the client. Your video goes
directly from your tab to your channel and touches nothing in between.

## ✨ What it does

- 🖥️ **Screen + webcam + mic** — webcam overlays as picture-in-picture (pick a corner, set the size)
- ♾️ **No limits** — chunks stream to IndexedDB, so a 3-hour recording won't crash the tab
- 🚀 **Direct upload** — resumable 5 MB chunks straight to the YouTube Data API
- 🔒 **Zero storage** — nothing is ever saved on a server we own

## 🧠 How it works

```
 record ──▶ 5s chunks ──▶ IndexedDB ──▶ combine ──▶ resumable upload ──▶ YouTube
(getDisplayMedia)         (on disk)                (5 MB PUTs)
```

## 🏁 Quick start

```bash
git clone https://github.com/gauriiiiiiiiiiii/YoutubeLoom
cd YoutubeLoom
npm install
cp .env.local.example .env.local   # add your credentials (below)
npm run dev                        # → http://localhost:3000
```

## 🔑 Environment

```env
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=        # OAuth Client ID
NEXT_PUBLIC_YOUTUBE_REDIRECT_URI=     # http://localhost:3000/auth/callback
YOUTUBE_CLIENT_SECRET=                # server-only — never prefix with NEXT_PUBLIC_
```

Grab them from the [Google Cloud Console](https://console.cloud.google.com):
enable **YouTube Data API v3** → create an **OAuth 2.0 Client ID** (Web app) →
publish the consent screen.

## 🧪 Tests

```bash
npm run test:run    # 42 tests, all green
```

<div align="center"><sub>Videos go directly to your channel. We never see them.</sub></div>
