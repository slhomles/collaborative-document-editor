import { Router } from 'express'
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  addMember,
  removeMember,
} from '../controllers/document.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export const documentRouter = Router()

documentRouter.use(authMiddleware)

documentRouter.get('/', listDocuments)
documentRouter.post('/', createDocument)
documentRouter.get('/:id', getDocument)
documentRouter.patch('/:id', updateDocument)
documentRouter.delete('/:id', deleteDocument)
documentRouter.post('/:id/members', addMember)
documentRouter.delete('/:id/members/:userId', removeMember)
