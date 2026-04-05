import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, password } = req.body
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, name, passwordHash: hashed } })
    const token = signToken(user.id)
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const token = signToken(user.id)
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}
