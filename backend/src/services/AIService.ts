import Groq from 'groq-sdk'
import { GoogleGenAI } from '@google/genai'
import { db } from '../db'
import { notificationService } from './NotificationService'
import { policyFor } from '../lib/pricing'

export interface ChatTurnResult {
  reply: string
  toolsInvoked: string[]
  handoffTriggered: boolean
}

export class AIService {
  private groqClients: Groq[] = []
  private geminiClients: GoogleGenAI[] = []
  private currentGeminiKeyIndex = 0
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

    
    const geminiKeysSet = new Set<string>()
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k).forEach(k => geminiKeysSet.add(k))
    }
    if (process.env.GEMINI_API_KEY) {
      geminiKeysSet.add(process.env.GEMINI_API_KEY.trim())
    }
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`]
      if (k) geminiKeysSet.add(k.trim())
    }

    geminiKeysSet.forEach(apiKey => {
      try {
        this.geminiClients.push(new GoogleGenAI({ apiKey }))
      } catch (err) {
        console.warn('Failed to initialize Gemini client for key:', err)
      }
    })

    if (this.geminiClients.length > 0) {
      console.log(`🤖 AIService initialized with ${this.geminiClients.length} rotating Gemini API key(s).`)
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

    // Warn only when BOTH pools are empty. This was tied to the Groq pool
    // alone, so a Gemini-only deploy — the working configuration — booted
    // announcing it had no usable key at all. A guard that fires while the
    // thing it guards is healthy is how the real warning gets ignored.
    if (this.geminiClients.length === 0 && this.groqClients.length === 0) {
      // With no clients neither provider loop runs, and every visitor gets the
      // deterministic engine at HTTP 200 — the assistant looks alive while
      // answering from a keyword table. Nothing else makes that visible.
      console.warn(
        '[Quadis] AIService has NO usable API key for either provider ' +
        '(GEMINI_API_KEY / GEMINI_API_KEYS / GEMINI_API_KEY_1..10, or ' +
        'GROQ_API_KEY / GROQ_API_KEYS / GROQ_API_KEY_1..10 which must begin ' +
        'with "gsk_"). The chat assistant will reply with static fallback text.'
      )
    }
  }

  
  private getNextGeminiClient(): GoogleGenAI | null {
    if (this.geminiClients.length === 0) return null
    const client = this.geminiClients[this.currentGeminiKeyIndex]
    this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiClients.length
    return client
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

    // This prompt is rebuilt and re-sent on EVERY request, and Groq's token
    // budget is a shared daily pool, so it must carry only what the model
    // cannot obtain from a tool. Room dimensions, bed types and live unit
    // counts moved out to search_hotels, which already returns them on demand.
    // The occupancy policy and the contact number are stated once rather than
    // duplicated across all nine properties.
    //
    // Occupancy pricing is per-property configurable, so it cannot simply be
    // hardcoded once: state the shared rule and then name any property that
    // deviates. A divergent property must never inherit the common rate — the
    // whole point of these bands is not under-quoting a guest with a child.
    const policies = properties.map((item) => ({ p: item.property, policy: policyFor(item.property) }))
    const shapeOf = (x: ReturnType<typeof policyFor>) =>
      `${x.extraAdultPercent}/${x.childFreeUnderAge}/${x.childPercent}/${x.adultFromAge}`
    const shapeCounts = new Map<string, number>()
    policies.forEach(({ policy }) => shapeCounts.set(shapeOf(policy), (shapeCounts.get(shapeOf(policy)) || 0) + 1))
    const commonShape = [...shapeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const commonPolicy = policies.find(({ policy }) => shapeOf(policy) === commonShape)?.policy
    const outliers = policies.filter(({ policy }) => shapeOf(policy) !== commonShape)

    const occupancyRules = commonPolicy
      ? `• Every rate covers 2 adults per room.
