import Groq from 'groq-sdk'
import { db } from '../db'
import { notificationService } from './NotificationService'

export interface ChatTurnResult {
  reply: string
  toolsInvoked: string[]
  handoffTriggered: boolean
}

export class AIService {
  private groq: Groq | null = null

  constructor() {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy_groq_key') {
      try {
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
      } catch (err) {
        console.warn('Failed to initialize Groq SDK:', err)
      }
    }
  }

  // Execute actual database tool based on tool name and arguments
  private async executeTool(toolName: string, args: any): Promise<{ result: any; handoff?: boolean }> {
    if (toolName === 'search_hotels') {
      const results = await db.searchHotelsForChat({
        search: args.query || args.search,
        city: args.city,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        roomsCount: args.roomsCount ? Number(args.roomsCount) : undefined,
      })
      return {
        result: results.map((item) => ({
          hotel: item.property.name,
          city: item.property.city,
          address: item.property.address,
          availableRooms: item.rooms.map((r) => ({
            roomName: r.name,
            size: r.size_sqft,
            pricePerNight: `₹${r.currentPriceInr.toLocaleString('en-IN')}`,
            availableUnits: r.available_units,
          })),
        })),
      }
    }

    if (toolName === 'initiate_soft_hold') {
      const holdRes = await db.initiateBookingHold({
        propertySlug: args.propertySlug,
        roomTypeSlug: args.roomTypeSlug,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        roomsCount: Number(args.roomsCount || 1),
        guestsCount: Number(args.guestsCount || 2),
        guestName: args.guestName,
        guestPhone: args.guestPhone,
        guestEmail: args.guestEmail,
      })

      if (!holdRes.success || !holdRes.booking) {
        return { result: { success: false, error: holdRes.error || 'Failed to hold room inventory' } }
      }

      return {
        result: {
          success: true,
          bookingCode: holdRes.booking.booking_code,
          status: holdRes.booking.booking_status,
          totalAmount: `₹${Number(holdRes.booking.total_amount).toLocaleString('en-IN')}`,
          checkIn: holdRes.booking.check_in,
          checkOut: holdRes.booking.check_out,
          note: 'Room is held for exactly 15 minutes. Complete payment to confirm.',
        },
      }
    }

    if (toolName === 'create_banquet_enquiry') {
      const enq = await db.createEnquiry({
        enquiry_type: args.enquiryType || 'BANQUET',
        guest_name: args.guestName,
        guest_phone: args.guestPhone,
        guest_email: args.guestEmail,
        event_date: args.eventDate,
        guest_count: args.guestCount ? Number(args.guestCount) : undefined,
        message: args.message || `AI Chatbot RFP (${args.enquiryType || 'Banquet'})`,
      })

      // Send owner alert
      try {
        await notificationService.sendOwnerEnquiryAlert(enq)
      } catch (e) {
        console.error('Failed to notify owner of AI enquiry:', e)
      }

      return {
        result: {
          success: true,
          enquiryId: enq.id,
          status: enq.status,
          message: 'Your banquet/event request has been submitted directly to hotel management.',
        },
      }
    }

    if (toolName === 'check_booking_status') {
      const booking = await db.getBookingByCode(args.bookingCode, args.guestPhone)
      if (!booking) {
        return { result: { found: false, message: `No booking found for code ${args.bookingCode}` } }
      }
      return {
        result: {
          found: true,
          bookingCode: booking.booking_code,
          guestName: booking.guest_name,
          bookingStatus: booking.booking_status,
          paymentStatus: booking.payment_status,
          totalAmount: `₹${Number(booking.total_amount).toLocaleString('en-IN')}`,
          dates: `${booking.check_in} to ${booking.check_out}`,
        },
      }
    }

    if (toolName === 'human_handoff') {
      const enq = await db.createEnquiry({
        enquiry_type: 'GENERAL',
        guest_name: args.guestName || 'Live Chat Guest',
        guest_phone: args.guestPhone || 'Via AI Chatbot',
        message: `🚨 HUMAN HANDOFF REQUESTED from Chatbot. Reason: ${args.reason || 'Guest requested live assistance'}`,
      })

      try {
        await notificationService.sendOwnerEnquiryAlert(enq)
      } catch (e) {
        console.error('Failed to notify owner of human handoff:', e)
      }

      return {
        result: {
          success: true,
          message: 'A hotel manager has been alerted on WhatsApp and will join or contact you shortly.',
        },
        handoff: true,
      }
    }

    return { result: { error: `Unknown tool ${toolName}` } }
  }

  // Define tools for Groq LLM
  private getGroqTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_hotels',
          description: 'Search available Quadis properties and room categories by city, name, or room count.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords, property name, or area' },
              city: { type: 'string', description: 'City name (e.g. Noida or New Delhi)' },
              roomsCount: { type: 'number', description: 'Number of rooms needed' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'initiate_soft_hold',
          description: 'Create a 15-minute soft reservation hold for a guest.',
          parameters: {
            type: 'object',
            required: ['propertySlug', 'roomTypeSlug', 'checkIn', 'checkOut', 'guestName', 'guestPhone'],
            properties: {
              propertySlug: { type: 'string', description: 'Property slug e.g. hotel-cladis-sector-51-noida' },
              roomTypeSlug: { type: 'string', description: 'Room category slug e.g. deluxe-room' },
              checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)' },
              checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)' },
              roomsCount: { type: 'number', description: 'Number of rooms to hold' },
              guestsCount: { type: 'number', description: 'Total number of guests' },
              guestName: { type: 'string', description: 'Full name of guest' },
              guestPhone: { type: 'string', description: 'Phone number of guest' },
              guestEmail: { type: 'string', description: 'Email address of guest' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_banquet_enquiry',
          description: 'Submit a request or RFP for banquet hall, wedding, or corporate conference booking.',
          parameters: {
            type: 'object',
            required: ['guestName', 'guestPhone'],
            properties: {
              guestName: { type: 'string' },
              guestPhone: { type: 'string' },
              guestEmail: { type: 'string' },
              eventDate: { type: 'string' },
              guestCount: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_booking_status',
          description: 'Look up real-time status of an existing reservation booking code.',
          parameters: {
            type: 'object',
            required: ['bookingCode'],
            properties: {
              bookingCode: { type: 'string', description: 'Booking code e.g. QD-1234' },
              guestPhone: { type: 'string', description: 'Optional verification phone number' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'human_handoff',
          description: 'Trigger an immediate WhatsApp alert to human management to take over the chat or call.',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for requesting human assistance' },
              guestName: { type: 'string' },
              guestPhone: { type: 'string' },
            },
          },
        },
      },
    ]
  }

  public async chat(
    sessionId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<ChatTurnResult> {
    const toolsInvoked: string[] = []
    let handoffTriggered = false
    let reply = ''

    // 1. Try Groq API if active key exists
    if (this.groq) {
      try {
        const messages: any[] = [
          {
            role: 'system',
            content: `You are Quadis Assist, the official AI Concierge for Quadis Hotels across Noida and New Delhi.
You have tools to check real-time availability (search_hotels), hold reservations for 15 minutes (initiate_soft_hold), submit banquet RFPs (create_banquet_enquiry), look up bookings (check_booking_status), and request human handoff (human_handoff).
Always be polite, helpful, and concise. Always format prices in INR (₹).`,
          },
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ]

        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: this.getGroqTools(),
          tool_choice: 'auto',
          temperature: 0.3,
        })

        const choice = completion.choices[0]
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          messages.push(choice.message)

          for (const tc of choice.message.tool_calls) {
            toolsInvoked.push(tc.function.name)
            const args = JSON.parse(tc.function.arguments || '{}')
            const { result, handoff } = await this.executeTool(tc.function.name, args)
            if (handoff) handoffTriggered = true

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(result),
            })
          }

          const followUp = await this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.3,
          })
          reply = followUp.choices[0].message.content || 'I have completed your request.'
        } else {
          reply = choice.message.content || 'How can I assist you with your Quadis Hotels stay?'
        }

        return { reply, toolsInvoked, handoffTriggered }
      } catch (groqErr) {
        console.warn('Groq API error or rate limit, falling back to simulated agentic engine:', groqErr)
      }
    }

    // 2. Deterministic / Simulated Agentic Engine (Guaranteed fallback when API key missing or rate-limited)
    const lower = userMessage.toLowerCase()

    if (lower.includes('handoff') || lower.includes('human') || lower.includes('manager') || lower.includes('agent')) {
      toolsInvoked.push('human_handoff')
      const { result, handoff } = await this.executeTool('human_handoff', {
        reason: userMessage,
        guestName: 'Guest via Chat',
      })
      handoffTriggered = Boolean(handoff)
      reply = `🔔 ${result.message}`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('status') || lower.includes('booking') || lower.includes('qd-')) {
      const match = userMessage.match(/qd-\d+/i)
      if (match) {
        toolsInvoked.push('check_booking_status')
        const { result } = await this.executeTool('check_booking_status', { bookingCode: match[0].toUpperCase() })
        if (result.found) {
          reply = `📋 *Booking Status for ${result.bookingCode}:*
• Guest: ${result.guestName}
• Status: *${result.bookingStatus}* (${result.paymentStatus})
• Dates: ${result.dates}
• Total Amount: ${result.totalAmount}`
        } else {
          reply = `❌ No active reservation found for booking code ${match[0].toUpperCase()}. Please verify the code or contact our desk.`
        }
        return { reply, toolsInvoked, handoffTriggered }
      }
    }

    if (lower.includes('banquet') || lower.includes('wedding') || lower.includes('conference') || lower.includes('rfp')) {
      toolsInvoked.push('create_banquet_enquiry')
      const phoneMatch = userMessage.match(/\d{10}/) || ['9876543210']
      const { result } = await this.executeTool('create_banquet_enquiry', {
        guestName: 'Valued Guest',
        guestPhone: phoneMatch[0],
        message: userMessage,
        guestCount: 150,
      })
      reply = `🎉 ${result.message} (Enquiry ID: *${result.enquiryId}*). Our event director has received an instant alert on WhatsApp!`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('hold') || lower.includes('book') || lower.includes('reserve')) {
      toolsInvoked.push('initiate_soft_hold')
      const { result } = await this.executeTool('initiate_soft_hold', {
        propertySlug: 'hotel-cladis-sector-51-noida',
        roomTypeSlug: 'deluxe-room',
        checkIn: '2026-11-20',
        checkOut: '2026-11-22',
        roomsCount: 1,
        guestsCount: 2,
        guestName: 'Chatbot Guest',
        guestPhone: '9876543210',
      })
      if (result.success) {
        reply = `✅ *15-Minute Reservation Hold Created!*
• Booking Code: *${result.bookingCode}*
• Dates: ${result.checkIn} to ${result.checkOut}
• Amount: ${result.totalAmount}
💡 ${result.note}`
      } else {
        reply = `⚠️ ${result.error || 'Could not place inventory hold at this moment.'}`
      }
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Default: search hotels / check availability
    toolsInvoked.push('search_hotels')
    const city = lower.includes('delhi') ? 'New Delhi' : lower.includes('noida') ? 'Noida' : undefined
    const { result } = await this.executeTool('search_hotels', { city, search: userMessage })

    if (Array.isArray(result) && result.length > 0) {
      const topStr = result
        .slice(0, 3)
        .map(
          (h: any) =>
            `🏨 *${h.hotel}* (${h.city})\n` +
            h.availableRooms.map((r: any) => `  • ${r.roomName}: ${r.pricePerNight} (${r.availableUnits} left)`).join('\n')
        )
        .join('\n\n')

      reply = `✨ Here are available rooms matching your request:\n\n${topStr}\n\nWould you like me to hold a room for 15 minutes or connect you with our manager?`
    } else {
      reply = `👋 Welcome to Quadis Hotels! We have 10 premier properties across Noida and New Delhi starting from ₹1,399/night. You can ask me to:
1. Check room availability ("Rooms in Noida Sector 51")
2. Hold a room for 15 minutes ("Hold a Deluxe Room")
3. Book a banquet/wedding hall ("RFP for 200 guests")
4. Check booking status ("Status of QD-1234")
5. Request human manager ("Connect me with human manager")`
    }

    return { reply, toolsInvoked, handoffTriggered }
  }
}

export const aiService = new AIService()
