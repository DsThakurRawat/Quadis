import { Pool } from 'pg'
import { PropertyRecord, RoomTypeRecord, BookingRecord, EnquiryRecord, ChatLogRecord } from '../types'
import { seedProperties, seedRoomTypes } from '../data/seed'

// DatabaseEngine abstraction layer providing seamless support for real PostgreSQL via pg Pool
// or structured in-memory ACID store when DATABASE_URL is not set (for zero-config local dev/tests).

export class DatabaseEngine {
  private pool: Pool | null = null
  public useInMemory: boolean

  // In-Memory state store for testing without active PostgreSQL cloud instance
  public memoryProperties: Map<string, PropertyRecord> = new Map()
  public memoryRoomTypes: Map<string, RoomTypeRecord> = new Map()
  public memoryBookings: Map<string, BookingRecord> = new Map()
  public memoryEnquiries: Map<string, EnquiryRecord> = new Map()
  public memoryChatLogs: Map<string, ChatLogRecord> = new Map()

  constructor() {
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && dbUrl !== 'in-memory') {
      this.useInMemory = false
      this.pool = new Pool({ connectionString: dbUrl })
    } else {
      this.useInMemory = true
      this.initializeInMemorySeed()
    }
  }

  public initializeInMemorySeed() {
    this.memoryProperties.clear()
    this.memoryRoomTypes.clear()
    this.memoryBookings.clear()
    this.memoryEnquiries.clear()
    this.memoryChatLogs.clear()

    seedProperties.forEach((p) => {
      this.memoryProperties.set(p.id, { ...p })
    })
    seedRoomTypes.forEach((r) => {
      this.memoryRoomTypes.set(r.id, { ...r })
    })
  }

  public async getProperties(): Promise<PropertyRecord[]> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM properties WHERE is_active = true')
      return res.rows
    }
    return Array.from(this.memoryProperties.values()).filter((p) => p.is_active)
  }

  public async getPropertiesWithRooms(): Promise<Array<{ property: PropertyRecord; rooms: RoomTypeRecord[] }>> {
    const props = await this.getProperties()
    if (!this.useInMemory && this.pool) {
      const allRooms = await this.pool.query('SELECT * FROM room_types')
      return props.map((p) => ({
        property: p,
        rooms: allRooms.rows.filter((r) => r.property_id === p.id),
      }))
    }
    const allRooms = Array.from(this.memoryRoomTypes.values())
    return props.map((p) => ({
      property: p,
      rooms: allRooms.filter((r) => r.property_id === p.id),
    }))
  }

  public async getPropertyBySlug(slug: string): Promise<{ property: PropertyRecord | null; roomTypes: RoomTypeRecord[] }> {
    if (!this.useInMemory && this.pool) {
      const propRes = await this.pool.query('SELECT * FROM properties WHERE slug = $1 AND is_active = true', [slug])
      if (propRes.rows.length === 0) return { property: null, roomTypes: [] }
      const prop: PropertyRecord = propRes.rows[0]
      const roomsRes = await this.pool.query('SELECT * FROM room_types WHERE property_id = $1', [prop.id])
      return { property: prop, roomTypes: roomsRes.rows }
    }
    const prop = Array.from(this.memoryProperties.values()).find((p) => p.slug === slug && p.is_active) || null
    if (!prop) return { property: null, roomTypes: [] }
    const rooms = Array.from(this.memoryRoomTypes.values()).filter((r) => r.property_id === prop.id)
    return { property: prop, roomTypes: rooms }
  }

  public async initiateBookingHold(payload: {
    propertySlug: string
    roomTypeSlug: string
    checkIn: string
    checkOut: string
    roomsCount: number
    guestsCount: number
    guestName: string
    guestPhone: string
    guestEmail?: string
    companyName?: string
    gstin?: string
  }): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
    if (new Date(payload.checkOut).getTime() <= new Date(payload.checkIn).getTime()) {
      return { success: false, error: 'Check-out date must be strictly after check-in date' }
    }

    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        // Lock room type row for update
        const roomRes = await client.query(
          `SELECT rt.*, p.id as prop_id, p.base_price FROM room_types rt
           JOIN properties p ON p.id = rt.property_id
           WHERE p.slug = $1 AND rt.slug = $2 FOR UPDATE`,
          [payload.propertySlug, payload.roomTypeSlug]
        )
        if (roomRes.rows.length === 0) {
          await client.query('ROLLBACK')
          return { success: false, error: 'Property or room category not found' }
        }
        const room = roomRes.rows[0]
        if (room.available_units < payload.roomsCount) {
          await client.query('ROLLBACK')
          return { success: false, error: `Only ${room.available_units} units available for this room category` }
        }

        // Decrement available units
        await client.query('UPDATE room_types SET available_units = available_units - $1 WHERE id = $2', [
          payload.roomsCount,
          room.id,
        ])

        const randomSuffix = Math.floor(1000 + Math.random() * 9000)
        const bookingCode = `QD-${randomSuffix}`
        const nights = Math.max(1, Math.round((new Date(payload.checkOut).getTime() - new Date(payload.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
        const totalAmount = (Number(room.base_price) + Number(room.price_offset)) * nights * payload.roomsCount

        const insertRes = await client.query(
          `INSERT INTO bookings (
            booking_code, property_id, room_type_id, guest_name, guest_phone, guest_email, company_name, gstin,
            check_in, check_out, rooms_count, guests_count, total_amount, booking_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING_PAYMENT', NOW()) RETURNING *`,
          [
            bookingCode,
            room.prop_id,
            room.id,
            payload.guestName,
            payload.guestPhone,
            payload.guestEmail || null,
            payload.companyName || null,
            payload.gstin || null,
            payload.checkIn,
            payload.checkOut,
            payload.roomsCount,
            payload.guestsCount,
            totalAmount,
          ]
        )
        await client.query('COMMIT')
        return { success: true, booking: insertRes.rows[0] }
      } catch (err: any) {
        await client.query('ROLLBACK')
        return { success: false, error: err.message || 'Transaction error during booking hold' }
      } finally {
        client.release()
      }
    }

    // In-Memory ACID Transaction simulation
    const prop = Array.from(this.memoryProperties.values()).find((p) => p.slug === payload.propertySlug)
    if (!prop) return { success: false, error: 'Property not found' }
    const room = Array.from(this.memoryRoomTypes.values()).find(
      (r) => r.property_id === prop.id && r.slug === payload.roomTypeSlug
    )
    if (!room) return { success: false, error: 'Room category not found' }
    if (room.available_units < payload.roomsCount) {
      return { success: false, error: `Only ${room.available_units} units available for this room category` }
    }

    // Decrement available units
    room.available_units -= payload.roomsCount
    this.memoryRoomTypes.set(room.id, room)

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const bookingCode = `QD-${randomSuffix}`
    const nights = Math.max(1, Math.round((new Date(payload.checkOut).getTime() - new Date(payload.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    const totalAmount = (prop.base_price + room.price_offset) * nights * payload.roomsCount

    const bookingRecord: BookingRecord = {
      id: `booking-${Date.now()}-${randomSuffix}`,
      booking_code: bookingCode,
      property_id: prop.id,
      room_type_id: room.id,
      guest_name: payload.guestName,
      guest_phone: payload.guestPhone,
      guest_email: payload.guestEmail,
      company_name: payload.companyName,
      gstin: payload.gstin,
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      rooms_count: payload.roomsCount,
      guests_count: payload.guestsCount,
      total_amount: totalAmount,
      payment_mode: 'INSTANT_FULL_PAYMENT',
      payment_status: 'PENDING',
      booking_status: 'PENDING_PAYMENT',
      created_at: new Date(),
    }
    this.memoryBookings.set(bookingRecord.id, bookingRecord)
    return { success: true, booking: bookingRecord }
  }

  public async getBookingByCode(bookingCode: string, guestPhone?: string): Promise<BookingRecord | null> {
    if (!this.useInMemory && this.pool) {
      const query = guestPhone
        ? 'SELECT * FROM bookings WHERE booking_code = $1 AND guest_phone = $2'
        : 'SELECT * FROM bookings WHERE booking_code = $1'
      const params = guestPhone ? [bookingCode, guestPhone] : [bookingCode]
      const res = await this.pool.query(query, params)
      return res.rows[0] || null
    }
    const booking = Array.from(this.memoryBookings.values()).find(
      (b) => b.booking_code === bookingCode && (!guestPhone || b.guest_phone === guestPhone)
    )
    return booking || null
  }

  public async getPropertyById(id: string): Promise<PropertyRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM properties WHERE id = $1', [id])
      return res.rows[0] || null
    }
    return this.memoryProperties.get(id) || null
  }

  public async getRoomTypeById(id: string): Promise<RoomTypeRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM room_types WHERE id = $1', [id])
      return res.rows[0] || null
    }
    return this.memoryRoomTypes.get(id) || null
  }

  public async updateBookingPayment(
    bookingCode: string,
    payload: {
      paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
      bookingStatus?: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
      razorpayOrderId?: string
      razorpayPaymentId?: string
      razorpayPaymentLinkId?: string
    }
  ): Promise<BookingRecord | null> {
    const existing = await this.getBookingByCode(bookingCode)
    if (!existing) return null

    const newPaymentStatus = payload.paymentStatus || existing.payment_status
    const newBookingStatus = payload.bookingStatus || existing.booking_status
    const rzpOrder = payload.razorpayOrderId !== undefined ? payload.razorpayOrderId : existing.razorpay_order_id
    const rzpPayment = payload.razorpayPaymentId !== undefined ? payload.razorpayPaymentId : existing.razorpay_payment_id
    const rzpLink = payload.razorpayPaymentLinkId !== undefined ? payload.razorpayPaymentLinkId : existing.razorpay_payment_link_id

    const shouldReleaseInventory =
      existing.booking_status === 'PENDING_PAYMENT' &&
      (newBookingStatus === 'CANCELLED' || newBookingStatus === 'EXPIRED' || newPaymentStatus === 'FAILED')

    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        if (shouldReleaseInventory) {
          await client.query(
            `UPDATE room_types SET available_units = LEAST(total_units, available_units + $1) WHERE id = $2`,
            [existing.rooms_count, existing.room_type_id]
          )
        }
        const res = await client.query(
          `UPDATE bookings SET
             payment_status = $1,
             booking_status = $2,
             razorpay_order_id = $3,
             razorpay_payment_id = $4,
             razorpay_payment_link_id = $5
           WHERE booking_code = $6 RETURNING *`,
          [newPaymentStatus, newBookingStatus, rzpOrder || null, rzpPayment || null, rzpLink || null, bookingCode]
        )
        await client.query('COMMIT')
        return res.rows[0] || null
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    // In-memory update
    if (shouldReleaseInventory) {
      const room = this.memoryRoomTypes.get(existing.room_type_id)
      if (room) {
        room.available_units = Math.min(room.total_units, room.available_units + existing.rooms_count)
        this.memoryRoomTypes.set(room.id, room)
      }
    }

    existing.payment_status = newPaymentStatus
    existing.booking_status = newBookingStatus
    if (rzpOrder !== undefined) existing.razorpay_order_id = rzpOrder
    if (rzpPayment !== undefined) existing.razorpay_payment_id = rzpPayment
    if (rzpLink !== undefined) existing.razorpay_payment_link_id = rzpLink

    this.memoryBookings.set(existing.id, existing)
    return existing
  }

  public async cleanupExpiredHolds(expireThresholdMinutes: number = 15): Promise<number> {
    const thresholdDate = new Date(Date.now() - expireThresholdMinutes * 60 * 1000)
    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        const expiredRes = await client.query(
          `SELECT * FROM bookings WHERE booking_status = 'PENDING_PAYMENT' AND created_at < $1 FOR UPDATE SKIP LOCKED`,
          [thresholdDate]
        )
        let count = 0
        for (const booking of expiredRes.rows) {
          await client.query(`UPDATE bookings SET booking_status = 'EXPIRED' WHERE id = $1`, [booking.id])
          await client.query(
            `UPDATE room_types SET available_units = LEAST(total_units, available_units + $1) WHERE id = $2`,
            [booking.rooms_count, booking.room_type_id]
          )
          count++
        }
        await client.query('COMMIT')
        return count
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    // In-Memory Hold Cleanup
    let count = 0
    this.memoryBookings.forEach((booking) => {
      if (booking.booking_status === 'PENDING_PAYMENT' && booking.created_at < thresholdDate) {
        booking.booking_status = 'EXPIRED'
        const room = this.memoryRoomTypes.get(booking.room_type_id)
        if (room) {
          room.available_units = Math.min(room.total_units, room.available_units + booking.rooms_count)
          this.memoryRoomTypes.set(room.id, room)
        }
        this.memoryBookings.set(booking.id, booking)
        count++
      }
    })
    return count
  }

  public async getAllBookings(limit: number = 50): Promise<BookingRecord[]> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1', [limit])
      return res.rows
    }
    const all = Array.from(this.memoryBookings.values())
    return all
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  public async getGlanceMetrics(): Promise<{
    todayCheckIns: number
    pendingHolds: number
    pendingEnquiries: number
    todayRevenue: number
  }> {
    const todayStr = new Date().toISOString().split('T')[0]

    if (!this.useInMemory && this.pool) {
      const checkInsRes = await this.pool.query(
        "SELECT COUNT(*) as count FROM bookings WHERE check_in = $1 AND booking_status = 'CONFIRMED'",
        [todayStr]
      )
      const holdsRes = await this.pool.query(
        "SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'PENDING_PAYMENT'"
      )
      const enqRes = await this.pool.query(
        "SELECT COUNT(*) as count FROM enquiries WHERE status IN ('NEW', 'CONTACTED', 'LINK_SENT')"
      )
      const revRes = await this.pool.query(
        "SELECT SUM(total_amount) as total FROM bookings WHERE booking_status = 'CONFIRMED' AND DATE(created_at) = $1",
        [todayStr]
      )

      return {
        todayCheckIns: Number(checkInsRes.rows[0]?.count || 0),
        pendingHolds: Number(holdsRes.rows[0]?.count || 0),
        pendingEnquiries: Number(enqRes.rows[0]?.count || 0),
        todayRevenue: Number(revRes.rows[0]?.total || 0),
      }
    }

    const allBookings = Array.from(this.memoryBookings.values())
    const allEnquiries = Array.from(this.memoryEnquiries.values())

    const todayCheckIns = allBookings.filter(
      (b) => b.check_in === todayStr && b.booking_status === 'CONFIRMED'
    ).length

    const pendingHolds = allBookings.filter((b) => b.booking_status === 'PENDING_PAYMENT').length

    const pendingEnquiries = allEnquiries.filter((e) =>
      ['NEW', 'CONTACTED', 'LINK_SENT'].includes(e.status)
    ).length

    const todayRevenue = allBookings
      .filter(
        (b) =>
          b.booking_status === 'CONFIRMED' &&
          new Date(b.created_at).toISOString().split('T')[0] === todayStr
      )
      .reduce((sum, b) => sum + Number(b.total_amount), 0)

    return { todayCheckIns, pendingHolds, pendingEnquiries, todayRevenue }
  }

  public async toggleRoomAvailability(
    roomTypeIdOrSlug: string,
    propertySlug?: string,
    explicitAvailable?: boolean
  ): Promise<RoomTypeRecord | null> {
    if (!this.useInMemory && this.pool) {
      let query = 'SELECT * FROM room_types WHERE id = $1 OR slug = $1'
      const params: any[] = [roomTypeIdOrSlug]
      if (propertySlug) {
        query = `SELECT rt.* FROM room_types rt
                 JOIN properties p ON p.id = rt.property_id
                 WHERE p.slug = $2 AND (rt.id = $1 OR rt.slug = $1)`
        params.push(propertySlug)
      }
      const res = await this.pool.query(query, params)
      if (res.rows.length === 0) return null
      const room = res.rows[0]
      const newStatus = explicitAvailable !== undefined ? explicitAvailable : !room.is_available
      const upd = await this.pool.query('UPDATE room_types SET is_available = $1 WHERE id = $2 RETURNING *', [
        newStatus,
        room.id,
      ])
      return upd.rows[0]
    }

    let targetRoom: RoomTypeRecord | undefined
    if (propertySlug) {
      const prop = Array.from(this.memoryProperties.values()).find((p) => p.slug === propertySlug)
      if (prop) {
        targetRoom = Array.from(this.memoryRoomTypes.values()).find(
          (r) => r.property_id === prop.id && (r.id === roomTypeIdOrSlug || r.slug === roomTypeIdOrSlug)
        )
      }
    } else {
      targetRoom = Array.from(this.memoryRoomTypes.values()).find(
        (r) => r.id === roomTypeIdOrSlug || r.slug === roomTypeIdOrSlug
      )
    }

    if (!targetRoom) return null
    targetRoom.is_available = explicitAvailable !== undefined ? explicitAvailable : !targetRoom.is_available
    this.memoryRoomTypes.set(targetRoom.id, targetRoom)
    return targetRoom
  }

  public async updateWeekendSurcharge(
    propertyIdOrSlug: string | 'all',
    surchargePercent: number
  ): Promise<PropertyRecord[]> {
    if (!this.useInMemory && this.pool) {
      if (propertyIdOrSlug === 'all') {
        await this.pool.query('UPDATE properties SET weekend_surcharge_percent = $1', [surchargePercent])
        const res = await this.pool.query('SELECT * FROM properties ORDER BY name ASC')
        return res.rows
      }
      await this.pool.query(
        'UPDATE properties SET weekend_surcharge_percent = $1 WHERE id = $2 OR slug = $2',
        [surchargePercent, propertyIdOrSlug]
      )
      const res = await this.pool.query('SELECT * FROM properties ORDER BY name ASC')
      return res.rows
    }

    if (propertyIdOrSlug === 'all') {
      this.memoryProperties.forEach((prop) => {
        prop.weekend_surcharge_percent = surchargePercent
        this.memoryProperties.set(prop.id, prop)
      })
    } else {
      const prop = Array.from(this.memoryProperties.values()).find(
        (p) => p.id === propertyIdOrSlug || p.slug === propertyIdOrSlug
      )
      if (prop) {
        prop.weekend_surcharge_percent = surchargePercent
        this.memoryProperties.set(prop.id, prop)
      }
    }
    return Array.from(this.memoryProperties.values())
  }

  public async searchHotelsForChat(query: {
    search?: string
    city?: string
    checkIn?: string
    checkOut?: string
    roomsCount?: number
  }): Promise<
    Array<{
      property: PropertyRecord
      rooms: Array<RoomTypeRecord & { currentPriceInr: number }>
    }>
  > {
    const allProps = await this.getPropertiesWithRooms()
    const result: Array<{
      property: PropertyRecord
      rooms: Array<RoomTypeRecord & { currentPriceInr: number }>
    }> = []

    for (const item of allProps) {
      if (query.city && !item.property.city.toLowerCase().includes(query.city.toLowerCase())) {
        continue
      }
      if (
        query.search &&
        !item.property.name.toLowerCase().includes(query.search.toLowerCase()) &&
        !item.property.slug.toLowerCase().includes(query.search.toLowerCase()) &&
        !item.property.city.toLowerCase().includes(query.search.toLowerCase())
      ) {
        continue
      }

      const matchingRooms = item.rooms
        .filter((r) => r.is_available && (!query.roomsCount || r.available_units >= query.roomsCount))
        .map((r) => ({
          ...r,
          currentPriceInr: Number(item.property.base_price) + Number(r.price_offset),
        }))

      if (matchingRooms.length > 0) {
        result.push({
          property: item.property,
          rooms: matchingRooms,
        })
      }
    }
    return result
  }

  public async createEnquiry(payload: Omit<EnquiryRecord, 'id' | 'status' | 'created_at'>): Promise<EnquiryRecord> {
    const id = `enq_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const record: EnquiryRecord = {
      id,
      enquiry_type: payload.enquiry_type,
      property_id: payload.property_id,
      guest_name: payload.guest_name,
      guest_phone: payload.guest_phone,
      guest_email: payload.guest_email,
      event_date: payload.event_date,
      guest_count: payload.guest_count,
      message: payload.message,
      status: 'NEW',
      created_at: new Date(),
    }

    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO enquiries (id, enquiry_type, property_id, guest_name, guest_phone, guest_email, event_date, guest_count, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          record.id,
          record.enquiry_type,
          record.property_id || null,
          record.guest_name,
          record.guest_phone,
          record.guest_email || null,
          record.event_date || null,
          record.guest_count || null,
          record.message || null,
          record.status,
        ]
      )
      return res.rows[0]
    }

    this.memoryEnquiries.set(id, record)
    return record
  }

  public async getEnquiries(status?: string): Promise<EnquiryRecord[]> {
    if (!this.useInMemory && this.pool) {
      if (status) {
        const res = await this.pool.query('SELECT * FROM enquiries WHERE status = $1 ORDER BY created_at DESC', [status])
        return res.rows
      }
      const res = await this.pool.query('SELECT * FROM enquiries ORDER BY created_at DESC')
      return res.rows
    }
    const all = Array.from(this.memoryEnquiries.values())
    if (status) return all.filter((e) => e.status === status)
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  public async getEnquiryById(id: string): Promise<EnquiryRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM enquiries WHERE id = $1', [id])
      return res.rows[0] || null
    }
    return this.memoryEnquiries.get(id) || null
  }

  public async updateEnquiryStatus(id: string, status: EnquiryRecord['status'], razorpayPaymentLinkId?: string): Promise<EnquiryRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `UPDATE enquiries SET status = $1, razorpay_payment_link_id = COALESCE($2, razorpay_payment_link_id) WHERE id = $3 RETURNING *`,
        [status, razorpayPaymentLinkId || null, id]
      )
      return res.rows[0] || null
    }
    const enq = this.memoryEnquiries.get(id)
    if (!enq) return null
    enq.status = status
    if (razorpayPaymentLinkId) enq.razorpay_payment_link_id = razorpayPaymentLinkId
    this.memoryEnquiries.set(id, enq)
    return enq
  }

  public async createChatLog(payload: Omit<ChatLogRecord, 'id' | 'created_at'>): Promise<ChatLogRecord> {
    const id = `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const record: ChatLogRecord = {
      id,
      session_id: payload.session_id,
      user_message: payload.user_message,
      bot_response: payload.bot_response,
      tools_invoked: payload.tools_invoked || [],
      handoff_triggered: Boolean(payload.handoff_triggered),
      created_at: new Date(),
    }

    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO chat_logs (id, session_id, user_message, bot_response, tools_invoked, handoff_triggered)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          record.id,
          record.session_id,
          record.user_message,
          record.bot_response,
          JSON.stringify(record.tools_invoked),
          record.handoff_triggered,
        ]
      )
      return res.rows[0]
    }

    this.memoryChatLogs.set(id, record)
    return record
  }
}

export const db = new DatabaseEngine()
