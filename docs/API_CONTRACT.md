# API Contract

> Tài liệu thống nhất toàn bộ REST API và WebSocket protocol giữa **An** và **Bình**.
> Mọi endpoint đều tuân theo format này — FE và BE có thể làm độc lập dựa trên contract.

**Base URL:** `http://localhost:3000/api`
**WebSocket URL:** `ws://localhost:1234`

---

## Quy ước chung

### Authentication

Tất cả endpoint có 🔒 đều yêu cầu header:

```
Authorization: Bearer <jwt_token>
```

### Response format

**Thành công:**

```json
{
  "data": { ... }
}
```

**Lỗi:**

```json
{
  "error": "Mô tả lỗi"
}
```

### HTTP Status Codes

| Code | Ý nghĩa                    |
| ---- | --------------------------- |
| 200  | Thành công                  |
| 201  | Tạo mới thành công          |
| 400  | Request body thiếu/sai      |
| 401  | Chưa đăng nhập / token sai  |
| 403  | Không có quyền              |
| 404  | Không tìm thấy              |
| 409  | Conflict (email đã tồn tại) |
| 500  | Lỗi server                  |

---

## 1. Authentication — `An phụ trách`

### POST `/api/auth/register`

Đăng ký tài khoản mới.

**Request:**

```json
{
  "email": "an@example.com",
  "name": "An",
  "password": "mypassword123"
}
```

**Response `201`:**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-string",
      "email": "an@example.com",
      "name": "An",
      "createdAt": "2026-03-24T10:00:00.000Z"
    }
  }
}
```

**Lỗi:**

| Code | Khi nào                             |
| ---- | ----------------------------------- |
| 400  | Thiếu email / name / password       |
| 409  | Email đã được đăng ký              |

---

### POST `/api/auth/login`

Đăng nhập.

**Request:**

```json
{
  "email": "an@example.com",
  "password": "mypassword123"
}
```

**Response `200`:**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-string",
      "email": "an@example.com",
      "name": "An",
      "createdAt": "2026-03-24T10:00:00.000Z"
    }
  }
}
```

**Lỗi:**

| Code | Khi nào                     |
| ---- | --------------------------- |
| 400  | Thiếu email / password      |
| 401  | Sai email hoặc password    |

---

### GET `/api/auth/me` 🔒

Lấy thông tin user hiện tại.

**Response `200`:**

```json
{
  "data": {
    "id": "uuid-string",
    "email": "an@example.com",
    "name": "An",
    "avatarUrl": null,
    "createdAt": "2026-03-24T10:00:00.000Z"
  }
}
```

---

## 2. Documents — `An phụ trách CRUD` / `Bình phụ trách Members`

### GET `/api/documents` 🔒

Danh sách tất cả document mà user sở hữu hoặc được share.

**Response `200`:**

```json
{
  "data": [
    {
      "id": "doc-uuid",
      "title": "Báo cáo nhóm",
      "ownerId": "user-uuid",
      "contentPreview": "Chương 1: Giới thiệu...",
      "isDeleted": false,
      "createdAt": "2026-03-24T10:00:00.000Z",
      "updatedAt": "2026-03-24T12:30:00.000Z",
      "owner": {
        "id": "user-uuid",
        "name": "An",
        "email": "an@example.com"
      },
      "members": [
        {
          "id": "member-uuid",
          "userId": "user-uuid-2",
          "role": "EDITOR",
          "user": {
            "id": "user-uuid-2",
            "name": "Bình",
            "email": "binh@example.com"
          }
        }
      ]
    }
  ]
}
```

---

### POST `/api/documents` 🔒

Tạo document mới. User tạo tự động là owner.

**Request:**

```json
{
  "title": "Báo cáo nhóm"
}
```

`title` là optional — mặc định `"Untitled"`.

**Response `201`:**

```json
{
  "data": {
    "id": "doc-uuid",
    "title": "Báo cáo nhóm",
    "ownerId": "user-uuid",
    "createdAt": "2026-03-24T10:00:00.000Z",
    "updatedAt": "2026-03-24T10:00:00.000Z"
  }
}
```

---

### GET `/api/documents/:id` 🔒

Chi tiết 1 document. Chỉ owner hoặc member mới truy cập được.

**Response `200`:**

```json
{
  "data": {
    "id": "doc-uuid",
    "title": "Báo cáo nhóm",
    "ownerId": "user-uuid",
    "contentPreview": "Chương 1: Giới thiệu...",
    "createdAt": "2026-03-24T10:00:00.000Z",
    "updatedAt": "2026-03-24T12:30:00.000Z",
    "owner": {
      "id": "user-uuid",
      "name": "An",
      "email": "an@example.com"
    },
    "members": [
      {
        "id": "member-uuid",
        "userId": "user-uuid-2",
        "role": "EDITOR",
        "joinedAt": "2026-03-24T11:00:00.000Z",
        "user": {
          "id": "user-uuid-2",
          "name": "Bình",
          "email": "binh@example.com"
        }
      }
    ]
  }
}
```

