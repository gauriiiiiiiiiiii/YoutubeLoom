# YouTube Loom - Web App

Screen recording app that uploads directly to YouTube.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up YouTube OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/auth/callback`
4. Copy the Client ID

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your YouTube Client ID.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web-app/
├── app/
│   ├── page.tsx              # Main recording UI
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── auth/
│       └── callback/page.tsx # OAuth callback handler
├── components/
│   ├── RecordingControls.tsx # Start/Stop buttons
│   ├── WebcamPreview.tsx     # Webcam overlay positioning
│   ├── UploadProgress.tsx    # YouTube upload progress
│   └── VideoCompositor.tsx   # Canvas compositing logic
├── lib/
│   ├── recorder.ts           # MediaRecorder wrapper
│   ├── indexdb.ts            # IndexedDB chunk storage
│   ├── youtube-auth.ts       # OAuth flow helpers
│   └── youtube-upload.ts     # Resumable upload implementation
└── public/
```

## Features

- ✅ Screen recording
- ✅ Microphone audio
- ✅ Webcam overlay
- ✅ Direct YouTube upload
- ✅ No hosting costs
- ✅ Unlimited recording length

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- MediaRecorder API
- Canvas API
- IndexedDB
- YouTube Data API v3
