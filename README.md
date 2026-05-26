# Collab Editor — Trình soạn thảo tài liệu cộng tác thời gian thực

Đồ án môn **Hệ phân tán (Distributed Systems)**. Ứng dụng cho phép nhiều người cùng soạn thảo một tài liệu trong thời gian thực, không xung đột, nhờ **CRDT (Yjs)** đồng bộ qua **WebSocket (Hocuspocus)**, kết hợp chiến lược **lưu trữ hai tầng Redis + PostgreSQL**.

> Công nghệ: React 18 · TypeScript · Tiptap · Yjs CRDT · Hocuspocus · Node.js/Express · PostgreSQL (Prisma) · Redis · JWT · Docker · pnpm

---

## Mục lục

1. [Tính năng chính](#1-tính-năng-chính)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Yêu cầu môi trường](#4-yêu-cầu-môi-trường)
5. [Cài đặt & chạy dự án](#5-cài-đặt--chạy-dự-án)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [Tài liệu API](#7-tài-liệu-api)
8. [Biến môi trường](#8-biến-môi-trường)
9. [Kết quả đạt được](#9-kết-quả-đạt-được)
10. [Phân công & kế hoạch](#10-phân-công--kế-hoạch)
11. [Ghi chú](#11-ghi-chú)

---

## 1. Tính năng chính

- **Soạn thảo cộng tác thời gian thực** — nhiều người cùng gõ trên một tài liệu, hợp nhất không xung đột bằng CRDT (Yjs).
- **Con trỏ & danh sách người online** — hiển thị con trỏ kèm tên/màu của từng người (Yjs Awareness), sidebar liệt kê ai đang mở tài liệu.
- **Undo/Redo cộng tác** — hoàn tác chỉ áp dụng cho thay đổi của chính mình (Yjs UndoManager), không đụng vào nội dung người khác.
- **Phân quyền & chia sẻ** — vai trò `OWNER` / `EDITOR` / `VIEWER`; mời thành viên qua email; người xem (VIEWER) chỉ đọc, bị chặn ghi ngay ở tầng WebSocket; chia sẻ công khai theo liên kết.
- **Lịch sử phiên bản** — tự động chốt phiên bản (auto-version kiểu Google Docs), lưu thủ công, xem lại read-only, so sánh và khôi phục.
- **Hoạt động offline** — soạn thảo khi mất mạng nhờ IndexedDB, tự đồng bộ khi kết nối lại; chỉ báo trạng thái kết nối (đang kết nối / trực tuyến / mất kết nối / lưu cục bộ).
- **Cache Redis** — nạp trạng thái tài liệu từ Redis trước, fallback PostgreSQL; tài liệu không mất khi server khởi động lại.
- **Tìm kiếm theo tên + nội dung** — tìm cả tiêu đề lẫn nội dung văn bản, ưu tiên kết quả khớp tên trước.
- **Quản lý tài liệu** — tạo/xóa, đổi tên trực tiếp (trong editor & dashboard), gắn dấu sao, lịch sử xem gần đây, lọc theo người/thời gian, xem dạng lưới/danh sách.
- **Thanh công cụ kiểu Google Docs** — kiểu đoạn (tiêu đề/văn bản), phông chữ, cỡ chữ, đậm/nghiêng/gạch chân, màu chữ, tô nền, liên kết, chèn ảnh, căn lề, danh sách (bullet/số/checklist), xóa định dạng, in.

---

## 2. Kiến trúc hệ thống

Hệ thống gồm **ba tầng** và backend chạy **hai server song song**.

![Kiến trúc tổng quan ba tầng](report_assets/fig1_architecture.png)

### Thiết kế hai server (backend)

Backend khởi động đồng thời hai server từ [server/src/index.ts](server/src/index.ts):

1. **Express HTTP server** (cổng `3000`) — REST API: xác thực, CRUD tài liệu, chia sẻ/phân quyền, phiên bản, tìm kiếm.
2. **Hocuspocus WebSocket server** (cổng `1234`) — đồng bộ trạng thái CRDT thời gian thực.

Client kết nối **cả hai**: HTTP để lấy dữ liệu/thao tác ban đầu, WebSocket để cộng tác trực tiếp.

### Luồng cộng tác (CRDT)

- Mỗi tài liệu là một **Yjs Document**; mọi chỉnh sửa là thao tác CRDT nên hợp nhất tự động, không xung đột.
- Client dùng `HocuspocusProvider` (WebSocket) để đồng bộ và `y-indexeddb` để lưu offline; truyền Yjs doc vào extension Collaboration của Tiptap ([client/src/hooks/useCollabEditor.ts](client/src/hooks/useCollabEditor.ts)).

![Trình tự đồng bộ realtime](report_assets/fig4_realtime_sync_sequence.png)

![Hội tụ CRDT khi sửa đồng thời](report_assets/fig3_crdt_convergence.png)

### Lưu trữ hai tầng

[server/src/collab/persistence.ts](server/src/collab/persistence.ts):

- **Redis** (TTL 24h) — đọc nhanh, nạp đầu tiên khi mở tài liệu; ghi có throttle ~300ms để giảm tải.
- **PostgreSQL** (`Document.yjsState` dạng nhị phân) — lưu bền, ghi khi lưu tài liệu.
- Khi mở: Redis → fallback PostgreSQL. Đồng thời trích text thuần vào `contentPreview` phục vụ tìm kiếm nội dung.

![Lưu trữ hai tầng Redis + PostgreSQL](report_assets/fig5_persistence.png)

### Mô hình phân quyền & xác thực WebSocket

- [prisma/schema.prisma](prisma/schema.prisma): `Document` có `ownerId` và bảng `DocumentMember` với vai trò `OWNER` / `EDITOR` / `VIEWER`.
- Hocuspocus xác thực JWT và kiểm tra quyền trước khi cho kết nối; VIEWER được đặt `connection.readOnly = true` → server tự từ chối thông điệp ghi ([server/src/collab/hocuspocus.ts](server/src/collab/hocuspocus.ts)).
- REST cũng kiểm tra quyền sở hữu/thành viên ở [server/src/controllers/document.controller.ts](server/src/controllers/document.controller.ts).

![Trình tự xác thực WebSocket](report_assets/fig2_ws_auth_sequence.png)

---

## 3. Công nghệ sử dụng

| Tầng | Công nghệ |
| --- | --- |
| **Frontend** | React 18, Vite, TypeScript, Tiptap (ProseMirror), TailwindCSS |
| **Cộng tác** | Yjs (CRDT), `@hocuspocus/provider` (WebSocket), `y-indexeddb` (offline) |
| **Backend** | Node.js, Express.js, Hocuspocus Server |
| **Cơ sở dữ liệu** | PostgreSQL + Prisma ORM, Redis (ioredis) |
| **Xác thực** | JWT, bcrypt |
| **Hạ tầng & công cụ** | Docker, Docker Compose, pnpm (monorepo workspaces) |

---

## 4. Yêu cầu môi trường

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Docker** & **Docker Compose**

---

## 5. Cài đặt & chạy dự án

### Bước 1 — Chuẩn bị

```bash
git clone <repo-url>
cd collab-editor
cp .env.example .env        # tạo file cấu hình môi trường
pnpm install                # cài dependencies cho cả client & server
```

### Bước 2 — Chạy ở chế độ phát triển (khuyến nghị)

```bash
# Khởi động PostgreSQL + Redis bằng Docker
docker compose -f docker/docker-compose.yml up -d postgres redis

# Áp migration cơ sở dữ liệu
cd server && pnpm prisma migrate dev && cd ..

# Chạy song song client + server
pnpm dev
```

### Bước 3 — (Tuỳ chọn) Chạy toàn bộ bằng Docker

```bash
docker compose -f docker/docker-compose.yml up -d
```

### Các cổng dịch vụ

| Dịch vụ | URL / Cổng |
| --- | --- |
| Client (Vite) | http://localhost:5173 |
| REST API (Express) | http://localhost:3000 |
| WebSocket (Hocuspocus) | ws://localhost:1234 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Lệnh hữu ích

```bash
pnpm build        # build cả hai workspace
pnpm lint         # lint cả hai workspace
cd server && pnpm prisma studio   # mở GUI xem cơ sở dữ liệu
```

---

## 6. Cấu trúc thư mục

```
collab-editor/
├── client/                 # Frontend React + Vite
│   └── src/
│       ├── pages/          # LoginPage, DashboardPage, EditorPage
│       ├── components/     # Toolbar, Editor, ShareModal, VersionPanel,
│       │                   # ConnectionStatus, UserList, CollabCursor,
│       │                   # DocumentList, EditableTitle, ...
│       ├── hooks/          # useCollabEditor, useAwareness, useAuth, useDocumentRole
│       ├── services/       # api.ts (axios)
│       └── store/          # authStore (Zustand)
├── server/                 # Backend Express + Hocuspocus
│   └── src/
│       ├── index.ts        # khởi động HTTP + WebSocket server
│       ├── collab/         # hocuspocus.ts, persistence.ts (Redis + Postgres)
│       ├── controllers/    # auth, document, member, version
│       ├── routes/         # auth.routes, document.routes
│       └── middleware/     # auth.middleware (JWT)
├── prisma/                 # schema.prisma + migrations
├── docker/                 # docker-compose.yml, Dockerfile
└── docs/                   # API_CONTRACT.md, WORK_PLAN.md
```

---

## 7. Tài liệu API

Tất cả endpoint (trừ đăng ký/đăng nhập) yêu cầu header `Authorization: Bearer <token>`.

### Xác thực — `/api/auth`

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập, trả về JWT |
| GET | `/me` | Thông tin người dùng hiện tại |
| GET | `/users` | Danh sách người dùng (phục vụ chia sẻ) |

### Tài liệu — `/api/documents`

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/` | Danh sách tài liệu của tôi / được chia sẻ |
| POST | `/` | Tạo tài liệu mới |
| GET | `/search?q=` | Tìm kiếm theo tên + nội dung (ưu tiên tên) |
| GET | `/:id` | Chi tiết tài liệu + vai trò hiện tại |
| PATCH | `/:id` | Đổi tên / cấu hình chia sẻ |
| DELETE | `/:id` | Xóa (soft delete) — chỉ chủ sở hữu |
| POST / DELETE | `/:id/star` | Gắn / bỏ gắn dấu sao |
| POST | `/:id/view` | Ghi nhận lượt xem (lịch sử gần đây) |
| POST | `/:id/members` | Thêm/cập nhật thành viên (email + vai trò) |
| DELETE | `/:id/members/:userId` | Gỡ thành viên |
| GET | `/:id/versions` | Danh sách phiên bản |
| POST | `/:id/versions` | Tạo phiên bản (lưu thủ công) |
| GET | `/:id/versions/:versionId` | Lấy nội dung một phiên bản |

> Chi tiết request/response xem thêm [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## 8. Biến môi trường

Sao chép `.env.example` → `.env` tại thư mục gốc.

| Biến | Mô tả | Mặc định |
| --- | --- | --- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://postgres:postgres@localhost:5432/collab_editor` |
| `REDIS_URL` | Chuỗi kết nối Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Khóa bí mật ký JWT | — |
| `JWT_EXPIRES_IN` | Thời hạn token | `7d` |
| `PORT` | Cổng HTTP API | `3000` |
| `HOCUSPOCUS_PORT` | Cổng WebSocket | `1234` |
| `VITE_API_URL` | URL API cho client (đặt lúc build) | `http://localhost:3000/api` |
| `VITE_WS_URL` | URL WebSocket cho client (đặt lúc build) | `ws://localhost:1234` |

---

## 9. Kết quả đạt được

Toàn bộ tính năng đã hoạt động end-to-end. Dưới đây là ảnh chụp thực tế ứng dụng đang chạy.

### Đăng nhập / Đăng ký

![Trang đăng nhập](report_assets/login.png)

### Trang chủ — quản lý tài liệu

Danh sách tài liệu với tab (Tài liệu của tôi / Được chia sẻ / Gần đây / Có gắn dấu sao), thanh tìm kiếm, bộ lọc theo người & thời gian, chế độ lưới/danh sách.

![Dashboard](report_assets/dashboard.png)

### Tìm kiếm theo tên + nội dung

![Kết quả tìm kiếm](report_assets/dashboard-search.png)

### Trình soạn thảo + thanh công cụ kiểu Google Docs

Thanh công cụ đầy đủ: kiểu đoạn, phông, cỡ chữ, B/I/U, màu chữ, tô nền, liên kết, ảnh, căn lề, danh sách/checklist, xóa định dạng. Góc phải hiển thị trạng thái kết nối và nút chia sẻ.

![Editor và toolbar](report_assets/editor-toolbar.png)

### Đổi tên tài liệu trực tiếp

![Đổi tên inline](report_assets/rename.png)

### Chia sẻ & phân quyền

![Modal chia sẻ](report_assets/share-modal.png)

### Lịch sử phiên bản

![Phiên bản tài liệu](report_assets/version-history.png)

### Cộng tác thời gian thực

Hai người cùng mở một tài liệu: con trỏ kèm nhãn tên hiển thị trực tiếp, danh sách "Đang online" cập nhật theo thời gian thực.

![Cộng tác realtime với con trỏ](report_assets/collab-cursors.png)

> Ảnh minh hoạ được lưu trong thư mục `report_assets/` (đã được liệt kê trong `.gitignore`, không đẩy lên Git).

---

## 10. Phân công & kế hoạch

Dự án thực hiện theo kế hoạch 30 ngày, phân công theo **tính năng end-to-end** (mỗi người làm cả API lẫn UI), đổi vai theo tuần và review chéo cuối tuần.

| Người | Mảng phụ trách chính |
| --- | --- |
| **An** | Auth, Document CRUD, Version history (API + UI) |
| **Bình** | Collab engine (Hocuspocus/Yjs), Permissions, Offline sync (API + UI) |
| **Cả hai** | Docker, Prisma schema, khởi tạo Hocuspocus, kiểm thử, báo cáo |

> Chi tiết lộ trình theo tuần xem [docs/WORK_PLAN.md](docs/WORK_PLAN.md).

---

## 11. Ghi chú

- **Cổng PostgreSQL:** `.env` mặc định dùng `5432`. File [docker/docker-compose.yml](docker/docker-compose.yml) có thể map ra cổng khác — nếu kết nối thất bại, kiểm tra cho khớp cổng publish của container Postgres.
- **Migrations:** thư mục `prisma/migrations/` nằm trong `.gitignore`. Sau khi kéo code có thay đổi schema, chạy lại `cd server && pnpm prisma migrate dev` để cập nhật cơ sở dữ liệu cục bộ.
- **Ảnh báo cáo:** thư mục `report_assets/` được gitignore; dùng để chứa ảnh minh hoạ cho README/báo cáo, không phải một phần mã nguồn.
