# Task Plan — Collab Editor (30-Day Sprint)

> **Goal:** Build a real-time collaborative document editor with CRDT, WebSocket sync, offline support, and role-based permissions.
> **Team:** An + Binh | **Start date:** ~2026-03-25 | **Deadline:** ~2026-04-24
> **Today:** 2026-04-05 (approximately Day 11)

---

## Current State Summary

**Completed (Day 1–4):**
- Monorepo, Docker Compose, Prisma schema, API contract
- Hocuspocus server with WebSocket port 1234, persistence hook → PostgreSQL
- Auth API (register/login/getMe), JWT middleware
- Redis + PostgreSQL dual persistence for Yjs state
- Auth UI (LoginPage, authStore, route guard)
- Collab editor (Tiptap + Yjs + y-websocket + y-indexeddb)
- Basic editor toolbar, DashboardPage, DocumentList
- Cursor awareness (CollabCursor, UserList, useAwareness)

**Files exist but implementation status needs verification:**
- `server/src/controllers/document.controller.ts` — Document CRUD
- `client/src/pages/DashboardPage.tsx` — Dashboard UI
- `client/src/components/DocumentList.tsx` — Document list

---

## Phase 1: Week 1 Completion — Auth + Editor Basic `complete`

| Task | Owner | Status |
|------|-------|--------|
| N1: monorepo, Docker, Prisma, API contract | Both | complete |
| N2-4 An: Auth API (register/login, JWT middleware) | An | complete |
| N2-4 Binh: Hocuspocus server, persistence hook | Binh | complete |
| N5-7 An: Login/Register UI, authStore, route guard | An | complete |
| N5-7 Binh: Tiptap + Yjs + y-websocket, Toolbar | Binh | complete |
| N7: Cross-review week 1 | Both | pending |

## Phase 2: Week 2 — Document CRUD + Advanced Collab `in_progress`

| Task | Owner | Status |
|------|-------|--------|
| N8-10 Binh: CRUD document API (GET/POST/DELETE /documents) | Binh | needs_verification |
| N8-10 An: Cursor awareness, UserList realtime | An | needs_verification |
| N11-12 Binh: Dashboard UI (document list, create/delete) | Binh | needs_verification |
| N11-12 An: Hocuspocus onAuthenticate hook (JWT verify WS) | An | needs_verification |
| N13-14 An: Collaborative undo/redo, ConnectionStatus UI | An | not_started |
| N13-14 Binh: Redis cache Yjs state (Redis-first, PG fallback) | Binh | needs_verification |
| N14: Cross-review + integration test | Both | not_started |

## Phase 3: Week 3 — Advanced Features `not_started`

| Task | Owner | Status |
|------|-------|--------|
| N15-17 An: Snapshot API (GET /documents/:id/versions, auto-save 30s) | An | not_started |
| N15-17 Binh: Permission API (POST /documents/:id/members, viewer WS block) | Binh | not_started |
| N18-19 Binh: Version history UI (sidebar timeline, preview, restore) | Binh | not_started |
| N18-19 An: Share modal (email + role, MemberList, viewer toolbar disable) | An | not_started |
| N20-21 Binh: y-indexeddb offline editing, auto-sync, OfflineBadge | Binh | not_started |
| N20-21 An: Reconnect handler (full state resend, offline edge cases) | An | not_started |
| N21: Cross-review + internal demo | Both | not_started |

## Phase 4: Week 4 — Test, Fix, Report `not_started`

| Task | Owner | Status |
|------|-------|--------|
| N22-23 An: Playwright E2E tests | An | not_started |
| N22-23 Binh: Load test (10 concurrent WS clients, latency <200ms) | Binh | not_started |
| N24-26: Cross bug fix + UI polish | Both | not_started |
| N27-28 An: docs/collab-architecture.md | An | not_started |
| N27-28 Binh: docs/api-architecture.md | Binh | not_started |
| N29-30: Demo video 5 min + submit | Both | not_started |

---

## Files Still Needed (not yet created)

### Week 2 (remaining)
```
client/src/components/ConnectionStatus.tsx
client/src/components/DocumentCard.tsx
server/src/collab/auth.ts
```

### Week 3
```
server/src/routes/version.routes.ts
server/src/controllers/version.controller.ts
server/src/middleware/permission.middleware.ts
server/src/routes/member.routes.ts
client/src/components/VersionHistory.tsx
client/src/components/VersionPanel.tsx
client/src/components/ShareModal.tsx
client/src/components/MemberList.tsx
client/src/components/OfflineBadge.tsx
```

### Week 4
```
client/tests/collab.spec.ts
client/tests/auth.spec.ts
server/tests/load.test.ts
server/tests/ws-stress.ts
docs/collab-architecture.md
docs/api-architecture.md
```

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| Day 1 | Dual persistence: Redis (24h TTL) + PostgreSQL | Fast reads from Redis, durable writes to PG |
| Day 1 | Two-server design: Express (3000) + Hocuspocus (1234) | Separate REST and WebSocket concerns |
| Day 1 | Feature-based task split (not layer-based) | Each person owns end-to-end feature |

---

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | — | — |
