# Kế hoạch làm việc 30 ngày — Collab Editor

> **Dự án:** Real-time Collaborative Document Editor (Distributed Systems Final Project)
> **Thành viên:** An + Bình
> **Bắt đầu:** Ngày 1 tính từ khi khởi động repo

---

## Nguyên tắc phân công

| Nguyên tắc                                    | Mô tả                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Phân theo feature, không theo layer** | Mỗi người sở hữu một tính năng end-to-end — viết cả API lẫn UI                                                 |
| **Contract API trước**                  | Ngày 1–2 thống nhất toàn bộ API schema (`docs/API_CONTRACT.md`). Sau đó làm độc lập, mock endpoint của nhau |
| **Sync cuối tuần**                      | Cuối tuần 1, 2, 3 review code chéo — An đọc code Bình và ngược lại                                              |
| **Shared ownership lớp cốt lõi**       | Docker, Prisma schema, Hocuspocus khởi tạo — cả hai làm cùng nhau tuần 1                                            |

## Phân công tổng quan

| Người           | Sở hữu chính                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **An**      | Auth (API + UI) · Document CRUD (API + UI) · Version history (API + UI)                      |
| **Bình**   | Collab engine (Hocuspocus + Yjs UI) · Permissions (API + UI) · Offline sync (IndexedDB + UI) |
| **Cả hai** | Docker Compose · Prisma schema · Hocuspocus khởi tạo · Testing · Báo cáo               |

---

## Tuần 1 — Ngày 1–7: Nền tảng chung + Auth feature

### Mục tiêu cuối tuần

- Repo chạy được với Docker (PostgreSQL + Redis)
- Auth flow hoàn chỉnh (register → login → JWT)
- WebSocket server kết nối được
- Editor realtime cơ bản hoạt động (2 tab gõ đồng thời)

### Chi tiết nhiệm vụ

| Ngày   | Người           | Layer  | Nhiệm vụ                                                                        | Output                                                             |
| ------- | ----------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| N1      | **Cả hai** | Shared | monorepo setup, Docker Compose, Prisma schema,`API_CONTRACT.md`                 | Repo Git + Docker up + schema 3 model + contract đã thống nhất |
| N2–4   | **An**      | BE     | Auth API:`POST /api/auth/register`, `POST /api/auth/login`, JWT middleware    | Postman test pass, middleware verify token                         |
| N2–4   | **Bình**   | BE     | Hocuspocus server khởi tạo, WebSocket port 1234, persistence hook → PostgreSQL | `wscat` kết nối được, Yjs state lưu vào DB                |
| N5–7   | **An**      | FE     | Login/Register UI,`authStore` (Zustand), route guard `/editor`                | Form hoạt động end-to-end, JWT lưu localStorage                |
| N5–7   | **Bình**   | FE     | Tiptap + Yjs +`y-websocket` → editor cộng tác cơ bản, Toolbar              | 2 tab gõ → xuất hiện realtime, bold/italic/heading             |
| N7 tối | **Cả hai** | Review | Review code chéo tuần 1                                                         | 3–5 comment/PR, hiểu flow của người kia                       |

### Files dự kiến tạo mới

```
server/src/routes/auth.routes.ts
server/src/controllers/auth.controller.ts
server/src/middleware/auth.middleware.ts
server/src/collab/hocuspocus.ts
server/src/collab/persistence.ts
client/src/pages/LoginPage.tsx
client/src/store/authStore.ts
client/src/hooks/useAuth.ts
client/src/services/api.ts
client/src/hooks/useCollabEditor.ts
client/src/components/Editor.tsx
client/src/components/Toolbar.tsx
```

---

## Tuần 2 — Ngày 8–14: Document CRUD + Collab nâng cao (đổi vai)

### Mục tiêu cuối tuần

- Dashboard danh sách document hoàn chỉnh
- WebSocket có auth (token mới vào được room)
- Cursor realtime + UserList
- Redis cache Yjs state
- Kiểm tra end-to-end: đăng ký → login → tạo doc → 2 user cùng edit → reload còn nội dung

### Chi tiết nhiệm vụ

| Ngày    | Người           | Layer  | Nhiệm vụ                                                                                           | Output                                                         |
| -------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| N8–10   | **Bình**   | BE     | CRUD document API:`GET /documents`, `POST /documents`, `DELETE /documents/:id` với auth guard | Postman test pass với JWT                                     |
| N8–10   | **An**      | FE     | Cursor awareness (màu khác nhau mỗi người), UserList realtime                                   | Sidebar hiện danh sách online, label tên trên cursor       |
| N11–12  | **Bình**   | FE     | Dashboard UI: danh sách document, tạo mới, xóa, click mở EditorPage                             | Dashboard hoạt động, đúng documentId                      |
| N11–12  | **An**      | BE     | Hocuspocus `onAuthenticate` hook: verify JWT trước khi cho WS connect                            | Kết nối không có token bị reject 401                      |
| N13–14  | **An**      | FE     | Collaborative undo/redo (`UndoManager`), `ConnectionStatus` indicator                            | Ctrl+Z chỉ undo của mình, badge Online/Offline/Reconnecting |
| N13–14  | **Bình**   | BE     | Redis cache Yjs state (load từ Redis trước, PostgreSQL fallback)                                  | Server restart không mất state                               |
| N14 tối | **Cả hai** | Review | Review code chéo + integration test thủ công end-to-end                                           | Luồng đầy đủ pass                                         |

### Files dự kiến tạo mới

