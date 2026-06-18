# EventPulse

EventPulse is a multi-tenant SaaS analytics platform for tracking user and product events, then turning that activity into analytics dashboards.

## Architecture

EventPulse is a Turborepo-style monorepo using Bun as the package manager and Turbo for workspace tasks.

```text
EventPulse/
├─ apps/
│  ├─ web/       # Next.js + TypeScript frontend
│  └─ server/    # Express + TypeScript backend
├─ package.json
├─ turbo.json
└─ bun.lock
```

## Current Features

- Polished landing page for EventPulse.
- Signup and signin UI connected to backend auth APIs.
- Backend signup/signin APIs with JWT auth.
- Protected dashboard using `GET /api/auth/me`.
- Project APIs protected by bearer token auth.
- Temporary in-memory local development store.
- Backend request logging for API hits during development.
- Prisma 7 setup ready for future PostgreSQL persistence.

## Prerequisites

- Bun installed
- Node.js for tooling compatibility
- Git

## Setup

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd EventPulse
bun install
```

Create environment files from the examples:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

Start both apps:

```bash
bun run dev
```

## Environment

Backend environment file:

```text
apps/server/.env
```

Frontend environment file:

```text
apps/web/.env.local
```

If the frontend starts on port `3001` because `3000` is busy, update `FRONTEND_URL` in `apps/server/.env` to `http://localhost:3001`.

## Local URLs

- Frontend: `http://localhost:3000` or `http://localhost:3001`
- Backend: `http://localhost:5001`
- Health check: `http://localhost:5001/health`

## Useful Commands

```bash
bun run dev
bun run build
bun run typecheck
bun run lint
```

## API Examples

```text
GET  /health
POST /api/auth/signup
POST /api/auth/signin
GET  /api/auth/me
POST /api/projects
GET  /api/projects
GET  /api/projects/:id
```

Protected endpoints require:

```text
Authorization: Bearer <token>
```

## Demo Flow

1. Open the frontend at `http://localhost:3000`.
2. Create an account from the signup page.
3. The frontend stores `eventpulse_token` and `eventpulse_user`.
4. The dashboard verifies the token with `GET /api/auth/me`.
5. Sign in later with the same credentials while the backend process is still running.
6. Test project APIs with the saved JWT as a bearer token.

## Current Limitations

- `memoryStore` is temporary and only for local development.
- User and project data reset when the backend server restarts.
- PostgreSQL persistence through Prisma is planned but not wired into controllers yet.
- Event ingestion and analytics processing are planned.
- Queue, worker, and realtime dashboard updates are planned.

## Roadmap

- Add request validation.
- Connect Prisma/PostgreSQL persistence.
- Generate project API keys.
- Add an event ingestion endpoint.
- Add queue and worker processing.
- Build realtime analytics dashboard updates.
- Add rate limiting and stronger tenant isolation checks.
