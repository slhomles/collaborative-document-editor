import { Server } from '@hocuspocus/server'
import { Role } from '@prisma/client'
import jwt from 'jsonwebtoken'
import * as Y from 'yjs'
import {
  loadDocument,
  storeDocument,
  scheduleAutoSnapshot,
  flushSnapshotOnStore,
  throttledCacheUpdate,
  scheduleContentPreviewUpdate,
  updateContentPreview,
} from './persistence'
import { canEditDocument, getDocumentRole } from '../utils/documentAccess'

type CollabContext = {
  userId?: string
  documentId?: string
  role?: Role
}

// Trích text thuần từ Yjs (Tiptap Collaboration dùng XmlFragment field 'default') để search nội dung.
function extractPlainText(doc: Y.Doc): string {
  return doc
    .getXmlFragment('default')
    .toString()
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const hocuspocusServer = Server.configure({
  // Xác thực + phân quyền (chia sẻ / chỉ đọc).
  async onAuthenticate({ token, documentName, connection }) {
    if (!token) throw new Error('Missing token')

    let payload: { userId: string }
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }
    } catch {
      throw new Error('Invalid token')
    }

    const role = await getDocumentRole(documentName, payload.userId)
    if (!role) throw new Error('Forbidden')

    // VIEWER (hoặc public chỉ-xem) → readOnly; Hocuspocus tự reject sync update messages.
    connection.readOnly = !canEditDocument(role)

    return { userId: payload.userId, documentId: documentName, role }
  },
  // Re-check quyền trên từng message để phản ánh thay đổi chia sẻ realtime.
  async beforeHandleMessage({ connection, documentName }) {
    const context = connection.context as CollabContext
    if (!context.userId) throw new Error('Unauthenticated')

    const role = await getDocumentRole(documentName, context.userId)
    if (!role) throw new Error('Forbidden')

    connection.readOnly = !canEditDocument(role)
    connection.context = {
      ...connection.context,
      documentId: documentName,
      role,
    }
  },
  // Nạp state đã lưu (Redis → Postgres) vào document khi mở.
  async onLoadDocument({ documentName, document }) {
    const state = await loadDocument(documentName)
    if (state) {
      Y.applyUpdate(document, state)
    }
    return document
  },
  // Lưu document xuống DB + Redis; Hocuspocus gọi khi client cuối ngắt kết nối.
  async onStoreDocument({ documentName, document }) {
    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    await storeDocument(documentName, state)
    // Chốt text preview cuối phiên để search nội dung luôn cập nhật.
    await updateContentPreview(documentName, extractPlainText(document))
    // Chốt bản version cuối phiên (auto-version kiểu Google Docs).
    await flushSnapshotOnStore(documentName)
  },
  // Mỗi thay đổi: cache Redis (throttle) + lên lịch auto-snapshot.
  async onChange({ documentName, document, context }) {
    const collabContext = context as CollabContext

    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    // Throttle 300ms để tránh ghi Redis trên mỗi keystroke; flush tự động.
    throttledCacheUpdate(documentName, state)

    // Auto-snapshot khi nhàn rỗi / định kỳ — chỉ user có quyền ghi.
    if (collabContext.userId) {
      scheduleAutoSnapshot(documentName, collabContext.userId, state)
      // Cập nhật text preview (debounce 8s) để search theo nội dung.
      scheduleContentPreviewUpdate(documentName, extractPlainText(document))
    }
  },
})