```
server/src/routes/document.routes.ts
server/src/controllers/document.controller.ts
server/src/collab/auth.ts
client/src/hooks/useAwareness.ts
client/src/components/CollabCursor.tsx
client/src/components/UserList.tsx
client/src/pages/DashboardPage.tsx
client/src/components/DocumentList.tsx
client/src/components/DocumentCard.tsx
client/src/components/ConnectionStatus.tsx
```

---

## Tuần 3 — Ngày 15–21: Tính năng nâng cao (tiếp tục đổi vai)

### Mục tiêu cuối tuần

- Version history: lưu snapshot + xem lại + khôi phục
- Permissions: owner/editor/viewer hoạt động đúng
- Share modal: mời người dùng khác vào document
- Offline editing: gõ offline → reconnect → tự sync

### Chi tiết nhiệm vụ

| Ngày    | Người           | Layer  | Nhiệm vụ                                                                              | Output                                                      |
| -------- | ----------------- | ------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| N15–17  | **An**      | BE     | Snapshot API:`GET /documents/:id/versions`, tự động lưu sau 30s có thay đổi    | Danh sách versions + Yjs binary trả về                   |
| N15–17  | **Bình**   | BE     | Permission API:`POST /documents/:id/members`, viewer bị reject khi write WS          | Viewer kết nối được nhưng không ghi được          |
| N18–19  | **Bình**   | FE     | Version history UI: sidebar timeline, read-only preview, nút "Khôi phục"             | Click version → editor read-only hiện nội dung cũ       |
| N18–19  | **An**      | FE     | Share modal: nhập email + chọn role, MemberList, disable toolbar nếu là viewer      | Modal share hoạt động, toolbar disable đúng role       |
| N20–21  | **Bình**   | FE     | `y-indexeddb`: offline editing, auto-sync khi reconnect, `OfflineBadge`             | Ngắt mạng → gõ bình thường → kết nối lại → sync |
| N20–21  | **An**      | BE     | Reconnect handler: server gửi lại full document state, xử lý edge case offline lâu | Client reconnect nhận đủ state mới nhất                |
| N21 tối | **Cả hai** | Review | Review code chéo tuần 3 + demo nội bộ toàn tính năng                             | Demo đủ luồng + ghi bug list                             |

### Files dự kiến tạo mới

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

---

## Tuần 4 — Ngày 22–30: Test, fix, báo cáo

### Mục tiêu cuối tuần

- Test tự động pass (Playwright + load test)
- Critical bug đã fix, UI polish xong
- Báo cáo kiến trúc hoàn chỉnh
- Video demo 5 phút + nộp bài

### Chi tiết nhiệm vụ

| Ngày   | Người           | Nhiệm vụ                                                                   | Output                                       |
| ------- | ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| N22–23 | **An**      | Playwright: login → tạo doc → 2 tab cùng edit → cursor sync → logout   | Test headless pass                           |
| N22–23 | **Bình**   | Load test: 10 WS client đồng thời, monitor latency                        | Server không crash, latency < 200ms         |
| N24–26 | **Cả hai** | Fix bug chéo (An sửa bug BE, Bình sửa bug FE), loading/toast/empty state | Critical bug fixed, UI polish xong           |
| N27–28 | **An**      | Viết `docs/collab-architecture.md`: Yjs CRDT, Hocuspocus, offline sync    | Giải thích được phần Bình làm chính |
| N27–28 | **Bình**   | Viết `docs/api-architecture.md`: auth, document API, database schema      | Giải thích được phần An làm chính    |
| N29–30 | **Cả hai** | Demo video 5 phút + nộp bài                                               | Cả hai thuyết trình được mọi phần    |

### Files dự kiến tạo mới

```
client/tests/collab.spec.ts
client/tests/auth.spec.ts
server/tests/load.test.ts
server/tests/ws-stress.ts
docs/collab-architecture.md
docs/api-architecture.md
```

---

## Checklist tổng quan theo tuần

- [ ] **Tuần 1** — Nền tảng + Auth + Editor cơ bản

  - [X] N1: Docker up, Prisma migrate, API contract thống nhất
  - [ ] N2–4: Auth API (An) + Hocuspocus server (Bình)
  - [ ] N5–7: Auth UI (An) + Editor Yjs (Bình)
  - [ ] N7: Review code chéo
- [ ] **Tuần 2** — Document CRUD + Collab nâng cao

  - [ ] N8–10: Document API (Bình) + Cursor awareness (An)
  - [ ] N11–12: Dashboard UI (Bình) + WS auth hook (An)
  - [ ] N13–14: Undo/ConnectionStatus (An) + Redis cache (Bình)
  - [ ] N14: Review + integration test
- [ ] **Tuần 3** — Version, Permissions, Offline

  - [ ] N15–17: Snapshot API (An) + Permission API (Bình)
  - [ ] N18–19: Version UI (Bình) + Share modal (An)
  - [ ] N20–21: Offline IndexedDB (Bình) + Reconnect BE (An)
  - [ ] N21: Review + demo nội bộ
- [ ] **Tuần 4** — Test, fix, docs, nộp

  - [ ] N22–23: Playwright test (An) + Load test (Bình)
  - [ ] N24–26: Bug fix chéo + UI polish
  - [ ] N27–28: Viết docs kiến trúc (đổi chéo)
  - [ ] N29–30: Demo video + nộp bài

---

## Ghi chú theo dõi tiến độ

> Cập nhật trạng thái tại đây sau mỗi sync point.

| Ngày         | Trạng thái    | Ghi chú |
| ------------- | --------------- | -------- |
| Tuần 1 cuối | ⬜ Chưa review |          |
| Tuần 2 cuối | ⬜ Chưa review |          |
| Tuần 3 cuối | ⬜ Chưa review |          |
| Tuần 4 nộp  | ⬜ Chưa nộp   |          |
