import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth.middleware'

const prisma = new PrismaClient()
function signToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'secret'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions)
}

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { email, name, password } = parsed.data
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, name, passwordHash } })
    const token = signToken(user.id)
    res.status(201).json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = signToken(user.id)
    res.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
    res.json({ data: users })
  } catch (err) {
    next(err)
  }
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const googleLoginSchema = z.object({ credential: z.string().min(1) })

export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = googleLoginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email) {
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    const { sub: googleId, email, name, picture } = payload

    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        user = await prisma.user.update({ where: { id: existing.id }, data: { googleId } })
      } else {
        user = await prisma.user.create({
          data: { email, name: name || email, googleId, avatarUrl: picture ?? null, passwordHash: null },
        })
      }
    }

    const token = signToken(user.id)
    res.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
    })
  } catch (err) {
    next(err)
  }
}