**Lỗi:**

| Code | Khi nào                                    |
| ---- | ------------------------------------------ |
| 403  | User không phải owner và không phải member |
| 404  | Document không tồn tại                     |

---

### PATCH `/api/documents/:id` 🔒

Cập nhật tiêu đề. Yêu cầu: **owner** hoặc **EDITOR**.

**Request:**

```json
{
  "title": "Báo cáo nhóm v2"
}
```

**Response `200`:**

```json
{
  "data": {
    "id": "doc-uuid",
    "title": "Báo cáo nhóm v2",
    "updatedAt": "2026-03-24T13:00:00.000Z"
  }
}
```

**Lỗi:**

| Code | Khi nào                                |
| ---- | -------------------------------------- |
| 403  | User là VIEWER hoặc không có quyền    |
| 404  | Document không tồn tại                 |

---

### DELETE `/api/documents/:id` 🔒

Xóa document (soft delete). Chỉ **owner** mới được xóa.

**Response `200`:**

```json
{
  "data": {
    "message": "Document deleted"
  }
}
```

**Lỗi:**

| Code | Khi nào                    |
| ---- | -------------------------- |
| 403  | Không phải owner           |
| 404  | Document không tồn tại     |

---

## 3. Document Members — `Bình phụ trách`

### POST `/api/documents/:id/members` 🔒

Thêm hoặc cập nhật quyền member. Chỉ **owner** mới thực hiện được.
Nếu user đã là member → cập nhật role (upsert).

**Request:**

```json
{
  "email": "binh@example.com",
  "role": "EDITOR"
}
```

`role` nhận một trong: `"VIEWER"` | `"EDITOR"` | `"OWNER"`

**Response `200`:**

```json
{
  "data": {
    "id": "member-uuid",
    "documentId": "doc-uuid",
    "userId": "user-uuid-2",
    "role": "EDITOR",
    "joinedAt": "2026-03-24T11:00:00.000Z",
    "user": {
      "id": "user-uuid-2",
      "name": "Bình",
      "email": "binh@example.com"
    }
  }
}
```

**Lỗi:**

| Code | Khi nào                                       |
| ---- | --------------------------------------------- |
| 400  | Thiếu email / role không hợp lệ              |
| 403  | Không phải owner                              |
| 404  | Document hoặc user (email) không tồn tại      |

---

### DELETE `/api/documents/:id/members/:userId` 🔒

Xóa member khỏi document. Chỉ **owner** mới thực hiện được.

**Response `200`:**

```json
{
  "data": {
    "message": "Member removed"
  }
}
```

**Lỗi:**

| Code | Khi nào                         |
| ---- | ------------------------------- |
| 403  | Không phải owner                |
| 404  | Member không tồn tại            |

---

## 4. Document Versions — `An phụ trách`

### GET `/api/documents/:id/versions` 🔒

Danh sách tất cả snapshot của document, mới nhất trước.
Yêu cầu: owner hoặc member.

**Response `200`:**

```json
{
  "data": [
    {
      "id": "version-uuid",
      "documentId": "doc-uuid",
      "versionNumber": 3,
      "label": "Bản nháp cuối",
      "createdBy": "user-uuid",
      "createdAt": "2026-03-24T14:00:00.000Z",
      "creator": {
        "id": "user-uuid",
        "name": "An"
      }
    },
    {
      "id": "version-uuid-2",
      "documentId": "doc-uuid",
      "versionNumber": 2,
      "label": null,
      "createdBy": "user-uuid",
      "createdAt": "2026-03-24T13:30:00.000Z",
      "creator": {
        "id": "user-uuid",
        "name": "An"
      }
    }
  ]
}
```

---

### GET `/api/documents/:id/versions/:versionId` 🔒

Lấy nội dung snapshot cụ thể. Trả Yjs binary dưới dạng base64.

**Response `200`:**

```json
{
  "data": {
    "id": "version-uuid",
    "documentId": "doc-uuid",
    "versionNumber": 3,
    "label": "Bản nháp cuối",
    "yjsSnapshot": "<base64-encoded-binary>",
    "createdBy": "user-uuid",
    "createdAt": "2026-03-24T14:00:00.000Z",
    "creator": {
      "id": "user-uuid",
      "name": "An"
    }
  }
}
```

**Lỗi:**

| Code | Khi nào                              |
| ---- | ------------------------------------ |
| 403  | Không có quyền truy cập document     |
| 404  | Version không tồn tại                |

---

### POST `/api/documents/:id/versions` 🔒

Tạo snapshot thủ công. Yêu cầu: **owner** hoặc **EDITOR**.
Snapshot tự động (mỗi 30s có thay đổi) do Hocuspocus server xử lý — không đi qua endpoint này.

