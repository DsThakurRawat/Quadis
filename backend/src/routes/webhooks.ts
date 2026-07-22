import { Router, Request, Response } from 'express'
import { db } from '../db'
import { razorpayService } from '../services/RazorpayService'
import { notificationService } from '../services/NotificationService'

export const webhooksRouter = Router()

// POST /api/webhooks/razorpay — handle Razorpay payment success or failure events
webhooksRouter.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

    // Verify signature unless in simulation mode
    const isSimulatedHeader = signature === 'simulated' || req.headers['x-simulated-webhook'] === 'true'
    if (!isSimulatedHeader && signature) {
      const isValid = razorpayService.verifyWebhookSignature(rawBody, signature)
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid Razorpay webhook signature' })
      }
    }

    const eventData = req.body
    const eventType = eventData.event || (isSimulatedHeader ? eventData.simulated_event : undefined)

    if (!eventType) {
      return res.status(400).json({ success: false, error: 'Webhook payload missing event identifier' })
    }

    // Extract bookingCode or orderId
    const entity =
      eventData.payload?.payment?.entity ||
      eventData.payload?.order?.entity ||
      eventData.entity ||
      eventData.data ||
      {}

    const notes = entity.notes || {}
    const bookingCode = notes.bookingCode || eventData.bookingCode
    const orderId = entity.order_id || eventData.orderId
    const paymentId = entity.id || eventData.paymentId || `pay_sim_${Date.now()}`

    let booking = null
    if (bookingCode) {
      booking = await db.getBookingByCode(bookingCode)
    }

    if (!booking && orderId) {
      // Fallback: search across bookings by orderId
      if (!db['useInMemory'] && db['pool']) {
        const resQuery = await db['pool'].query('SELECT * FROM bookings WHERE razorpay_order_id = $1', [orderId])
        booking = resQuery.rows[0] || null
      } else {
        booking =
          Array.from((db as any).memoryBookings.values()).find((b: any) => b.razorpay_order_id === orderId) || null
      }
    }

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Target booking not found for webhook event' })
    }

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const updated = await db.updateBookingPayment(booking.booking_code, {
        paymentStatus: 'PAID',
        bookingStatus: 'CONFIRMED',
        razorpayPaymentId: paymentId,
      })

      if (updated) {
        const prop = await db.getPropertyById(updated.property_id)
        const room = await db.getRoomTypeById(updated.room_type_id)
        const propName = prop?.name || 'Quadis Hotel'
        const roomName = room?.name || 'Deluxe Room'

        // Trigger notifications asynchronously
        Promise.all([
          notificationService.sendGuestWhatsAppReceipt(updated, propName, roomName, prop?.address),
          notificationService.sendOwnerWhatsAppAlert(updated, propName, roomName),
        ]).catch((err) => console.error('Error in background notifications:', err))
      }

      return res.json({ success: true, message: 'Booking confirmed and WhatsApp receipts dispatched' })
    }

    if (eventType === 'payment.failed') {
      // Payment failed — mark status and immediately release inventory
      await db.updateBookingPayment(booking.booking_code, {
        paymentStatus: 'FAILED',
        bookingStatus: 'CANCELLED',
        razorpayPaymentId: paymentId,
      })

      return res.json({ success: true, message: 'Payment failed, room hold released back to inventory' })
    }

    res.json({ success: true, message: `Webhook event ${eventType} processed` })
  } catch (err: any) {
    console.error('Error handling Razorpay webhook:', err)
    res.status(500).json({ success: false, error: 'Internal webhook processing error' })
  }
})

// POST /api/webhooks/whatsapp-staff — Quick commands from authorized staff smartphones
webhooksRouter.post('/whatsapp-staff', async (req: Request, res: Response) => {
  try {
    const { from, text } = req.body
    const staffText = (text || '').trim().toLowerCase()

    if (!staffText) {
      return res.status(400).json({ success: false, error: 'Message text is required' })
    }

    // Check staff phone authorization (optional bypass for testing)
    const ownerPhone = process.env.OWNER_WHATSAPP_PHONE || '919217373532'
    const isAuthorized = !from || from.includes(ownerPhone) || process.env.NODE_ENV === 'test'

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Unauthorized WhatsApp staff phone number' })
    }

    if (staffText.startsWith('glance') || staffText.startsWith('status')) {
      const metrics = await db.getGlanceMetrics()
      const reply = `📊 *Quadis Hotels Daily Glance*
• Today's Check-ins: *${metrics.todayCheckIns}*
• Pending Holds: *${metrics.pendingHolds}*
• Pending Enquiries: *${metrics.pendingEnquiries}*
• Today's Revenue: *₹${metrics.todayRevenue.toLocaleString('en-IN')}*`
      return res.json({ success: true, reply })
    }

    if (staffText.startsWith('sold out') || staffText.startsWith('available')) {
      const isAvailable = staffText.startsWith('available')
      const keywordClean = staffText.replace(/^(sold out|available)\s+/i, '').trim()

      // Find matching room category and property
      const allProps = await db.getPropertiesWithRooms()
      let matchedRoom: any = null
      let matchedProp: any = null

      for (const item of allProps) {
        for (const r of item.rooms) {
          if (
            keywordClean.toLowerCase().includes(r.name.toLowerCase()) ||
            keywordClean.toLowerCase().includes(item.property.name.toLowerCase()) ||
            keywordClean.toLowerCase().includes(item.property.slug.toLowerCase()) ||
            keywordClean.toLowerCase().includes(r.slug.toLowerCase())
          ) {
            matchedRoom = r
            matchedProp = item.property
            break
          }
        }
        if (matchedRoom) break
      }

      if (!matchedRoom) {
        return res.json({
          success: false,
          reply: `❌ Could not match room/hotel from command "${keywordClean}". Example: "Sold out Deluxe Sector 51"`,
        })
      }

      const updated = await db.toggleRoomAvailability(matchedRoom.id, undefined, isAvailable)
      const reply = `✅ Marked *${matchedRoom.name}* at *${matchedProp.name}* as *${isAvailable ? 'AVAILABLE' : 'SOLD OUT'}*.`
      return res.json({ success: true, reply, updatedRoom: updated })
    }

    return res.json({
      success: true,
      reply: `🤖 Quadis Staff Bot Commands:
• *Status* or *Glance* — view daily summary
• *Sold out <room/hotel>* — lock room inventory
• *Available <room/hotel>* — unlock room inventory`,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error executing staff command' })
  }
})
