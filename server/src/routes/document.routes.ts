import { Router } from 'express'
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
} from '../controllers/document.controller'
import { addMember, removeMember } from '../controllers/member.controller'
import { listVersions, createVersion, getVersion } from '../controllers/version.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export const documentRouter = Router()

documentRouter.use(authMiddleware)

documentRouter.get('/', listDocuments)
documentRouter.post('/', createDocument)
documentRouter.get('/search', searchDocuments)
documentRouter.get('/:id', getDocument)
documentRouter.patch('/:id', updateDocument)
documentRouter.delete('/:id', deleteDocument)
documentRouter.post('/:id/members', addMember)
documentRouter.delete('/:id/members/:userId', removeMember)
documentRouter.get('/:id/versions', listVersions)
documentRouter.post('/:id/versions', createVersion)
documentRouter.get('/:id/versions/:versionId', getVersion)
