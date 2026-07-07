# Video Voice Translator

AI-powered video voice translation / dubbing studio. Monorepo built with pnpm workspaces + Turborepo.

## Structure

```text
video-voice-translator/
│
├── apps/
│   ├── desktop/              # Electron: full editor (timeline, player, IPC file dialogs)
│   ├── mobile/               # Expo: companion app (login, projects, transcripts, captions, AI translation)
│   ├── api/                  # Fastify: auth, projects, AI, jobs, uploads (Prisma + SQLite)
│   └── web/                  # Vite + React studio (Gemini + Firebase)
│
├── packages/
│   ├── types/                # Shared TypeScript types          (desktop, mobile, api, web)
│   ├── utils/                # Shared utility functions         (desktop, mobile, api, web)
│   ├── api-client/           # Typed REST client for apps/api   (desktop, mobile)
│   ├── auth/                 # Token storage, validation, types (desktop, mobile, api)
│   ├── store/                # Zustand store factories          (desktop, mobile)
│   ├── ai/                   # Gemini/LLM services              (desktop, api, web)
│   ├── captions/             # SRT / VTT / ASS generation       (desktop, mobile, web)
│   ├── transcript/           # Gemini + Faster-Whisper providers(desktop, api)
│   ├── timeline-core/        # Pure timeline logic              (desktop)
│   ├── player-core/          # Pure playback/cue logic          (desktop, mobile)
│   ├── timeline/             # React timeline components (DOM)
│   ├── player/               # React player components (DOM)
│   ├── ui/                   # React components (Button, Modal, Spinner)
│   ├── design-system/        # Design tokens + light/dark themes
│   ├── database/             # Firebase (web); API uses Prisma
│   ├── ffmpeg/               # Video processing (trim, merge, export...)
│   └── config/               # Shared tsconfig presets
│
├── services/
│   ├── render-worker/        # Claims render jobs from the API
│   ├── ai-worker/            # Claims AI jobs
│   └── export-worker/        # Claims export jobs
│
├── scripts/                  # check-env.mjs, smoke-api.mjs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Communication

```text
                  API (Fastify + Prisma/SQLite + JWT)
                   │
        ┌──────────┴──────────┐
        │                     │
 Desktop (Electron)     Mobile (Expo)
        │                     │
        └──────────┬──────────┘
                   │
     Shared packages (api-client, auth, store, ...)
```

## Run Locally

**Prerequisites:** Node.js, pnpm, ffmpeg (for video processing)

1. `pnpm install`
2. Set `API_KEY_302` (a [302.AI](https://302.ai) key — one key for all LLM/AI services) in `.env` at the repo root.
3. Create the API database: `pnpm db:push`
4. Verify: `pnpm check-env`

| Command | Description |
| --- | --- |
| `pnpm dev` | Web studio (http://localhost:3000) |
| `pnpm dev:api` | API server (http://localhost:4000) |
| `pnpm dev:desktop` | Electron desktop app |
| `pnpm dev:mobile` | Expo dev server (scan QR with Expo Go) |
| `pnpm dev:all` | Everything, including workers |
| `pnpm build` / `pnpm lint` | Build / type-check all packages |
| `pnpm smoke-api` | End-to-end API test (auth, projects, jobs) |

### Mobile notes

- Expo SDK 57 with expo-router file-based routing (`apps/mobile/src/app`): `/login`, `/` (projects), `/project/[id]`. Typed routes are enabled.
- Set `EXPO_PUBLIC_API_URL` to your API address (Android emulator: `http://10.0.2.2:4000`; physical device: your machine's LAN IP).
- Sessions currently use in-memory token storage; swap in an `expo-secure-store` adapter (see `apps/mobile/src/api.ts`) to persist logins.

### API notes

- Auth is JWT (Bearer). Set `AUTH_SECRET` in production (`apps/api/.env`).
- Database is MongoDB via Prisma (`apps/api/prisma/schema.prisma`). Paste your MongoDB Atlas
  connection string into `DATABASE_URL` in `apps/api/.env` (include a database name in the path),
  then run `pnpm db:push` once to sync indexes.
- Cache is Redis (optional): set `REDIS_URL` in `apps/api/.env`. If Redis is unset or goes down,
  the API automatically falls back to hitting the database directly — nothing breaks.
- RabbitMQ is optional: set `RABBITMQ_URL` to publish job created/updated events to the `jobs`
  queue for push-style workers. Without it, workers keep polling `POST /api/jobs/claim` as before.
- Workers poll `POST /api/jobs/claim` and report progress with `PATCH /api/jobs/:id`.
