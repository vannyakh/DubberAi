# Video Voice Translator

AI-powered video voice translation / dubbing studio. Monorepo built with pnpm workspaces + Turborepo.

## Structure

```text
video-voice-translator/
│
├── apps/
│   ├── desktop/              # Electron application (React renderer + IPC)
│   ├── api/                  # Node.js backend (Fastify: projects, AI, jobs)
│   └── web/                  # Web version (Vite + React studio)
│
├── packages/
│   ├── ui/                   # Shared React components (Button, Modal, Spinner)
│   ├── types/                # Shared TypeScript types
│   ├── utils/                # Shared utility functions
│   ├── database/             # Firebase (Firestore + Google Drive); Prisma/SQLite later
│   ├── ffmpeg/               # Video processing (trim, split, merge, export...)
│   ├── transcript/           # Transcription providers (Gemini, Faster-Whisper)
│   ├── captions/             # Subtitle generation (SRT, VTT, ASS)
│   ├── ai/                   # Gemini/LLM services (translate, TTS, summarize...)
│   ├── timeline/             # Timeline editor components
│   ├── player/               # Video player + subtitle overlay
│   └── config/               # Shared tsconfig presets
│
├── services/
│   ├── render-worker/        # Claims and processes render jobs
│   ├── ai-worker/            # Claims and processes AI jobs
│   └── export-worker/        # Claims and processes export jobs
│
├── scripts/                  # check-env.mjs (ffmpeg + env validation)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Run Locally

**Prerequisites:** Node.js, pnpm, ffmpeg (for video processing features)

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Set `GEMINI_API_KEY` (and optionally `KIRI_TTS_API_KEY`) in `.env.local` at the repo root (see `.env.example`).
3. Verify your environment:
   ```bash
   pnpm check-env
   ```
4. Start the web app:
   ```bash
   pnpm dev
   ```

The web app runs at http://localhost:3000.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the web app |
| `pnpm dev:api` | Start the API server (http://localhost:4000) |
| `pnpm dev:desktop` | Start the Electron desktop app |
| `pnpm dev:all` | Start every app, API, and worker |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Type-check all packages and apps |
| `pnpm check-env` | Verify ffmpeg + API keys are configured |

## Workers

Workers poll the API for queued jobs (`POST /api/jobs/claim`) and report progress back (`PATCH /api/jobs/:id`). Start the API first, then any worker:

```bash
pnpm dev:api
pnpm --filter @video-voice-translator/render-worker dev
```

## Dependency Graph

```text
web      → ai, database, captions, player, timeline, ui, types, utils
desktop  → captions, player, timeline, ui, types, utils
api      → ai, transcript, captions, ffmpeg, types, utils
workers  → ffmpeg, ai, transcript, captions, types
timeline → types, utils
player   → types, utils
captions → types
transcript → ai, types
ai       → types
ui       → utils
```
