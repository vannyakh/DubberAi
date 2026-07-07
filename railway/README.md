# Deploying to Railway

Five deployable services, all built from this one repo with the Dockerfiles in
`docker/`. Each has a config-as-code file in this folder.

| Railway service | Config file | Dockerfile | Public? |
| --- | --- | --- | --- |
| `api` | `/railway/api.railway.json` | `docker/api.Dockerfile` | yes (domain) |
| `ai-worker` | `/railway/ai-worker.railway.json` | `docker/worker.Dockerfile` | no |
| `render-worker` | `/railway/render-worker.railway.json` | `docker/worker.Dockerfile` | no |
| `export-worker` | `/railway/export-worker.railway.json` | `docker/worker.Dockerfile` | no |
| `web` | `/railway/web.railway.json` | `docker/web.Dockerfile` | yes (domain) |

## 1. Databases

- **MongoDB — use [Atlas](https://www.mongodb.com/atlas)** (free M0 tier works).
  Prisma's MongoDB connector needs a replica set; Railway's MongoDB template is
  standalone, so Atlas is the reliable choice.
- **Redis** (optional): add Railway's Redis template to the project.
- **RabbitMQ** (optional): deploy the RabbitMQ template, or skip it — workers
  fall back to polling.

## 2. Create the services

For each row in the table above:

1. In your Railway project: **New → GitHub Repo** and pick this repository.
2. In the service **Settings**:
   - **Config File Path**: the absolute path from the table, e.g. `/railway/api.railway.json`
     (the builder, Dockerfile path, watch paths, health checks, and restart
     policy all come from this file).
   - Leave Root Directory as `/` — the Dockerfiles expect the repo root as
     build context.

## 3. Service variables

`api`:

```
API_KEY_302=sk-...
DATABASE_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/dubbercute?retryWrites=true&w=majority
AUTH_SECRET=<openssl rand -base64 32>
REDIS_URL=${{Redis.REDIS_URL}}          # if you added Redis
RABBITMQ_URL=<amqp url>                 # if you added RabbitMQ
```

Workers (all three):

```
WORKER=ai-worker            # or render-worker / export-worker — picks which
                            # service the shared Dockerfile builds (build arg)
API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
```

`ai-worker` additionally needs `API_KEY_302`.

`web` (available to the Docker build because the Dockerfile declares the ARG):

```
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

## 4. Networking

- Generate a **public domain** for `api` and `web` (Settings → Networking).
  Railway detects the exposed port; `web`'s nginx listens on whatever `PORT`
  Railway assigns.
- Workers talk to the API over **private networking** (`RAILWAY_PRIVATE_DOMAIN`),
  which is IPv6 — the API binds `::` so this works out of the box.
- Deploy `web` (or redeploy it) **after** `api` has its public domain, since
  `VITE_API_URL` is baked into the JS bundle at build time.

## Notes

- The API runs `prisma db push` on every boot (see `startCommand` in
  `api.railway.json`), so indexes stay in sync automatically.
- Uploads (`apps/api/uploads`) are ephemeral on Railway. Attach a
  [volume](https://docs.railway.com/reference/volumes) to the `api` service
  mounted at `/app/apps/api/uploads` to persist them.
- Watch paths keep services from rebuilding when unrelated parts of the
  monorepo change (e.g. a mobile-only commit won't redeploy the API).
