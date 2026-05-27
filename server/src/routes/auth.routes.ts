import { Router } from 'express'
import { register, login, googleLogin, getMe, listUsers } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/google', googleLogin)
authRouter.get('/me', authMiddleware, getMe)
authRouter.get('/users', authMiddleware, listUsers)
