import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import { propertiesRouter } from './routes/properties'
import { bookingsRouter } from './routes/bookings'
import { paymentsRouter } from './routes/payments'
import { webhooksRouter } from './routes/webhooks'
import { enquiriesRouter } from './routes/enquiries'
import { adminRouter } from './routes/admin'

export function createApp(): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

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
  app.use('/api/admin', adminRouter)

  // Global 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' })
  })

  return app
}
