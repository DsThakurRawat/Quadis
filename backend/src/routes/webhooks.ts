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

    res.json({ success: true, message: `Webhook event ${eventType} acknowledged (no state change required)` })
  } catch (err: any) {
    console.error('Error processing Razorpay webhook:', err)
    res.status(500).json({ success: false, error: err.message || 'Webhook processing failed' })
  }
})
