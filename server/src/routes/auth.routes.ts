import { Router } from 'express'
import { register, login, getMe, listUsers } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.get('/me', authMiddleware, getMe)
authRouter.get('/users', authMiddleware, listUsers)
