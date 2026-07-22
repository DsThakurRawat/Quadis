import { Router, Request, Response } from 'express'
import { db } from '../db'

export const propertiesRouter = Router()

// GET /api/properties - list all active properties
propertiesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const properties = await db.getProperties()
    res.json({ success: true, count: properties.length, data: properties })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch properties' })
  }
})

// GET /api/properties/:slug - get detailed property + room types
propertiesRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { property, roomTypes } = await db.getPropertyBySlug(slug)
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' })
    }
    res.json({ success: true, data: { ...property, rooms: roomTypes } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch property details' })
  }
})