• Each additional ADULT adds +${commonPolicy.extraAdultPercent}% of that night's room rate.
• CHILDREN: under ${commonPolicy.childFreeUnderAge} free | ${commonPolicy.childFreeUnderAge}-${commonPolicy.adultFromAge - 1} adds +${commonPolicy.childPercent}% | ${commonPolicy.adultFromAge}+ charged as a full adult.
• ALWAYS ask a child's age before quoting. NEVER say children are free without it, and NEVER quote a 3-adult room at the 2-adult rate.${
          outliers.length
            ? `\n• EXCEPTIONS — these properties differ, use their numbers instead:\n${outliers
                .map(({ p, policy }) => `    ${p.name}: extra adult +${policy.extraAdultPercent}%, child free under ${policy.childFreeUnderAge}, ${policy.childFreeUnderAge}-${policy.adultFromAge - 1} +${policy.childPercent}%, adult from ${policy.adultFromAge}`)
                .join('\n')}`
            : ''
        }`
      : ''

    const hotelKnowledge = properties
      .map((item) => {
        const p = item.property
        const rooms = item.rooms
          .map((r) => {
            const pricePerNight = p.base_price + r.price_offset
            return `${r.name} [${r.slug}] ₹${pricePerNight.toLocaleString('en-IN')}${r.is_available ? '' : ' SOLD OUT'}`
          })
          .join('; ')
        const weekend = p.weekend_surcharge_percent > 0 ? ` +${p.weekend_surcharge_percent}% weekends.` : ''
        const inactive = p.is_active ? '' : ' [INACTIVE — do not offer]'
        return `${p.name} [${p.slug}] — ${p.city}, ⭐${p.rating}${inactive}. ${p.address}. From ₹${p.base_price.toLocaleString('en-IN')}/night.${weekend} Rooms: ${rooms}`
      })
      .join('\n')

    const contact = properties[0]?.property?.whatsapp || '+91 92173 73532'
    const email = properties[0]?.property?.email || 'stay@quadishotels.com'

    return `You are Quadis Assist, the official AI Concierge for Quadis Hotels — a premium hotel group across Noida and New Delhi.

PERSONALITY: Warm, professional, knowledgeable. Always helpful. Address guests by name if they share it. Format all prices in INR (₹). Always answer clearly and concisely.

TOOLS AT YOUR DISPOSAL:
1. search_hotels — Search real-time availability by city, name, dates, guest count
2. initiate_soft_hold — Reserve a room for 15 minutes (collect: property slug, room slug, dates, name, phone)
3. create_banquet_enquiry — Submit banquet/wedding/corporate RFP to management
4. check_booking_status — Look up reservation by booking code (e.g. QD-5JY4ZB7E)
5. human_handoff — Alert hotel management on WhatsApp for live human assistance

POLICIES (answer these without tools):
• Check-in 2:00 PM | Check-out 11:00 AM. Early/late subject to availability.
${occupancyRules}
• GST: 12% under ₹7,500/night; 18% at ₹7,500+ (SAC 996311)
• Cancellation: free up to 24 hours before check-in
• Payment: UPI/card/net banking via secure checkout, or cash at the property
• Pets: not allowed in standard rooms
• Booking codes are QD- followed by 8 characters
• Contact: ${contact} | ${email}

HOTELS (name [slug] — city, rating, address, from-price, rooms with rates):
${hotelKnowledge}

