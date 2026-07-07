# API server (apps/api) — Fastify + Prisma/MongoDB, run with tsx.
# Build from the repo root: docker build -f docker/api.Dockerfile .
FROM node:22-alpine

RUN apk add --no-cache ffmpeg openssl && corepack enable

WORKDIR /app
COPY . .

# apps/web links rust/wasm/pkg (a local build artifact); stub it so pnpm can
# resolve the workspace even though the web app is filtered out of this image.
RUN [ -f rust/wasm/pkg/package.json ] || \
    (mkdir -p rust/wasm/pkg && echo '{"name":"opencut-wasm","version":"0.2.10"}' > rust/wasm/pkg/package.json)

RUN pnpm install --frozen-lockfile --filter @dubbercut/api...

RUN cd apps/api && pnpm exec prisma generate

ENV NODE_ENV=production
EXPOSE 4000

WORKDIR /app/apps/api
CMD ["pnpm", "start"]
