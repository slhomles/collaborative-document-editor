import { Server } from '@hocuspocus/server'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import * as Y from 'yjs'
import { loadDocument, storeDocument, scheduleAutoSnapshot, throttledCacheUpdate } from './persistence'
import { canEditDocument, getDocumentRole } from '../utils/documentAccess'

type CollabContext = {
  userId?: string
  documentId?: string
  role?: Role
}

export const hocuspocusServer = Server.configure({
  async onAuthenticate({ token, documentName, connection }) {
    if (!token) throw new Error('Missing token')

    let payload: { userId: string }
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }
    } catch {
      throw new Error('Invalid token')
    }

    const role = await getDocumentRole(documentName, payload.userId)
    console.log(`[onAuthenticate] userId: ${payload.userId}, doc: ${documentName}, resolved role: ${role}`)
    if (!role) throw new Error('Forbidden')

    connection.readOnly = !canEditDocument(role)
    console.log(`[onAuthenticate] set connection.readOnly to: ${connection.readOnly}`)

    // Return context so other hooks can use it
    return { userId: payload.userId, documentId: documentName, role }
  },
  async beforeHandleMessage({ connection, documentName }) {
    const context = connection.context as CollabContext
    if (!context.userId) throw new Error('Unauthenticated')

    const role = await getDocumentRole(documentName, context.userId)
    console.log(`[beforeHandleMessage] userId: ${context.userId}, doc: ${documentName}, resolved role: ${role}`)
    if (!role) throw new Error('Forbidden')

    connection.readOnly = !canEditDocument(role)
    console.log(`[beforeHandleMessage] set connection.readOnly to: ${connection.readOnly}`)
    connection.context = {
      ...connection.context,
      documentId: documentName,
      role,
    }
  },
  // check if a document has content or not
  async onLoadDocument({ documentName, document }) {
    const state = await loadDocument(documentName)
    if (state) {
      Y.applyUpdate(document, state)// Apply persisted Yjs state to the document
    }
    return document
  },
  // save a doc to database and redis
  async onStoreDocument({ documentName, document }) {
    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    await storeDocument(documentName, state)
  },
  //only save to cache-redis, you can't save everytime user type a character
  //advantage: loss internet, other people can see quickly, sync
  async onChange({ documentName, document, context }) {
    const collabContext = context as CollabContext

    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    // Throttle 300ms để tránh ghi Redis trên mỗi keystroke; flush tự động.
    throttledCacheUpdate(documentName, state)

    // Schedule auto-snapshot every 30s of inactivity
    if (collabContext.userId) scheduleAutoSnapshot(documentName, collabContext.userId, state)
  },
})
