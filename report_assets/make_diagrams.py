# -*- coding: utf-8 -*-
"""Render 5 diagrams (PNG) for the collab-editor technical report.
Uses matplotlib only. White background, black text, Vietnamese-capable font (DejaVu Sans).
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D

plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["font.size"] = 11

OUT = "."

# ---- color palette (light fills, black text) ----
C_CLIENT = "#E3F0FB"
C_SERVER = "#E8F5E9"
C_STORE  = "#FFF3E0"
C_ACCENT = "#FCE4EC"
C_EDGE   = "#37474F"
DPI = 200


def box(ax, x, y, w, h, text, fill="#FFFFFF", edge=C_EDGE, fontsize=11, bold=False, lw=1.4):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.06",
                       linewidth=lw, edgecolor=edge, facecolor=fill, mutation_aspect=1)
    ax.add_patch(p)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fontsize, fontweight="bold" if bold else "normal", color="#111111",
            wrap=True)


def arrow(ax, x1, y1, x2, y2, text="", color=C_EDGE, style="-|>", ls="-", off=0.0, fs=9):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=14,
                        linewidth=1.3, color=color, linestyle=ls,
                        connectionstyle="arc3,rad=0")
    ax.add_patch(a)
    if text:
        ax.text((x1 + x2) / 2 + off, (y1 + y2) / 2, text, ha="center", va="center",
                fontsize=fs, color="#222222",
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.85))


def new_ax(w=11, h=7):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    return fig, ax


def save(fig, name):
    fig.savefig(f"{OUT}/{name}", dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("saved", name)


# =========================================================
# Hình 1 — Kiến trúc tổng thể
# =========================================================
fig, ax = new_ax(11, 8)

# Client tier
box(ax, 8, 78, 84, 18, "", fill=C_CLIENT, edge="#1565C0", lw=1.6)
ax.text(50, 93.5, "TẦNG CLIENT  —  Trình duyệt (React SPA, Vite)", ha="center",
        va="center", fontsize=12, fontweight="bold", color="#0D47A1")
box(ax, 11, 80, 17, 9, "React UI\n+ Tiptap\nEditor", fill="#FFFFFF", fontsize=9)
box(ax, 30, 80, 17, 9, "Yjs Document\n(CRDT\nin-memory)", fill="#FFFFFF", fontsize=9)
box(ax, 49, 80, 19, 9, "Hocuspocus\nProvider\n(WebSocket)", fill="#FFFFFF", fontsize=9)
box(ax, 70, 80, 19, 9, "IndexedDB\n(offline\npersistence)", fill="#FFFFFF", fontsize=9)

# Server tier
box(ax, 8, 40, 84, 22, "", fill=C_SERVER, edge="#2E7D32", lw=1.6)
ax.text(50, 59, "TẦNG SERVER  —  Node.js (server/src/index.ts)", ha="center",
        va="center", fontsize=12, fontweight="bold", color="#1B5E20")
box(ax, 14, 43, 32, 12, "Express HTTP API\n(cổng 3000)\nAuth · Documents · Sharing\nVersions · Search",
    fill="#FFFFFF", fontsize=9.5)
box(ax, 54, 43, 32, 12, "Hocuspocus WebSocket\n(cổng 1234)\nĐồng bộ CRDT realtime\nAuth · Awareness",
    fill="#FFFFFF", fontsize=9.5)

# Storage tier
box(ax, 8, 6, 84, 20, "", fill=C_STORE, edge="#E65100", lw=1.6)
ax.text(50, 23, "TẦNG LƯU TRỮ  —  Dual-layer persistence", ha="center",
        va="center", fontsize=12, fontweight="bold", color="#E65100")
box(ax, 16, 9, 28, 10, "Redis\nCache nhanh · TTL 24h\nKhóa  yjs:<docId>", fill="#FFFFFF", fontsize=9.5)
box(ax, 56, 9, 28, 10, "PostgreSQL (Prisma)\nLưu bền · yjsState (Bytes)\nUser · Document · Version", fill="#FFFFFF", fontsize=9.5)

# arrows client<->server
arrow(ax, 22, 80, 26, 62, "HTTPS / REST\n(JWT Bearer)", color="#1565C0", off=-6, fs=8.5)
arrow(ax, 60, 80, 66, 62, "WebSocket\n(JWT + Yjs sync)", color="#2E7D32", off=7, fs=8.5)
# arrows server<->storage
arrow(ax, 30, 43, 30, 26, "đọc/ghi\nmetadata", color="#E65100", off=-7, fs=8.5)
arrow(ax, 70, 43, 60, 26, "load/store\nYjs state", color="#E65100", off=7, fs=8.5)
arrow(ax, 44, 14, 56, 14, "fallback", color="#888888", style="-|>", fs=8.5)

save(fig, "fig1_architecture.png")


# =========================================================
# Hình 2 — Sequence: Xác thực & thiết lập kết nối WebSocket
# =========================================================
fig, ax = new_ax(11, 7.5)
actors = [
    ("Client\n(HocuspocusProvider)", 14),
    ("Hocuspocus\nWS Server", 38),
    ("getDocumentRole()\n(documentAccess.ts)", 62),
    ("PostgreSQL", 86),
]
top = 92
bottom = 10
for name, x in actors:
    box(ax, x - 11, top, 22, 6, name, fill=C_CLIENT, fontsize=9, bold=True)
    ax.add_line(Line2D([x, x], [bottom, top], color="#90A4AE", lw=1.1, ls=(0, (4, 3))))

def msg(y, x1, x2, text, ret=False, fs=8.8):
    arrow(ax, x1, y, x2, y, "", color="#37474F" if not ret else "#8E24AA",
          style="-|>", ls="-" if not ret else (0, (3, 2)))
    ax.text((x1 + x2) / 2, y + 1.6, text, ha="center", va="bottom", fontsize=fs, color="#222")

msg(84, 14, 38, "1. connect(url, name=docId, token=JWT)")
msg(76, 38, 38, "2. onAuthenticate({token})")
ax.text(38, 70.5, "jwt.verify(token, JWT_SECRET)\n→ payload.userId", ha="center", va="center",
        fontsize=8.3, color="#222", bbox=dict(boxstyle="round,pad=0.25", fc="#FFF9C4", ec="#FBC02D"))
msg(64, 38, 62, "3. getDocumentRole(docId, userId)")
msg(56, 62, 86, "4. SELECT owner, members, publicRole")
msg(48, 86, 62, "5. trả role", ret=True)
ax.text(62, 41, "OWNER / EDITOR / VIEWER\n/ null (Forbidden)", ha="center", va="center",
        fontsize=8.3, color="#222", bbox=dict(boxstyle="round,pad=0.25", fc="#E8F5E9", ec="#43A047"))
msg(35, 62, 38, "6. role", ret=True)
ax.text(38, 28.5, "connection.readOnly =\n!canEditDocument(role)", ha="center", va="center",
        fontsize=8.3, color="#222", bbox=dict(boxstyle="round,pad=0.25", fc="#FCE4EC", ec="#D81B60"))
msg(22, 38, 14, "7. accept / reject (close 4xx)", ret=True)
ax.text(50, 16, "Sau khi chấp nhận: beforeHandleMessage re-check quyền trên TỪNG message\n→ phản ánh thay đổi chia sẻ realtime (thu hồi quyền có hiệu lực ngay).",
        ha="center", va="center", fontsize=8.6, color="#37474F",
        bbox=dict(boxstyle="round,pad=0.35", fc="#ECEFF1", ec="#607D8B"))
save(fig, "fig2_ws_auth_sequence.png")


# =========================================================
# Hình 3 — CRDT convergence example
# =========================================================
fig, ax = new_ax(11, 7)
ax.text(50, 95, "Hai client chỉnh sửa đồng thời  →  CRDT hội tụ về cùng kết quả",
        ha="center", va="center", fontsize=12, fontweight="bold", color="#111")

# initial
box(ax, 36, 82, 28, 8, "Trạng thái ban đầu:  \"A C\"", fill="#ECEFF1", fontsize=11, bold=True)

# left branch (User A)
box(ax, 6, 66, 38, 9, "User A: chèn 'B' GIỮA A và C", fill=C_CLIENT, fontsize=10, bold=True)
box(ax, 6, 54, 38, 9, "Thao tác: insert(id=A1, sau A)\nKý tự 'B' mang ID duy nhất (clientA, 1)", fill="#FFFFFF", fontsize=8.8)
box(ax, 6, 44, 38, 7, "Local: \"A B C\"", fill="#E8F5E9", fontsize=10, bold=True)

# right branch (User B)
box(ax, 56, 66, 38, 9, "User B: chèn 'D' SAU C", fill=C_ACCENT, fontsize=10, bold=True)
box(ax, 56, 54, 38, 9, "Thao tác: insert(id=B1, sau C)\nKý tự 'D' mang ID duy nhất (clientB, 1)", fill="#FFFFFF", fontsize=8.8)
box(ax, 56, 44, 38, 7, "Local: \"A C D\"", fill="#FCE4EC", fontsize=10, bold=True)

arrow(ax, 42, 82, 25, 75, "", color="#1565C0")
arrow(ax, 58, 82, 75, 75, "", color="#D81B60")
arrow(ax, 25, 66, 25, 63, "")
arrow(ax, 75, 66, 75, 63, "")
arrow(ax, 25, 54, 25, 51, "")
arrow(ax, 75, 54, 75, 51, "")

# exchange
box(ax, 22, 30, 56, 8, "Trao đổi update qua Hocuspocus (mỗi op có ID duy nhất + vị trí tương đối)",
    fill="#FFF9C4", edge="#FBC02D", fontsize=9.5, bold=True)
arrow(ax, 25, 44, 38, 38, "", color="#1565C0")
arrow(ax, 75, 44, 62, 38, "", color="#D81B60")

# converged
box(ax, 30, 12, 40, 10, "Hội tụ trên CẢ HAI client:\n\"A B C D\"", fill="#C8E6C9", edge="#2E7D32",
    fontsize=13, bold=True)
arrow(ax, 50, 30, 50, 22, "thứ tự op xác định\nbằng ID → không xung đột", color="#2E7D32", off=22, fs=8.5)
save(fig, "fig3_crdt_convergence.png")


# =========================================================
# Hình 4 — Sequence: Đồng bộ realtime đầu-cuối
# =========================================================
fig, ax = new_ax(11.5, 7.5)
actors = [
    ("User A\n(Tiptap+Yjs)", 11),
    ("Hocuspocus\nServer", 38),
    ("Redis\n/ PostgreSQL", 64),
    ("User B\n(Tiptap+Yjs)", 89),
]
top = 92; bottom = 10
for name, x in actors:
    box(ax, x - 10, top, 20, 6, name, fill=C_CLIENT, fontsize=9, bold=True)
    ax.add_line(Line2D([x, x], [bottom, top], color="#90A4AE", lw=1.1, ls=(0, (4, 3))))

def msg2(y, x1, x2, text, color="#37474F", fs=8.6, ls="-"):
    arrow(ax, x1, y, x2, y, "", color=color, style="-|>", ls=ls)
    ax.text((x1 + x2) / 2, y + 1.5, text, ha="center", va="bottom", fontsize=fs, color="#222")

ax.text(11, 84.5, "gõ phím → Yjs\nsinh update (delta)", ha="center", va="center", fontsize=8.2,
        bbox=dict(boxstyle="round,pad=0.25", fc="#FFF9C4", ec="#FBC02D"))
msg2(78, 11, 38, "1. gửi Yjs update (nhị phân)")
ax.text(38, 71.5, "onChange()", ha="center", va="center", fontsize=8.3,
        bbox=dict(boxstyle="round,pad=0.25", fc="#E8F5E9", ec="#43A047"))
msg2(67, 38, 89, "2. broadcast update tới các client khác", color="#1565C0")
ax.text(89, 60.5, "applyUpdate()\n→ UI cập nhật", ha="center", va="center", fontsize=8.2,
        bbox=dict(boxstyle="round,pad=0.25", fc="#FCE4EC", ec="#D81B60"))
msg2(54, 38, 64, "3. throttledCacheUpdate (Redis, 300ms)", color="#E65100")
msg2(46, 38, 64, "4. scheduleAutoSnapshot (idle 2' / max 10')", color="#E65100", ls=(0, (3, 2)))
msg2(36, 89, 38, "5. con trỏ / vùng chọn (awareness)", color="#8E24AA", ls=(0, (2, 2)))
msg2(28, 38, 11, "    (awareness broadcast)", color="#8E24AA", ls=(0, (2, 2)))
ax.text(50, 16, "Khi client CUỐI ngắt kết nối → onStoreDocument: ghi đầy đủ Redis + PostgreSQL\n+ cập nhật contentPreview + flushSnapshotOnStore (chốt 1 version cuối).",
        ha="center", va="center", fontsize=8.6, color="#37474F",
        bbox=dict(boxstyle="round,pad=0.35", fc="#ECEFF1", ec="#607D8B"))
save(fig, "fig4_realtime_sync_sequence.png")


# =========================================================
# Hình 5 — Dual-layer persistence (load/store)
# =========================================================
fig, ax = new_ax(11, 7)
ax.text(27, 95, "LUỒNG ĐỌC (onLoadDocument)", ha="center", fontsize=11, fontweight="bold", color="#1565C0")
ax.text(76, 95, "LUỒNG GHI (onChange / onStoreDocument)", ha="center", fontsize=11, fontweight="bold", color="#E65100")
ax.add_line(Line2D([51, 51], [6, 90], color="#B0BEC5", lw=1.1, ls=(0, (5, 4))))

# LOAD
box(ax, 6, 80, 38, 7, "Mở tài liệu → loadDocument(docId)", fill=C_SERVER, fontsize=9.5, bold=True)
box(ax, 11, 64, 28, 8, "Redis: GET yjs:<docId>", fill="#FFFFFF", fontsize=9.5)
arrow(ax, 25, 80, 25, 72, "")
box(ax, 4, 48, 18, 8, "HIT → trả về\n+ refresh TTL", fill="#C8E6C9", edge="#2E7D32", fontsize=8.8, bold=True)
box(ax, 27, 48, 18, 8, "MISS → đọc\nPostgreSQL", fill="#FFE0B2", edge="#E65100", fontsize=8.8, bold=True)
arrow(ax, 20, 64, 13, 56, "có", color="#2E7D32", fs=8.5)
arrow(ax, 30, 64, 36, 56, "không", color="#E65100", fs=8.5)
box(ax, 22, 33, 24, 8, "PostgreSQL\nDocument.yjsState (Bytes)", fill="#FFFFFF", fontsize=8.8)
arrow(ax, 36, 48, 34, 41, "")
box(ax, 14, 18, 24, 8, "Y.applyUpdate(doc, state)\n→ sẵn sàng cộng tác", fill="#E3F0FB", edge="#1565C0", fontsize=8.8, bold=True)
arrow(ax, 13, 48, 20, 26, "", color="#2E7D32")
arrow(ax, 34, 33, 30, 26, "", color="#E65100")

# STORE
box(ax, 56, 80, 38, 7, "Mỗi thay đổi → onChange()", fill=C_SERVER, fontsize=9.5, bold=True)
box(ax, 58, 64, 34, 9, "throttledCacheUpdate (gộp 300ms)\nchỉ ghi bản mới nhất xuống Redis", fill="#FFF3E0", edge="#E65100", fontsize=8.8)
arrow(ax, 75, 80, 75, 73, "")
box(ax, 58, 50, 34, 8, "Redis: SETEX yjs:<docId> (TTL 24h)", fill="#FFFFFF", fontsize=9)
arrow(ax, 75, 64, 75, 58, "")
box(ax, 56, 30, 38, 9, "onStoreDocument (client cuối ngắt)\nencodeStateAsUpdate → Redis + PostgreSQL", fill="#E3F0FB", edge="#1565C0", fontsize=8.8, bold=True)
arrow(ax, 75, 50, 75, 39, "khi đóng doc", color="#1565C0", off=10, fs=8.2)
box(ax, 56, 14, 38, 9, "Redis lỗi = non-fatal (lazyConnect)\n→ luôn fallback an toàn về PostgreSQL", fill="#ECEFF1", edge="#607D8B", fontsize=8.6)
arrow(ax, 75, 30, 75, 23, "")
save(fig, "fig5_persistence.png")

print("ALL DONE")
