import { Pool } from 'pg'
import { PropertyRecord, RoomTypeRecord, BookingRecord } from '../types'
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
  }): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
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
            booking_code, property_id, room_type_id, guest_name, guest_phone, guest_email,
            check_in, check_out, rooms_count, guests_count, total_amount, booking_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING_PAYMENT', NOW()) RETURNING *`,
          [
            bookingCode,
            room.prop_id,
            room.id,
            payload.guestName,
            payload.guestPhone,
            payload.guestEmail || null,
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

  public async cleanupExpiredHolds(expireThresholdMinutes: number = 15): Promise<number> {
    const thresholdDate = new Date(Date.now() - expireThresholdMinutes * 60 * 1000)
    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        const expiredRes = await client.query(
          `SELECT * FROM bookings WHERE booking_status = 'PENDING_PAYMENT' AND created_at < $1 FOR UPDATE`,
          [thresholdDate]
        )
        let count = 0
        for (const booking of expiredRes.rows) {
          await client.query(`UPDATE bookings SET booking_status = 'EXPIRED' WHERE id = $1`, [booking.id])
          await client.query(
            `UPDATE room_types SET available_units = available_units + $1 WHERE id = $2`,
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
          room.available_units += booking.rooms_count
          this.memoryRoomTypes.set(room.id, room)
        }
        this.memoryBookings.set(booking.id, booking)
        count++
      }
    })
    return count
  }
}

export const db = new DatabaseEngine()
