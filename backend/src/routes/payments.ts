import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { razorpayService } from '../services/RazorpayService'

export const paymentsRouter = Router()

const createOrderSchema = z.object({
  bookingCode: z.string().trim().min(1, 'Booking code is required'),
})

// POST /api/payments/create-order — create Razorpay checkout order for an active hold
paymentsRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const validation = createOrderSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request payload',
        details: validation.error.flatten().fieldErrors,
      })
    }

    const { bookingCode } = validation.data
    const booking = await db.getBookingByCode(bookingCode)

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' })
    }

    if (booking.booking_status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        success: false,
        error: `Cannot create payment order for booking with status: ${booking.booking_status}`,
      })
    }

    const orderRes = await razorpayService.createOrder(booking)
    if (!orderRes.success) {
      return res.status(500).json({ success: false, error: orderRes.error || 'Failed to generate Razorpay order' })
    }

    // Save orderId against booking
    if (orderRes.orderId) {
      await db.updateBookingPayment(bookingCode, { razorpayOrderId: orderRes.orderId })
    }

    res.json({
      success: true,
      message: 'Razorpay checkout order initialized',
      data: {
        orderId: orderRes.orderId,
        keyId: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        isSimulated: orderRes.isSimulated,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal server error while creating payment order' })
  }
})

// POST /api/payments/payment-link — generate instant payment link for custom inquiries / walk-ins
paymentsRouter.post('/payment-link', async (req: Request, res: Response) => {
  try {
    const validation = createOrderSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Booking code is required' })
    }

    const { bookingCode } = validation.data
    const booking = await db.getBookingByCode(bookingCode)
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' })
    }

    const linkRes = await razorpayService.createPaymentLink(booking)
    if (!linkRes.success) {
      return res.status(500).json({ success: false, error: linkRes.error || 'Failed to create payment link' })
    }

    if (linkRes.paymentLinkId) {
      await db.updateBookingPayment(bookingCode, { razorpayPaymentLinkId: linkRes.paymentLinkId })
    }

    res.json({
      success: true,
      message: 'Payment link generated successfully',
      data: {
        paymentLinkId: linkRes.paymentLinkId,
        shortUrl: linkRes.shortUrl,
        isSimulated: linkRes.isSimulated,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error generating payment link' })
  }
})
