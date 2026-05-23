import { Server } from '@hocuspocus/server'
import { Role } from '@prisma/client'
import jwt from 'jsonwebtoken'
import {
  loadDocument,
  storeDocument,
  scheduleAutoSnapshot,
  flushSnapshotOnStore,
  throttledCacheUpdate,
  getDocumentRole,
} from './persistence'

export const hocuspocusServer = Server.configure({
  //verify if a user can edit a document or not
  async onAuthenticate({ token, documentName, connection }) {
    if (!token) throw new Error('Missing token')

    let userId: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }
      userId = payload.userId
    } catch {
      throw new Error('Invalid token')
    }

    const role = await getDocumentRole(userId, documentName)
    if (!role) throw new Error('Forbidden') // không phải owner cũng không phải member

    // VIEWER chỉ đọc — Hocuspocus tự reject sync update messages khi readOnly = true.
    connection.readOnly = role === Role.VIEWER

    return { userId, documentId: documentName, role }
  },
  // check if a document has content or not
  async onLoadDocument({ documentName, document }) {
    const state = await loadDocument(documentName)
    if (state) {
      const { applyUpdate } = await import('yjs')// dynamic import, only import if really vital
      applyUpdate(document, state)// Apply persisted Yjs state to the document
    }
    return document
  },
  // save a doc to database and redis
  async onStoreDocument({ documentName, document }) {
    const { encodeStateAsUpdate } = await import('yjs')
    const state = Buffer.from(encodeStateAsUpdate(document))
    await storeDocument(documentName, state)
    // Hocuspocus gọi onStoreDocument khi client cuối ngắt kết nối → chốt bản version cuối phiên.
    await flushSnapshotOnStore(documentName)
  },
  //only save to cache-redis, you can't save everytime user type a character
  //advantage: loss internet, other people can see quickly, sync
  async onChange({ documentName, document, context }) {
    const { userId, role } = context as { userId?: string; role?: Role }
    // VIEWER không bao giờ tới đây vì readOnly chặn ở tầng connection, nhưng phòng vệ kép.
    if (role === Role.VIEWER) return

    const { encodeStateAsUpdate } = await import('yjs')
    const state = Buffer.from(encodeStateAsUpdate(document))
    // Throttle 300ms để tránh ghi Redis trên mỗi keystroke; flush tự động.
    throttledCacheUpdate(documentName, state)

    // Schedule auto-snapshot every 30s of inactivity — chỉ user có quyền ghi.
    if (userId) scheduleAutoSnapshot(documentName, userId, state)
  },
})
