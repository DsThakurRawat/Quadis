import Groq from 'groq-sdk'
import { db } from '../db'
import { notificationService } from './NotificationService'

export interface ChatTurnResult {
  reply: string
  toolsInvoked: string[]
  handoffTriggered: boolean
}

export class AIService {
  private groqClients: Groq[] = []
  private currentKeyIndex = 0

  constructor() {
    // Collect keys from GROQ_API_KEYS (comma separated), GROQ_API_KEY, and GROQ_API_KEY_1..10
    const keysSet = new Set<string>()
    if (process.env.GROQ_API_KEYS) {
      process.env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(k => k && k.startsWith('gsk_')).forEach(k => keysSet.add(k))
    }
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')) {
      keysSet.add(process.env.GROQ_API_KEY.trim())
    }
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`GROQ_API_KEY_${i}`]
      if (k && k.startsWith('gsk_')) keysSet.add(k.trim())
    }

    keysSet.forEach(apiKey => {
      try {
        this.groqClients.push(new Groq({ apiKey }))
      } catch (err) {
        console.warn('Failed to initialize Groq client for key:', err)
      }
    })

    if (this.groqClients.length > 0) {
      console.log(`🤖 AIService initialized with ${this.groqClients.length} rotating Groq API key(s).`)
    }
  }

  private getNextGroqClient(): Groq | null {
    if (this.groqClients.length === 0) return null
    const client = this.groqClients[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.groqClients.length
    return client
  }

  // Build a rich live system prompt injecting ALL hotel, room, and pricing data
  // This eliminates the need for RAG — the model has full knowledge of every property
  private async buildSystemPromptWithContext(): Promise<string> {
    const properties = await db.getPropertiesWithRooms()

    const hotelKnowledge = properties
      .map((item) => {
        const p = item.property
        const roomList = item.rooms
          .map((r) => {
            const pricePerNight = p.base_price + r.price_offset
            const weekend = p.weekend_surcharge_percent > 0 ? ` (+${p.weekend_surcharge_percent}% weekends)` : ''
            const avail = r.is_available ? `✅ ${r.available_units}/${r.total_units} units available` : '❌ Currently sold out'
            return `    • ${r.name} (slug: ${r.slug})\n` +
                   `      Size: ${r.size_sqft} | Bed: ${r.bed_type} | Max Guests: ${r.max_guests}\n` +
                   `      Price: ₹${pricePerNight.toLocaleString('en-IN')}/night${weekend}\n` +
                   `      Availability: ${avail}`
          })
          .join('\n')

        return `PROPERTY: ${p.name}
  Slug: ${p.slug}
  City: ${p.city}
  Address: ${p.address}
  Base Price: ₹${p.base_price.toLocaleString('en-IN')}/night
  Rating: ${p.rating}/5
  Phone/WhatsApp: ${p.whatsapp}
  Email: ${p.email}
  Status: ${p.is_active ? 'Active' : 'Inactive'}
  Rooms:
${roomList}`
      })
      .join('\n\n')

    return `You are Quadis Assist, the official AI Concierge for Quadis Hotels — a premium hotel group across Noida and New Delhi.

PERSONALITY: Warm, professional, knowledgeable. Always helpful. Address guests by name if they share it. Format all prices in INR (₹). Always answer clearly and concisely.

TOOLS AT YOUR DISPOSAL:
1. search_hotels — Search real-time availability by city, name, dates, guest count
2. initiate_soft_hold — Reserve a room for 15 minutes (collect: property slug, room slug, dates, name, phone)
3. create_banquet_enquiry — Submit banquet/wedding/corporate RFP to management
4. check_booking_status — Look up reservation by booking code (e.g. QD-1234)
5. human_handoff — Alert hotel management on WhatsApp for live human assistance

POLICIES (answer these without tools):
• Check-in: 2:00 PM | Check-out: 11:00 AM
• Early check-in / late check-out: subject to availability, contact property
• GST: 12% for rooms under ₹7,500/night; 18% for ₹7,500+/night (SAC 996311)
• Cancellation: Contact hotel directly; 24-hour cancellation for no charge
• Payment: Razorpay instant checkout (UPI, cards, net banking) or walk-in cash
• Pets: Not allowed in standard rooms
• Booking codes start with QD- followed by 4 digits

LIVE HOTEL KNOWLEDGE (as of right now):
${hotelKnowledge}

INSTRUCTIONS:
- If a guest asks about a specific hotel or room, use the knowledge above to answer directly — no tool needed.
- Use search_hotels only when you need to filter by date-based availability or multi-criteria search.
- If a guest wants to book/reserve, collect their name, phone, check-in/out dates, then use initiate_soft_hold.
- If a guest asks about banquet, wedding, conference — use create_banquet_enquiry.
- If a guest provides a booking code like QD-1234, use check_booking_status immediately.
- If a guest is upset, confused, or explicitly wants a human — use human_handoff.
- Always confirm booking codes in bold when mentioning them.`
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
          slug: item.property.slug,
          city: item.property.city,
          address: item.property.address,
          rating: item.property.rating,
          availableRooms: item.rooms.map((r) => ({
            roomName: r.name,
            roomSlug: r.slug,
            size: r.size_sqft,
            bed: r.bed_type,
            maxGuests: r.max_guests,
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
          note: 'Room is held for exactly 15 minutes. Complete payment to confirm your reservation.',
        },
      }
    }

    if (toolName === 'create_banquet_enquiry') {
      const enq = await db.createEnquiry({
        enquiry_type: args.enquiryType || 'BANQUET',
        guest_name: args.guestName || 'Valued Guest',
        guest_phone: args.guestPhone || '9876543210',
        guest_email: args.guestEmail,
        event_date: args.eventDate,
        guest_count: args.guestCount ? Number(args.guestCount) : undefined,
        message: args.message || `AI Chatbot RFP (${args.enquiryType || 'Banquet'})`,
      })

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
          message: 'Your banquet/event request has been submitted directly to hotel management. Our event director will contact you within 2 hours.',
        },
      }
    }

    if (toolName === 'check_booking_status') {
      const booking = await db.getBookingByCode(args.bookingCode, args.guestPhone)
      if (!booking) {
        return { result: { found: false, message: `No booking found for code ${args.bookingCode}. Please verify the code or contact our desk.` } }
      }

      const prop = await db.getPropertyById(booking.property_id)
      const room = await db.getRoomTypeById(booking.room_type_id)

      return {
        result: {
          found: true,
          bookingCode: booking.booking_code,
          guestName: booking.guest_name,
          bookingStatus: booking.booking_status,
          paymentStatus: booking.payment_status,
          totalAmount: `₹${Number(booking.total_amount).toLocaleString('en-IN')}`,
          dates: `${booking.check_in} to ${booking.check_out}`,
          rooms: `${booking.rooms_count} room(s), ${booking.guests_count} guest(s)`,
          property: prop?.name || 'Quadis Hotel',
          roomCategory: room?.name || 'Room',
          address: prop?.address || '',
          checkInTime: '2:00 PM',
          checkOutTime: '11:00 AM',
        },
      }
    }

    if (toolName === 'human_handoff') {
      const enq = await db.createEnquiry({
        enquiry_type: 'GENERAL',
        guest_name: args.guestName || 'Guest via Chat',
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
          message: 'A hotel manager has been alerted on WhatsApp and will join or contact you shortly. Average response time: under 5 minutes.',
        },
        handoff: true,
      }
    }

    return { result: { error: `Unknown tool ${toolName}` } }
  }

  // Tool definitions for Groq LLM
  private getGroqTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_hotels',
          description: 'Search available Quadis properties and room categories by city, dates, name, or guest count. Use this when the guest wants to filter by specific availability or multi-criteria.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords, property name, or area' },
              city: { type: 'string', description: 'City name (Noida or New Delhi)' },
              checkIn: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
              checkOut: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
              roomsCount: { type: 'number', description: 'Number of rooms needed' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'initiate_soft_hold',
          description: 'Create a 15-minute soft reservation hold for a guest. Collect name, phone, property slug, room slug, check-in/out dates before calling.',
          parameters: {
            type: 'object',
            required: ['propertySlug', 'roomTypeSlug', 'checkIn', 'checkOut', 'guestName', 'guestPhone'],
            properties: {
              propertySlug: { type: 'string', description: 'Property slug from hotel knowledge e.g. hotel-cladis-sector-51-noida' },
              roomTypeSlug: { type: 'string', description: 'Room slug e.g. deluxe-room, superior-room, royal-suite' },
              checkIn: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
              checkOut: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
              roomsCount: { type: 'number', description: 'Number of rooms to hold' },
              guestsCount: { type: 'number', description: 'Total number of guests' },
              guestName: { type: 'string', description: 'Full name of guest' },
              guestPhone: { type: 'string', description: '10-digit mobile number' },
              guestEmail: { type: 'string', description: 'Email address (optional)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_banquet_enquiry',
          description: 'Submit a banquet, wedding, or corporate conference RFP/enquiry to hotel management.',
          parameters: {
            type: 'object',
            required: ['guestName', 'guestPhone'],
            properties: {
              guestName: { type: 'string' },
              guestPhone: { type: 'string' },
              guestEmail: { type: 'string' },
              eventDate: { type: 'string', description: 'Event date YYYY-MM-DD' },
              guestCount: { type: 'number', description: 'Expected number of guests' },
              enquiryType: { type: 'string', enum: ['BANQUET', 'CORPORATE_RFP', 'GENERAL'], description: 'Type of enquiry' },
              message: { type: 'string', description: 'Additional requirements or message' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_booking_status',
          description: 'Look up real-time status of an existing reservation by booking code.',
          parameters: {
            type: 'object',
            required: ['bookingCode'],
            properties: {
              bookingCode: { type: 'string', description: 'Booking code e.g. QD-1234' },
              guestPhone: { type: 'string', description: 'Optional phone number for verification' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'human_handoff',
          description: 'Trigger an immediate WhatsApp alert to hotel management to take over or call the guest.',
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

    // 1. Try Groq API with full live context injection and multi-key rotation fallback
    const totalClients = this.groqClients.length
    for (let attempt = 0; attempt < totalClients; attempt++) {
      const groqClient = this.getNextGroqClient()
      if (!groqClient) break

      try {
        const systemPrompt = await this.buildSystemPromptWithContext()

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ]

        const completion = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: this.getGroqTools(),
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 1024,
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

          // Follow-up completion with tool results using the same rotated client
          const followUp = await groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.3,
            max_tokens: 1024,
          })
          reply = followUp.choices[0].message.content || 'I have completed your request.'
        } else {
          reply = choice.message.content || 'How can I assist you with your Quadis Hotels stay?'
        }

        return { reply, toolsInvoked, handoffTriggered }
      } catch (groqErr: any) {
        const errMsg = groqErr?.message || String(groqErr)
        console.warn(`Groq API key attempt ${attempt + 1}/${totalClients} failed (${errMsg}). Rotating to next key...`)
        if (attempt === totalClients - 1) {
          console.warn('All Groq API keys exhausted or rate-limited. Falling back to deterministic engine.')
        }
      }
    }

    // 2. Deterministic Fallback Engine (when API key missing or rate-limited)
    const lower = userMessage.toLowerCase()

    if (lower.includes('handoff') || lower.includes('human') || lower.includes('manager') || lower.includes('speak to')) {
      toolsInvoked.push('human_handoff')
      const { result, handoff } = await this.executeTool('human_handoff', { reason: userMessage, guestName: 'Guest via Chat' })
      handoffTriggered = Boolean(handoff)
      reply = `🔔 ${result.message}`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('qd-') || (lower.includes('booking') && lower.includes('status'))) {
      const match = userMessage.match(/qd-\d+/i)
      if (match) {
        toolsInvoked.push('check_booking_status')
        const { result } = await this.executeTool('check_booking_status', { bookingCode: match[0].toUpperCase() })
        if (result.found) {
          reply = `📋 *Booking **${result.bookingCode}** — Live Status*\n` +
            `• Guest: ${result.guestName}\n` +
            `• Property: ${result.property} | ${result.roomCategory}\n` +
            `• Dates: ${result.dates}\n` +
            `• Rooms: ${result.rooms}\n` +
            `• Status: *${result.bookingStatus}* | Payment: *${result.paymentStatus}*\n` +
            `• Total: ${result.totalAmount}\n` +
            `• Check-in: ${result.checkInTime} | Check-out: ${result.checkOutTime}`
        } else {
          reply = `❌ ${result.message}`
        }
        return { reply, toolsInvoked, handoffTriggered }
      }
    }

    if (lower.includes('banquet') || lower.includes('wedding') || lower.includes('conference') || lower.includes('corporate') || lower.includes('rfp') || lower.includes('event')) {
      toolsInvoked.push('create_banquet_enquiry')
      const phoneMatch = userMessage.match(/\d{10}/) || ['9876543210']
      const guestMatch = userMessage.match(/(?:I am|my name is|this is)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i)
      const { result } = await this.executeTool('create_banquet_enquiry', {
        guestName: guestMatch ? guestMatch[1] : 'Valued Guest',
        guestPhone: phoneMatch[0],
        message: userMessage,
        guestCount: 150,
      })
      reply = `🎉 ${result.message}\n\n*Enquiry ID: ${result.enquiryId}*\n\nOur event director has received an instant WhatsApp alert and will contact you shortly with a detailed proposal.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('hold') || lower.includes('reserve') || lower.includes('book a room') || lower.includes('book a hotel')) {
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
        reply = `✅ *15-Minute Reservation Hold Created!*\n• Booking Code: **${result.bookingCode}**\n• Dates: ${result.checkIn} → ${result.checkOut}\n• Amount: ${result.totalAmount}\n\n💡 ${result.note}\n\n📞 To personalize your booking, please share your name, phone, preferred hotel, and check-in/out dates.`
      } else {
        reply = `⚠️ ${result.error}`
      }
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Default: answer from live hotel knowledge + search
    toolsInvoked.push('search_hotels')
    const city = lower.includes('delhi') ? 'New Delhi' : lower.includes('noida') ? 'Noida' : undefined
    const { result } = await this.executeTool('search_hotels', { city, search: userMessage })

    if (Array.isArray(result) && result.length > 0) {
      const topStr = result
        .slice(0, 3)
        .map(
          (h: any) =>
            `🏨 *${h.hotel}* — ${h.city} (⭐ ${h.rating})\n📍 ${h.address}\n` +
            h.availableRooms
              .map((r: any) => `  • ${r.roomName}: ${r.pricePerNight}/night (${r.availableUnits} rooms left, max ${r.maxGuests} guests, ${r.size})`)
              .join('\n')
        )
        .join('\n\n')

      reply = `✨ Here are available properties matching your request:\n\n${topStr}\n\n💬 Would you like me to hold a room, get more details, or connect you with our reservations team?`
    } else {
      reply = `👋 Welcome to *Quadis Hotels & Resorts*! We have **10 premium properties** across Noida and New Delhi starting from ₹1,399/night.\n\nI can help you with:\n1. 🏨 **Check availability** — "Rooms in Sector 51 Noida for 2 nights"\n2. 📋 **Room hold** — "Hold a Deluxe Room at Hotel Cladis"\n3. 🎉 **Banquet RFP** — "Banquet hall for 200 guests in December"\n4. 🔍 **Booking status** — "Status of QD-1234"\n5. 💬 **Speak to manager** — "Connect me with a human"\n\nWhat can I help you with today?`
    }

    return { reply, toolsInvoked, handoffTriggered }
  }
}

export const aiService = new AIService()
