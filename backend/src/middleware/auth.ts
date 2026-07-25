import { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'

/**
 * Lives in its own module on purpose: routers need this guard, and app.ts needs
 * the routers. Importing it from app.ts creates a cycle that resolves to
 * `undefined` at module-eval time and takes the whole server down on boot.
 */

/** Constant-time compare so the token can't be recovered by timing the response. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') return next()

  const expected = process.env.ADMIN_PASSWORD
  // Fail closed. An unconfigured deploy must not expose guest conversations
  // and admin controls to anyone who guesses the path.
  if (!expected) {
    console.error('ADMIN_PASSWORD is not set — refusing to serve admin routes.')
    return res.status(503).json({ success: false, error: 'Admin access is not configured' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  if (!tokensMatch(authHeader.slice('Bearer '.length), expected)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}