INSTRUCTIONS:
- Answer from the hotel list above where you can — no tool needed for names, cities, addresses or rates.
- Call search_hotels for room size, bed type, live unit counts, or date-based availability. Those are deliberately not listed above; do not guess them.
- Booking: collect name, phone and dates, then use initiate_soft_hold.
- Banquet/wedding/conference enquiries: use create_banquet_enquiry.
- A booking code like QD-5JY4ZB7E: use check_booking_status immediately.
- Upset, confused, or asking for a person: use human_handoff.
- Keep replies short — 2-4 sentences unless the guest asked for a list. Confirm booking codes in bold.`
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
        // Pass the split when the model collected it. The server re-derives the
        // extra-bed charge either way; if only guestsCount arrives, it treats
        // the whole party as adults, which errs toward charging rather than
        // undercharging.
        adultsCount: args.adultsCount !== undefined ? Number(args.adultsCount) : undefined,
        childAges: Array.isArray(args.childAges) ? args.childAges.map(Number) : undefined,
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
          description: '15-minute reservation hold. Collect name, phone, slugs and dates first.',
          parameters: {
            type: 'object',
            required: ['propertySlug', 'roomTypeSlug', 'checkIn', 'checkOut', 'guestName', 'guestPhone'],
            properties: {
              propertySlug: { type: 'string', description: 'Slug in [brackets] in the hotel list' },
              roomTypeSlug: { type: 'string', description: 'Room slug in [brackets], e.g. deluxe-room' },
              checkIn: { type: 'string', description: 'YYYY-MM-DD' },
              checkOut: { type: 'string', description: 'YYYY-MM-DD' },
              roomsCount: { type: 'number' },
              guestsCount: { type: 'number', description: 'Adults + children' },
              // These two used to state "18+" and "under 12 stay free", which
              // contradicted the occupancy policy in the system prompt (adult
              // from 13, free under 8) and is exactly how a guest gets quoted a
              // child rate they will not be billed. Defer to the policy instead
              // of restating thresholds that are per-property configurable.
              adultsCount: { type: 'number', description: 'Adults, per the age threshold in the occupancy policy' },
              childAges: {
                type: 'array',
                items: { type: 'number' },
                description: 'One entry per child. Charge follows the age bands in the occupancy policy — never assume free.',
              },
              guestName: { type: 'string' },
              guestPhone: { type: 'string', description: '10-digit mobile' },
              guestEmail: { type: 'string' },
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
              bookingCode: { type: 'string', description: 'Booking code e.g. QD-5JY4ZB7E' },
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

    
    // 0. Try Gemini API first
    const totalGeminiClients = this.geminiClients.length
    for (let attempt = 0; attempt < totalGeminiClients; attempt++) {
      const geminiClient = this.getNextGeminiClient()
      if (!geminiClient) break

      try {
        const systemPrompt = await this.buildSystemPromptWithContext()
        const contents: any[] = history.slice(-6).map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }))
        contents.push({ role: 'user', parts: [{ text: userMessage }] })

        const tools = [{ functionDeclarations: this.getGroqTools().map((t: any) => t.function) }]

        const response = await geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools,
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })

        if (response.functionCalls && response.functionCalls.length > 0) {
          contents.push({
            role: 'model',
            parts: response.functionCalls.map(fc => ({ functionCall: fc }))
          })

          const functionResponses: any[] = []
          for (const tc of response.functionCalls) {
            toolsInvoked.push(tc.name!)
            const { result, handoff } = await this.executeTool(tc.name!, tc.args as any)
            if (handoff) handoffTriggered = true
            functionResponses.push({
              functionResponse: {
                name: tc.name,
                // Gemini types this as Record<string, unknown> and rejects
                // anything that is not a JSON object. executeTool returns a
                // bare ARRAY for search_hotels, which failed the follow-up call
                // outright — and search_hotels is the tool most guests trigger,
                // so every availability question fell through Gemini, then
                // through a rate-limited Groq, to the canned engine. The plain
                // chat path hid it: tools are attached to every request, so a
                // greeting still worked and the provider looked healthy.
                // "output" is the key the API documents for function results.
                response: { output: result },
              }
            })
          }

          contents.push({
            role: 'user',
            parts: functionResponses
          })

          const followUp = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
              systemInstruction: systemPrompt,
              tools,
              temperature: 0.3,
              maxOutputTokens: 500
            }
          })
          reply = followUp.text || 'I have completed your request.'
        } else {
          reply = response.text || 'How can I assist you with your Quadis Hotels stay?'
        }

        return { reply, toolsInvoked, handoffTriggered }
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || String(geminiErr)
        console.warn(`Gemini API key attempt ${attempt + 1}/${totalGeminiClients} failed (${errMsg}). Rotating to next key...`)
      }
    }

    // 1. Try Groq API as fallback
    const totalClients = this.groqClients.length
    for (let attempt = 0; attempt < totalClients; attempt++) {
      const groqClient = this.getNextGroqClient()
      if (!groqClient) break

      try {
        const systemPrompt = await this.buildSystemPromptWithContext()

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          // Only the recent turns. The client posts its entire transcript, and
          // an unbounded history means a long chat re-sends every prior message
          // on every request — the cost grows quadratically against a shared
          // daily token pool. Six turns is enough to follow a booking thread.
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ]

        const completion = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: this.getGroqTools(),
          tool_choice: 'auto',
          temperature: 0.3,
          // Reserved against the daily token budget whether or not it is used,
          // so this ceiling is a direct cost lever. Replies are meant to be a
          // few sentences; 1024 was paying for headroom nothing needed.
          max_tokens: 500,
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
            max_tokens: 500,
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
      // Codes are `QD-` + 8 Crockford base32 symbols, not digits.
      const match = userMessage.match(/qd-[0-9a-hjkmnp-tv-z]{8}/i)
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

    // NOTHING BELOW THIS POINT MAY WRITE TO THE DATABASE.
    //
    // This engine cannot see what the guest actually said — it only matches
    // keywords — so anything it stores is invented. It used to create a real
    // enquiry for any message containing "wedding", filed under guest name
    // "Valued Guest" with phone 9876543210 and a flat 150 guests, and to place
    // a real 15-minute inventory hold on hardcoded November dates for anything
    // containing "book a room". Both fired a WhatsApp alert to management, and
    // the rows are indistinguishable from genuine leads. Collect and hand off;
    // never invent a booking.
    const contactNumber = (await db.getProperties())[0]?.whatsapp || '+91 92173 73532'

    // Greetings and thanks. These previously fell through to the property dump
    // at the bottom, so "hi" was answered with three hotels and a price list.
    if (/^(hi|hii+|hey|hello|yo|namaste|hola|good\s+(morning|afternoon|evening))\b[\s!.,]*$/i.test(userMessage.trim())) {
      reply = `Hello! 👋 I'm Quadis Assist.\n\nI can help you find a room, check availability, plan a banquet, or look up an existing booking. What are you after?`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (/^(thanks|thank you|thx|ty|ok|okay|cool|great|bye|goodbye)\b[\s!.,]*$/i.test(userMessage.trim())) {
      reply = `Happy to help! 🙏 If you need anything else, just ask — or reach our team on ${contactNumber}.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Policy questions the prompt already answers without any lookup.
    if (lower.includes('check-in') || lower.includes('check in') || lower.includes('checkin') ||
        lower.includes('check-out') || lower.includes('check out') || lower.includes('checkout')) {
      reply = `Check-in is from *2:00 PM* and check-out is *11:00 AM*.\n\nEarly check-in and late check-out are subject to availability on the day — call ${contactNumber} and we'll try to arrange it.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) {
      reply = `Sorry — pets aren't allowed in our standard rooms. For anything specific, please call ${contactNumber}.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('cancel') || lower.includes('refund')) {
      reply = `Cancellations are free up to *24 hours* before check-in. To cancel or change a booking, call ${contactNumber} with your booking code (it starts with QD-).`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('gst') || lower.includes('invoice') || lower.includes('tax')) {
      reply = `GST is *12%* on rooms under ₹7,500/night and *18%* at ₹7,500 and above (SAC 996311). A GST invoice is issued against your booking code — call ${contactNumber} if you need it re-sent.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('pay') || lower.includes('upi') || lower.includes('card')) {
      reply = `You can pay by UPI, card or net banking through our secure checkout, or in cash at the property on arrival.\n\nTo book, use *Check availability* on the site, or call ${contactNumber}.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Occupancy and child pricing. This is the costliest question to get wrong
    // — answering "yes, children are free" to a parent of a 10-year-old
    // under-quotes a booking they are then billed for at the counter. It used
    // to fall through to a property search and answer "I couldn't match that to
    // a property", so the guest got nothing. State the real bands instead,
    // read from the property record rather than restated as literals here.
    if (lower.includes('child') || lower.includes('kid') || lower.includes('infant') ||
        lower.includes('extra adult') || lower.includes('extra bed') || lower.includes('occupancy') ||
        (lower.includes('adult') && (lower.includes('free') || lower.includes('charge') || lower.includes('cost')))) {
      const props = await db.getProperties()
      const pol = props[0] ? policyFor(props[0]) : null
      if (pol) {
        reply = `Every rate covers *2 adults* per room.\n\n` +
          `• A third adult adds *+${pol.extraAdultPercent}%* of the room rate that night.\n` +
          `• Children under *${pol.childFreeUnderAge}* stay free.\n` +
          `• Ages *${pol.childFreeUnderAge}–${pol.adultFromAge - 1}* add *+${pol.childPercent}%*.\n` +
          `• Age *${pol.adultFromAge}+* is charged as a full adult.\n\n` +
          `Tell me your children's ages and I'll be exact — or call ${contactNumber} for a firm quote.`
        return { reply, toolsInvoked, handoffTriggered }
      }
    }

    // Banquets and events. Answer and route — do not file an enquiry the guest
    // did not actually give us the details for.
    if (lower.includes('banquet') || lower.includes('wedding') || lower.includes('conference') || lower.includes('corporate') || lower.includes('rfp') || lower.includes('event')) {
      reply = `We'd love to host your event. 🎉\n\nOur banquet spaces across Noida and New Delhi handle everything from small corporate meets to weddings.\n\nThe quickest way forward is our *Banquets* page — send the date, guest count and city there and our events team replies with a proposal. Or call ${contactNumber} to speak to them directly.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    if (lower.includes('hold') || lower.includes('reserve') || lower.includes('book a room') || lower.includes('book a hotel') || lower.includes('booking')) {
      reply = `Happy to get you booked. 🛎️\n\nI can't complete a reservation myself right now, and I'd rather not hold the wrong room on your behalf.\n\nUse *Check availability* on the site to pick your dates and confirm instantly, or call ${contactNumber} and our reservations team will do it with you.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Rooms, rates and availability. Only search when the guest actually asked
    // about staying somewhere — the old code ran this for EVERY unmatched
    // message, so "hi" was answered with a full inventory listing.
    const asksAboutRooms = ['room', 'rate', 'price', 'cost', 'tariff', 'availab', 'stay', 'night', 'hotel', 'noida', 'delhi', 'suite', 'deluxe']
      .some((w) => lower.includes(w))

    const properties = await db.getProperties()

    if (asksAboutRooms) {
      toolsInvoked.push('search_hotels')
      const city = lower.includes('delhi') ? 'New Delhi' : lower.includes('noida') ? 'Noida' : undefined
      const { result } = await this.executeTool('search_hotels', { city, search: userMessage })

      if (Array.isArray(result) && result.length > 0) {
        // One line per hotel with its lowest rate. The full room-by-room dump
        // ran to a thousand characters and buried the answer.
        const list = result
          .slice(0, 4)
          .map((h: any) => {
            const cheapest = h.availableRooms
              .map((r: any) => Number(String(r.pricePerNight).replace(/[^0-9]/g, '')))
              .filter((n: number) => n > 0)
              .sort((a: number, b: number) => a - b)[0]
            return `• *${h.hotel}* — ${h.city}${cheapest ? ` · from ₹${cheapest.toLocaleString('en-IN')}/night` : ''}`
          })
          .join('\n')

        const more = result.length > 4 ? `\n\n…and ${result.length - 4} more.` : ''
        reply = `Here's what we have${result.length > 1 ? '' : ''}:\n\n${list}${more}\n\nTell me your city and dates and I'll narrow it down — or call ${contactNumber} to book.`
        return { reply, toolsInvoked, handoffTriggered }
      }

      reply = `I couldn't match that to a property. We're across Noida and New Delhi — tell me the area and your dates, or call ${contactNumber} and our team will find you something.`
      return { reply, toolsInvoked, handoffTriggered }
    }

    // Genuinely unrecognised. Say what we can do, briefly — the old version
    // answered this with a five-item numbered menu and a "from ₹1,399/night"
    // claim that no property's rate actually supported.
    const cheapestOverall = properties
      .map((p) => p.base_price)
      .filter((n) => typeof n === 'number' && n > 0)
      .sort((a, b) => a - b)[0]

    reply = `I can help with rooms and availability across our ${properties.length} hotels in Noida and New Delhi` +
      `${cheapestOverall ? ` (from ₹${cheapestOverall.toLocaleString('en-IN')}/night)` : ''}` +
      `, banquet and event enquiries, or the status of an existing booking.\n\nWhat would you like to do? For anything urgent, call ${contactNumber}.`

    return { reply, toolsInvoked, handoffTriggered }
  }
}

export const aiService = new AIService()
