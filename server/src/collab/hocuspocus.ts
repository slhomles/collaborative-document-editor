import { Server } from '@hocuspocus/server'
import jwt from 'jsonwebtoken'
import { loadDocument, storeDocument } from './persistence'

export const hocuspocusServer = Server.configure({
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

  async onLoadDocument({ documentName, document }) {
    const state = await loadDocument(documentName)
    if (state) {
      // Apply persisted Yjs state to the document
      const { applyUpdate } = await import('yjs')
      applyUpdate(document, state)
    }
    return document
  },

  async onStoreDocument({ documentName, document }) {
    const { encodeStateAsUpdate } = await import('yjs')
    const state = Buffer.from(encodeStateAsUpdate(document))
    await storeDocument(documentName, state)
  },

  async onChange({ documentName, document }) {
    // Throttled snapshot — store in Redis for fast load
    const { encodeStateAsUpdate } = await import('yjs')
    const state = Buffer.from(encodeStateAsUpdate(document))
    await storeDocument(documentName, state, { cacheOnly: true })
  },
})
