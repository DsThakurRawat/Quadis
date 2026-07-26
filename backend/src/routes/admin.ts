import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { razorpayService } from '../services/RazorpayService'
import { notificationService } from '../services/NotificationService'

export const adminRouter = Router()

/**
 * Public router — mounted ahead of the requireAdmin guard, because you cannot
 * present a token you have not been issued yet. Everything else on /api/admin
 * stays behind the guard.
 */
export const adminAuthRouter = Router()

// POST /api/admin/auth — exchange the staff PIN for the admin bearer token.
adminAuthRouter.post('/auth', (req: Request, res: Response) => {
  const expectedPin = process.env.ADMIN_PIN
  const adminToken = process.env.ADMIN_PASSWORD

  // Fail closed rather than shipping a guessable default PIN.
  if (!expectedPin || !adminToken) {
    console.error('ADMIN_PIN / ADMIN_PASSWORD are not set — refusing admin sign-in.')
    return res.status(503).json({ success: false, error: 'Admin access is not configured' })
  }

  const { pin } = req.body ?? {}
  if (typeof pin !== 'string' || pin !== expectedPin) {
    return res.status(401).json({ success: false, error: 'Invalid Admin PIN' })
  }

  res.json({
    success: true,
    token: adminToken,
    message: 'Authenticated successfully as Hotel Management',
  })
})

// GET /api/admin/dashboard — retrieve daily glance metrics, inventory, bookings, and leads
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const metrics = await db.getGlanceMetrics()
    const properties = await db.getPropertiesWithRooms()
    const bookings = await db.getAllBookings(15)
    const enquiries = await db.getEnquiries()

    res.json({
      success: true,
      data: {
        metrics,
        properties,
        recentBookings: bookings,
        recentEnquiries: enquiries.slice(0, 15),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch admin dashboard data' })
  }
})

// PATCH /api/admin/room-availability — one-tap mobile inventory toggle ([ Available ] vs [ Sold Out ])
adminRouter.patch('/room-availability', async (req: Request, res: Response) => {
  try {
    const { roomTypeId, propertySlug, isAvailable } = req.body
    if (!roomTypeId) {
      return res.status(400).json({ success: false, error: 'roomTypeId is required' })
    }

    const updatedRoom = await db.toggleRoomAvailability(roomTypeId, propertySlug, isAvailable)
    if (!updatedRoom) {
      return res.status(404).json({ success: false, error: 'Room category not found' })
    }

    res.json({
      success: true,
      message: `Room category status updated to ${updatedRoom.is_available ? 'AVAILABLE' : 'SOLD OUT'}`,
      data: updatedRoom,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to toggle room availability' })
  }
})

/* ---------------------------------------------------------------------------
 * Content editing
 *
 * Everything a hotel manager should be able to change without a developer.
 * Each schema is strict — unknown keys are rejected rather than silently
 * dropped, so a typo in the admin UI surfaces instead of appearing to save.
 * ------------------------------------------------------------------------- */

const money = z.number().nonnegative('Must be zero or more').max(1_000_000, 'Unreasonably large')

const propertyPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(128),
    city: z.enum(['Noida', 'New Delhi']),
    address: z.string().trim().min(5),
    map_link: z.string().trim().url('Must be a valid URL').or(z.literal('')),
    phone: z.string().trim().min(10).max(20),
    whatsapp: z.string().trim().min(10).max(20),
    email: z.string().trim().email(),
    base_price: money,
    rating: z.number().min(0, 'Rating cannot be negative').max(5, 'Rating cannot exceed 5'),
    is_active: z.boolean(),
    weekend_surcharge_percent: z.number().min(0).max(100, 'Surcharge cannot exceed 100%'),
    // Occupancy policy. Capped so a slipped decimal cannot quietly multiply a
    // guest's bill, and the free-child age is bounded to childhood.
    extra_adult_percent: z
      .number()
      .min(0, 'Cannot be negative')
      .max(200, 'A triple-occupancy uplift above 200% looks wrong — check the figure'),
    child_free_under_age: z
      .number()
      .int('Enter a whole number of years')
      .min(0, 'Cannot be negative')
      .max(18, 'Guests 18 and over are adults'),
  })
  .partial()
  .strict()

const roomPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(128),
    description: z.string().trim().max(2000),
    size_sqft: z.string().trim().max(32),
    bed_type: z.string().trim().max(64),
    max_guests: z.number().int().min(1).max(20),
    price_offset: money,
    breakfast_offset: money,
    all_meals_offset: money,
    total_units: z.number().int().min(0).max(500),
    is_available: z.boolean(),
  })
  .partial()
  .strict()

// PATCH /api/admin/properties/:idOrSlug — edit a property record
adminRouter.patch('/properties/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const parsed = propertyPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property update',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const updated = await db.updateProperty(req.params.idOrSlug!, parsed.data)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Property not found' })
    }

    res.json({ success: true, message: `${updated.name} updated`, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update property' })
  }
})

// PATCH /api/admin/room-types/:id — edit a room category and its rates.
// Id only: `deluxe-room` is a slug shared by every property.
adminRouter.patch('/room-types/:id', async (req: Request, res: Response) => {
  try {
    const parsed = roomPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room update',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const updated = await db.updateRoomType(req.params.id!, parsed.data)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Room category not found' })
    }

    res.json({ success: true, message: `${updated.name} updated`, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update room category' })
  }
})

const contentSchema = z.object({
  // Values only — keys are defined by the components that read them.
  entries: z.record(z.string(), z.string().max(5000, 'Text block is too long')),
})

// PUT /api/admin/content — overwrite editable copy blocks
adminRouter.put('/content', async (req: Request, res: Response) => {
  try {
    const parsed = contentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content payload',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const saved = await db.setSiteContent(parsed.data.entries)
    res.json({ success: true, message: 'Website content updated', data: saved })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save content' })
  }
})

// PATCH /api/admin/surcharge — weekend / seasonal +15% surcharge toggle
adminRouter.patch('/surcharge', async (req: Request, res: Response) => {
  try {
    const { surchargePercent, propertyId } = req.body
    if (typeof surchargePercent !== 'number' || surchargePercent < 0) {
      return res.status(400).json({ success: false, error: 'Valid surchargePercent (>= 0) is required' })
    }

    await db.updateWeekendSurcharge(propertyId || 'all', surchargePercent)
    const updatedProperties = await db.getPropertiesWithRooms()
    res.json({
      success: true,
      message: `Weekend surcharge updated to ${surchargePercent}% across ${propertyId === 'all' || !propertyId ? 'all properties' : 'selected property'}`,
      data: updatedProperties,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update weekend surcharge' })
  }
})

// POST /api/admin/payment-link — instant payment link generator for walk-ins / inquiries
adminRouter.post('/payment-link', async (req: Request, res: Response) => {
  try {
    const { phone, amount, description, guestName, propertyName } = req.body
    if (!phone || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Guest phone and positive amount are required' })
    }

    const enq = await db.createEnquiry({
      enquiry_type: 'ROOM_HOLD',
      guest_name: guestName || 'Walk-in / Custom Guest',
      guest_phone: phone,
      message: description || `Instant admin payment link (${propertyName || 'Quadis Hotel'})`,
    })

    const linkRes = await razorpayService.createEnquiryPaymentLink({
      enquiryId: enq.id,
      amount: Number(amount),
      guestName: enq.guest_name,
      guestPhone: enq.guest_phone,
      description: description || `Payment for ${propertyName || 'Quadis Hotel'}`,
    })

    if (linkRes.paymentLinkId) {
      await db.updateEnquiryStatus(enq.id, 'LINK_SENT', linkRes.paymentLinkId)
    }

    res.json({
      success: true,
      message: 'Instant payment link generated and recorded',
      data: {
        enquiryId: enq.id,
        paymentLinkId: linkRes.paymentLinkId,
        shortUrl: linkRes.shortUrl,
        isSimulated: linkRes.isSimulated,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate admin payment link' })
  }
})
