# Shared image for the job workers (services/*), selected with a build arg:
#   docker build -f docker/worker.Dockerfile --build-arg WORKER=render-worker .
FROM node:22-alpine

ARG WORKER=render-worker

RUN apk add --no-cache ffmpeg && corepack enable

WORKDIR /app
COPY . .

# apps/web links rust/wasm/pkg (a local build artifact); stub it so pnpm can
# resolve the workspace even though the web app is filtered out of this image.
RUN [ -f rust/wasm/pkg/package.json ] || \
    (mkdir -p rust/wasm/pkg && echo '{"name":"opencut-wasm","version":"0.2.10"}' > rust/wasm/pkg/package.json)

RUN pnpm install --frozen-lockfile --filter "@dubbercute/${WORKER}..."

ENV NODE_ENV=production
WORKDIR /app/services/${WORKER}
CMD ["pnpm", "start"]
