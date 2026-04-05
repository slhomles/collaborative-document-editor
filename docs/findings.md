# Findings — Collab Editor

> Research, discoveries, and technical notes gathered during development.

---

## Architecture Observations

### Two-Server Design
- **Express HTTP** (port 3000): REST API for auth, document CRUD, sharing
- **Hocuspocus WebSocket** (port 1234): real-time CRDT state sync via Yjs
- Both started from `server/src/index.ts`

### Persistence Strategy
- `server/src/collab/persistence.ts` implements dual-storage:
  - **Redis** (24h TTL): fast reads, loaded first on document open
  - **PostgreSQL** (`Document.yjsState` binary): durable, written on each change
  - Load order: Redis → PostgreSQL fallback

### Auth Flow
- JWT-based auth via `server/src/middleware/auth.middleware.ts`
- Client stores token in Zustand + localStorage (`client/src/store/authStore.ts`)
- Hocuspocus validates JWT on WebSocket connection

### Collaboration Stack (Client)
- `client/src/hooks/useCollabEditor.ts`: creates Yjs doc + y-websocket provider + y-indexeddb
- Passes Yjs doc to Tiptap collaboration extensions
- Cursor awareness via `client/src/hooks/useAwareness.ts`

---

## Implementation Status (as of Day 11)

### Existing source files
```
server/src/index.ts (944B)
server/src/collab/hocuspocus.ts (41 lines)
server/src/collab/persistence.ts (80 lines)
server/src/controllers/auth.controller.ts (55 lines)
server/src/controllers/document.controller.ts (exists)
server/src/middleware/auth.middleware.ts (22 lines)
server/src/middleware/error.middleware.ts (exists)
server/src/routes/auth.routes.ts (9 lines)
server/src/routes/document.routes.ts (exists)

client/src/main.tsx (995B)
client/src/store/authStore.ts (27 lines)
client/src/services/api.ts (exists)
client/src/hooks/useAuth.ts (exists)
client/src/hooks/useCollabEditor.ts (59 lines)
client/src/hooks/useAwareness.ts (exists)
client/src/pages/LoginPage.tsx (59 lines)
client/src/pages/DashboardPage.tsx (exists)
client/src/pages/EditorPage.tsx (exists)
client/src/components/Editor.tsx (50 lines)
client/src/components/Toolbar.tsx (exists)
client/src/components/CollabCursor.tsx (exists)
client/src/components/UserList.tsx (exists)
client/src/components/DocumentList.tsx (exists)

prisma/schema.prisma (exists)
```

### Prisma Schema Models
- User, Document, DocumentMember (with roles: OWNER, EDITOR, VIEWER)
- Document has `yjsState` binary field for CRDT persistence

---

## Technical Notes

*(Add technical discoveries, gotchas, and solutions here during development)*
