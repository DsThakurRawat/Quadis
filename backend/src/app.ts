import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { propertiesRouter } from './routes/properties'
import { bookingsRouter } from './routes/bookings'
import { paymentsRouter } from './routes/payments'
import { webhooksRouter } from './routes/webhooks'
import { enquiriesRouter } from './routes/enquiries'
import { adminRouter, adminAuthRouter } from './routes/admin'
import { aiRouter } from './routes/ai'
import { authRouter } from './routes/auth'
import { requireAdmin } from './middleware/auth'

// Re-exported for existing importers; the implementation lives in middleware/auth
// so routers can depend on it without importing this module back.
export { requireAdmin }

export function createApp(): Express {
  const app = express()

  // 1. Security Headers
  app.use(helmet())

  // 2. Strict CORS — allowlist only.
  // In production the frontend is served same-origin behind the CloudFront /api
  // proxy, so no cross-origin grant is needed unless CORS_ORIGIN says otherwise.
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const devOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]

  app.use(cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin navigation, curl, or a server-to-server
      // call such as the Razorpay webhook. Nothing to authorise.
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      if (process.env.NODE_ENV !== 'production' && devOrigins.some((re) => re.test(origin))) {
        return callback(null, true)
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }))

  // 3. Webhook parsing (keep raw body for signature verification)
  app.use(express.json({
    verify: (req, _res, buf) => {
      ;(req as any).rawBody = buf.toString()
    }
  }))

  // 4. Rate Limiting for public endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api/enquiries', apiLimiter)
  app.use('/api/bookings', apiLimiter)
  app.use('/api/ai/chat', apiLimiter)

  // A short PIN is brute-forceable in minutes at 100 req/15min. Keep this tight.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many sign-in attempts. Try again later.' },
  })
  app.use('/api/admin/auth', authLimiter)
  // Guest sign-in is equally brute-forceable; registration equally spammable.
  app.use('/api/auth', authLimiter)

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ success: true, service: 'Quadis Hotels API Server', version: '1.0.0', status: 'healthy' })
  })

  // Mount API route handlers
  app.use('/api/properties', propertiesRouter)
  app.use('/api/bookings', bookingsRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api/webhooks', webhooksRouter)
  app.use('/api/enquiries', enquiriesRouter)
  app.use('/api/auth', authRouter)
  
  // Sign-in must be reachable without a token; everything else is guarded.
  app.use('/api/admin', adminAuthRouter)
  app.use('/api/admin', requireAdmin, adminRouter)
  app.use('/api/ai', aiRouter) // /ai/logs carries requireAdmin on the route itself

  // Global 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' })
  })

  return app
}
