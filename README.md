# Collab Editor

Real-time collaborative document editor built with Yjs CRDT, Tiptap, Hocuspocus, and React.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tiptap, Yjs
- **Backend**: Node.js, Express, Hocuspocus (WebSocket)
- **Database**: PostgreSQL (Prisma ORM), Redis
- **Auth**: JWT + bcrypt

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose

### Run with Docker

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d
```

### Run locally

```bash
# Install dependencies
pnpm install

# Start PostgreSQL + Redis via Docker
docker compose -f docker/docker-compose.yml up -d postgres redis

# Run database migrations
cd server && pnpm prisma migrate dev

# Start both client and server
pnpm dev
```

- Client: http://localhost:5173
- API Server: http://localhost:3000
- Hocuspocus WS: ws://localhost:1234

## Features

- Real-time collaborative editing (CRDT via Yjs)
- Live cursors showing other users' positions
- Online user presence list
- JWT authentication (owner / editor / viewer roles)
- Document version history (snapshots)
- Offline editing with auto-sync on reconnect
- Collaborative undo/redo (per-user)
