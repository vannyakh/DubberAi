# Web studio (apps/web) — builds the Rust WASM package, then the Vite app,
# and serves the static bundle with nginx.
# Build from the repo root: docker build -f docker/web.Dockerfile .

# ── Stage 1: Rust crates → WebAssembly ──────────────────────────
FROM rust:1-slim AS wasm
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
WORKDIR /src
COPY rust ./rust
RUN wasm-pack build rust/wasm --target web --out-dir pkg --release

# ── Stage 2: Vite build ─────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
COPY --from=wasm /src/rust/wasm/pkg ./rust/wasm/pkg
RUN pnpm install --frozen-lockfile --filter @dubbercut/web...
# Baked into the bundle at build time; the browser calls this URL directly.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @dubbercut/web build

# ── Stage 3: static serve ───────────────────────────────────────
FROM nginx:alpine
# Template is envsubst'd on boot so the listen port follows $PORT
# (Railway injects one; locally it defaults to 80).
ENV PORT=80
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
