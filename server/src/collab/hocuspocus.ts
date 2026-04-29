import { Server } from '@hocuspocus/server'
import jwt from 'jsonwebtoken'
import { loadDocument, storeDocument, scheduleAutoSnapshot, throttledCacheUpdate } from './persistence'

export const hocuspocusServer = Server.configure({
  //verify if a user can edit a document or not
  async onAuthenticate({ token, documentName }) {
    if (!token) throw new Error('Missing token')

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }
      // Return context so other hooks can use it
      return { userId: payload.userId, documentId: documentName }
    } catch {
      throw new Error('Invalid token')
    }
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
  },
  //only save to cache-redis, you can't save everytime user type a character
  //advantage: loss internet, other people can see quickly, sync
  async onChange({ documentName, document, context }) {
    const { encodeStateAsUpdate } = await import('yjs')
    const state = Buffer.from(encodeStateAsUpdate(document))
    // Throttle 300ms để tránh ghi Redis trên mỗi keystroke; flush tự động.
    throttledCacheUpdate(documentName, state)

    // Schedule auto-snapshot every 30s of inactivity
    const userId = (context as { userId?: string })?.userId
    if (userId) scheduleAutoSnapshot(documentName, userId, state)
  },
})
