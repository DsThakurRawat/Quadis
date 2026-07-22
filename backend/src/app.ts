import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import { propertiesRouter } from './routes/properties'
import { bookingsRouter } from './routes/bookings'

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

  // Global 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' })
  })

  return app
}
