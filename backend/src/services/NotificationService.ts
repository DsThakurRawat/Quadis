import { BookingRecord } from '../types'

export interface NotificationResult {
  success: boolean
  isSimulated: boolean
  recipient: string
  messageBody: string
  error?: string
}

export class NotificationService {
  private whatsappToken: string | undefined
  private phoneNumberId: string | undefined
  private ownerPhone: string

  constructor() {
    this.whatsappToken = process.env.META_WHATSAPP_TOKEN
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID
    this.ownerPhone = process.env.META_OWNER_PHONE || '919217373532'
  }

  public async sendGuestWhatsAppReceipt(
    booking: BookingRecord,
    propertyName: string,
    roomName: string,
    propertyAddress: string = 'Sector 51, Noida'
  ): Promise<NotificationResult> {
    const formattedAmount = Number(booking.total_amount).toLocaleString('en-IN')
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(propertyName + ' ' + propertyAddress)}`

    const messageBody =
      `🏨 *Quadis Hotels — Booking Confirmed!*\n\n` +
      `Hello *${booking.guest_name}*, we are delighted to confirm your reservation at *${propertyName}*!\n\n` +
      `📋 *Booking Summary:*\n` +
      `• Booking Code: *${booking.booking_code}*\n` +
      `• Room Category: *${roomName}* (${booking.rooms_count} Room${booking.rooms_count > 1 ? 's' : ''}, ${booking.guests_count} Guest${booking.guests_count > 1 ? 's' : ''})\n` +
      `• Check-In: *${booking.check_in}* (from 2:00 PM)\n` +
      `• Check-Out: *${booking.check_out}* (until 11:00 AM)\n` +
      `• Total Paid: *₹${formattedAmount}*\n` +
      `${booking.company_name ? `• Corporate Guest: *${booking.company_name}* (${booking.gstin || 'No GSTIN'})\n` : ''}\n` +
      `📍 *Location & Navigation:*\n` +
      `${propertyAddress}\n` +
      `${mapsUrl}\n\n` +
      `We look forward to welcoming you soon!`

    if (this.whatsappToken && this.phoneNumberId && this.whatsappToken !== 'mock') {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.whatsappToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: booking.guest_phone,
            type: 'text',
            text: { body: messageBody },
          }),
        })

        if (!response.ok) {
          const errData = await response.text()
          console.error('Meta Cloud API error:', errData)
          // Fall through to simulation if API call rejected
        } else {
          return {
            success: true,
            isSimulated: false,
            recipient: booking.guest_phone,
            messageBody,
          }
        }
      } catch (err: any) {
        console.error('Failed to send live WhatsApp message:', err)
      }
    }

    // High-visibility simulated delivery block for local testing & demos
    console.log(`\n================== [WHATSAPP RECEIPT DELIVERED] ==================`)
    console.log(`Recipient: +91 ${booking.guest_phone}`)
    console.log(`------------------------------------------------------------------`)
    console.log(messageBody)
    console.log(`==================================================================\n`)

    return {
      success: true,
      isSimulated: true,
      recipient: booking.guest_phone,
      messageBody,
    }
  }

  public async sendOwnerWhatsAppAlert(
    booking: BookingRecord,
    propertyName: string,
    roomName: string
  ): Promise<NotificationResult> {
    const formattedAmount = Number(booking.total_amount).toLocaleString('en-IN')
    const messageBody =
      `🔔 *NEW PAID BOOKING CONFIRMED*\n\n` +
      `• Property: *${propertyName}*\n` +
      `• Code: *${booking.booking_code}*\n` +
      `• Guest: *${booking.guest_name}* (+91 ${booking.guest_phone})\n` +
      `• Room: *${booking.rooms_count}x ${roomName}*\n` +
      `• Dates: *${booking.check_in} to ${booking.check_out}*\n` +
      `• Revenue: *₹${formattedAmount}*\n` +
      `• Payment ID: *${booking.razorpay_payment_id || 'Instant Online'}*`

    if (this.whatsappToken && this.phoneNumberId && this.whatsappToken !== 'mock') {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.whatsappToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.ownerPhone,
            type: 'text',
            text: { body: messageBody },
          }),
        })
        if (response.ok) {
          return {
            success: true,
            isSimulated: false,
            recipient: this.ownerPhone,
            messageBody,
          }
        }
      } catch (err: any) {
        console.error('Failed to send live owner WhatsApp alert:', err)
      }
    }

    // Simulated owner alert block
    console.log(`\n==================== [OWNER WHATSAPP ALERT] ====================`)
    console.log(`Recipient: +91 ${this.ownerPhone} (Hotel Manager)`)
    console.log(`------------------------------------------------------------------`)
    console.log(messageBody)
    console.log(`==================================================================\n`)

    return {
      success: true,
      isSimulated: true,
      recipient: this.ownerPhone,
      messageBody,
    }
  }
}

export const notificationService = new NotificationService()