**Request:**

```json
{
  "label": "Bản nháp cuối"
}
```

`label` là optional.

**Response `201`:**

```json
{
  "data": {
    "id": "version-uuid",
    "documentId": "doc-uuid",
    "versionNumber": 4,
    "label": "Bản nháp cuối",
    "createdBy": "user-uuid",
    "createdAt": "2026-03-24T15:00:00.000Z"
  }
}
```

---

### POST `/api/documents/:id/versions/:versionId/restore` 🔒

Khôi phục document về snapshot cũ. Yêu cầu: **owner** hoặc **EDITOR**.
Tạo 1 snapshot mới chứa state hiện tại trước khi restore (để có thể undo).

**Response `200`:**

```json
{
  "data": {
    "message": "Document restored to version 3",
    "backupVersion": {
      "id": "version-uuid-backup",
      "versionNumber": 5,
      "label": "Auto-backup before restore"
    }
  }
}
```

**Lỗi:**

| Code | Khi nào                             |
| ---- | ----------------------------------- |
| 403  | Không phải owner / EDITOR           |
| 404  | Version không tồn tại               |

---

## 5. WebSocket Protocol — `Bình phụ trách`

### Kết nối

```
ws://localhost:1234/<documentId>
```

Client phải gửi JWT token qua connection params:

```typescript
const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: documentId,       // = document UUID
  token: jwtToken,        // JWT từ login/register
  document: ydoc,         // Yjs document instance
});
```

### Authentication flow

1. Client kết nối → gửi `token` trong params
2. Server `onAuthenticate`: verify JWT → extract `userId`
3. Server check: user là owner hoặc member của document?
4. **VIEWER**: cho kết nối nhưng chặn write operations
5. **EDITOR/OWNER**: full read-write access
6. Thất bại → connection bị reject với error message

### Awareness Protocol

Mỗi client broadcast awareness state để hiển thị cursor và user info:

```typescript
provider.setAwarenessField('user', {
  id: user.id,
  name: user.name,
  email: user.email,
  color: '#FF6B6B',     // random color cho cursor
});
```

**Awareness state structure:**

```json
{
  "user": {
    "id": "user-uuid",
    "name": "An",
    "email": "an@example.com",
    "color": "#FF6B6B"
  },
  "cursor": {
    "anchor": 42,
    "head": 42
  }
}
```

### Persistence events

| Event            | Hành vi                                                     |
| ---------------- | ----------------------------------------------------------- |
| `onLoadDocument` | Load Yjs state: Redis → PostgreSQL fallback                |
| `onChange`        | Ghi vào Redis cache (throttled)                            |
| `onStoreDocument`| Ghi vào cả Redis + PostgreSQL (khi document close hoặc interval) |

### Connection status

Client nên handle các trạng thái:

| Status          | Ý nghĩa                          |
| --------------- | --------------------------------- |
| `connected`     | Đang kết nối, sync bình thường   |
| `connecting`    | Đang thử kết nối                 |
| `disconnected`  | Mất kết nối, đang dùng offline   |

---

## 6. Health Check

### GET `/health`

Không cần auth.

**Response `200`:**

```json
{
  "status": "ok"
}
```

---

## Tổng hợp Endpoints

| Method   | Endpoint                                       | Auth | Quyền          | Người phụ trách |
| -------- | ---------------------------------------------- | ---- | --------------- | --------------- |
| POST     | `/api/auth/register`                           | ❌   | —               | An              |
| POST     | `/api/auth/login`                              | ❌   | —               | An              |
| GET      | `/api/auth/me`                                 | 🔒   | —               | An              |
| GET      | `/api/documents`                               | 🔒   | —               | An              |
| POST     | `/api/documents`                               | 🔒   | —               | An              |
| GET      | `/api/documents/:id`                           | 🔒   | owner / member  | An              |
| PATCH    | `/api/documents/:id`                           | 🔒   | owner / EDITOR  | An              |
| DELETE   | `/api/documents/:id`                           | 🔒   | owner           | An              |
| POST     | `/api/documents/:id/members`                   | 🔒   | owner           | Bình            |
| DELETE   | `/api/documents/:id/members/:userId`           | 🔒   | owner           | Bình            |
| GET      | `/api/documents/:id/versions`                  | 🔒   | owner / member  | An              |
| GET      | `/api/documents/:id/versions/:versionId`       | 🔒   | owner / member  | An              |
| POST     | `/api/documents/:id/versions`                  | 🔒   | owner / EDITOR  | An              |
| POST     | `/api/documents/:id/versions/:versionId/restore` | 🔒 | owner / EDITOR  | An              |
| GET      | `/health`                                      | ❌   | —               | Shared          |
| WS       | `ws://localhost:1234/<documentId>`             | 🔒   | owner / member  | Bình            |
