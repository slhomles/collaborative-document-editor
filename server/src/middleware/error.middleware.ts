import { Request, Response, NextFunction } from 'express'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Internal server error' })
}
