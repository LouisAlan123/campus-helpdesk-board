# Campus Help Desk Board (@PES1UG24AM437)

Students post short help requests and view the 10 most recent ones. PostgreSQL is the
permanent store; Redis caches the latest-requests list for 60 seconds and tracks a
view counter. Built with Next.js (App Router), the `pg` package, and the `redis` package.

## Stack

- Next.js 15 (App Router, Route Handlers, TypeScript)
- PostgreSQL (`pg`) — source of truth
- Redis (`redis` v4) — 60s cache for `help:latest`, counter for `help:views`

## Project structure

```
helpdesk-app/
├── app/
│   ├── page.tsx                       # form + request list + source/view labels
│   └── api/
│       ├── requests/route.ts          # GET (cached list) / POST (create)
│       ├── requests/[id]/resolve/route.ts  # bonus: mark resolved
│       └── views/route.ts             # INCR help:views
├── lib/
│   ├── db.ts                          # pg Pool singleton
│   └── redis.ts                       # redis client + timeout-safe wrapper
├── sql/schema.sql                     # help_requests table
├── docker-compose.yml                 # local Postgres + Redis
└── .env.local.example
```

## Setup

1. **Start Postgres and Redis.** Easiest via Docker:

   ```bash
   docker compose up -d
   ```

   This also auto-applies `sql/schema.sql` on first run. Without Docker, start your
   own Postgres/Redis and run `sql/schema.sql` against your database manually.

2. **Configure environment variables:**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` if your DB/Redis connection details differ from the defaults.

3. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

## How the caching works

- `GET /api/requests` checks Redis key `help:latest` first.
  - Hit → returns the cached array, `source: "Redis"`.
  - Miss → queries PostgreSQL for the latest 10 (newest first), caches the result in
    Redis with a 60-second TTL, returns `source: "PostgreSQL"`.
- `POST /api/requests` validates both fields are non-empty, inserts into PostgreSQL,
  then deletes (invalidates) the `help:latest` key so the next read is a fresh cache miss.
- `POST /api/views` runs Redis `INCR help:views` on every page load (called from the
  client on mount) — no read-then-write race.
- `POST /api/requests/:id/resolve` (bonus) marks a request resolved in PostgreSQL and
  invalidates `help:latest`.

## Redis-down resilience

Every Redis call goes through `lib/redis.ts#withRedis`, which wraps the connection and
each command in a short timeout and never throws. If Redis is unreachable or times out,
reads/writes fall straight back to PostgreSQL instead of crashing or hanging (`help:views`
reports `null` with an `"error"` field in that case, since there's nothing to increment).

## Manual test checklist (matches the lab's Check section)

1. Post one help request → stored in PostgreSQL.
2. Refresh the board → `source: "PostgreSQL"` (cache miss, then cache populated).
3. Refresh again within 60s → `source: "Redis"` (cache hit).
4. Post another request → cache is invalidated, next read is a miss again.
5. Refresh the page → "Board views" counter increases each time.
6. Submit the form with an empty name/message → inline validation error, no request.
7. Stop Redis (`docker compose stop redis`) and repeat steps 1–2 → app still works,
   reads fall back to PostgreSQL.
