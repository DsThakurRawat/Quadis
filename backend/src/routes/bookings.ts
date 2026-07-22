import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const bookingsRouter = Router()

const initiateBookingSchema = z.object({
  propertySlug: z.string().trim().min(1, 'Property slug is required'),
  roomTypeSlug: z.string().trim().min(1, 'Room category slug is required'),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in must be YYYY-MM-DD format'),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out must be YYYY-MM-DD format'),
  roomsCount: z.number().int().min(1, 'At least 1 room required').max(20, 'Maximum 20 rooms per booking'),
  guestsCount: z.number().int().min(1, 'At least 1 guest required').max(80, 'Maximum 80 guests per booking'),
  guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters'),
  guestPhone: z.string().trim().min(10, 'Valid 10-digit mobile number required'),
  guestEmail: z.string().trim().email('Invalid email address').optional(),
}).refine(
  (data) => new Date(data.checkOut).getTime() > new Date(data.checkIn).getTime(),
  { message: 'Check-out date must be strictly after check-in date', path: ['checkOut'] }
).refine(
  (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(data.checkIn).getTime() >= today.getTime()
  },
  { message: 'Check-in date cannot be in the past', path: ['checkIn'] }
)

// POST /api/bookings/initiate - create 15-minute soft hold
bookingsRouter.post('/initiate', async (req: Request, res: Response) => {
  try {
    const validation = initiateBookingSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request payload',
        details: validation.error.flatten().fieldErrors,
      })
    }

    const payload = validation.data
    const result = await db.initiateBookingHold(payload)
    if (!result.success || !result.booking) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to initiate booking hold' })
    }

    res.status(201).json({
      success: true,
      message: 'Booking soft hold created successfully for 15 minutes. Complete payment to confirm.',
      data: result.booking,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal server error during booking initiation' })
  }
})

// GET /api/bookings/:code - lookup booking status
bookingsRouter.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params
    const phone = req.query.phone as string | undefined
    const booking = await db.getBookingByCode(code, phone)
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found or phone number mismatch' })
    }
    res.json({ success: true, data: booking })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to lookup booking' })
  }
})
