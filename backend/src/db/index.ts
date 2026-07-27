import { Pool } from 'pg'
import { randomBytes } from 'crypto'
import { PropertyRecord, RoomTypeRecord, BookingRecord, EnquiryRecord, ChatLogRecord, MealPlan, UserRecord, PropertyImageRecord } from '../types'
import { seedProperties, seedRoomTypes } from '../data/seed'
import { computeStayBreakdown, mealOffsetFor, extraAdultsFor, policyFor } from '../lib/pricing'
import { nightsBetween, todayIso } from '../lib/nights'

/**
 * Crockford base32 minus the characters that get misread over the phone
 * (I, L, O, U). `QD-` + 8 symbols is ~40 bits — enough that codes neither
 * collide nor can be walked. The old scheme was `QD-` + 4 digits: 9,000 codes
 * total, a ~50% collision chance by the 110th booking, and trivially
 * enumerable by anyone wanting other guests' invoices.
 */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function generateBookingCode(): string {
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  return `QD-${out}`
}

/**
 * TLS settings for a Postgres connection.
 *
 * node-postgres connects in plaintext unless told otherwise, and RDS refuses
 * that outright — Postgres 16 and later ship with `rds.force_ssl` on, so the
 * server answers with:
 *
 *   no pg_hba.conf entry for host "...", user "...", database "...",
 *   no encryption
 *
 * which reads like a firewall or credentials problem and is neither. It cost a
 * deploy to find, precisely because `psql` negotiates TLS by default and so
 * connects happily with the identical URL — the manual check passes while the
 * application cannot start.
 *
 * Localhost is exempt: a dev Postgres and the CI container have no certificate.
 *
 * `rejectUnauthorized: false` encrypts the connection without verifying the
 * server certificate. That stops passwords and guest data crossing the network
 * in the clear, which is the immediate need, but it does not defend against an
 * active man-in-the-middle. Verifying properly means shipping Amazon's RDS root
 * CA bundle and pointing `ca` at it — worth doing before this holds real
 * bookings.
 */
function sslFor(connectionString: string): { rejectUnauthorized: boolean } | false {
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString)
  if (isLocal) return false
  // An explicit sslmode=disable in the URL wins, so a deployment that genuinely
  // cannot use TLS still has a way out.
  if (/[?&]sslmode=disable\b/.test(connectionString)) return false
  return { rejectUnauthorized: false }
}

// DatabaseEngine abstraction layer providing seamless support for real PostgreSQL via pg Pool
// or structured in-memory ACID store when DATABASE_URL is not set (for zero-config local dev/tests).

export class DatabaseEngine {
  /** Public so the migration runner and webhook lookups can reach it directly. */
  public pool: Pool | null = null
  public useInMemory: boolean

  // In-Memory state store for testing without active PostgreSQL cloud instance
  public memoryProperties: Map<string, PropertyRecord> = new Map()
  public memoryRoomTypes: Map<string, RoomTypeRecord> = new Map()
  /** Uploaded photography, keyed by image id. */
  public memoryPropertyImages: Map<string, PropertyImageRecord> = new Map()
  public memoryBookings: Map<string, BookingRecord> = new Map()
  public memoryEnquiries: Map<string, EnquiryRecord> = new Map()
  public memoryChatLogs: Map<string, ChatLogRecord> = new Map()
  public memoryUsers: Map<string, UserRecord> = new Map()
  /** Night-level holds: `${roomTypeId}|${YYYY-MM-DD}` → [{ bookingId, units }]. */
  public memoryNightHolds: Map<string, Array<{ bookingId: string; units: number }>> = new Map()
  /** Admin-edited copy overrides, keyed the same way as the site_content table. */
  public memorySiteContent: Map<string, string> = new Map()

  constructor() {
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && dbUrl !== 'in-memory') {
      this.useInMemory = false
      this.pool = new Pool({ connectionString: dbUrl, ssl: sslFor(dbUrl) })
    } else {
      this.useInMemory = true
      this.initializeInMemorySeed()
    }
  }

  public initializeInMemorySeed() {
    this.memoryProperties.clear()
    this.memoryRoomTypes.clear()
    this.memoryPropertyImages.clear()
    this.memoryBookings.clear()
    this.memoryEnquiries.clear()
    this.memoryChatLogs.clear()
    this.memoryNightHolds.clear()
    this.memoryUsers.clear()
    this.memorySiteContent.clear()

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
      const allRooms = await this.pool.query(DatabaseEngine.ROOM_SELECT)
      return props.map((p) => ({
        property: p,
        rooms: allRooms.rows.filter((r) => r.property_id === p.id),
      }))
    }
    const allRooms = Array.from(this.memoryRoomTypes.values()).map((r) => this.withTonightAvailability(r))
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
      const roomsRes = await this.pool.query(`${DatabaseEngine.ROOM_SELECT} WHERE rt.property_id = $1`, [prop.id])
      return { property: prop, roomTypes: roomsRes.rows }
    }
    const prop = Array.from(this.memoryProperties.values()).find((p) => p.slug === slug && p.is_active) || null
    if (!prop) return { property: null, roomTypes: [] }
    const rooms = Array.from(this.memoryRoomTypes.values())
      .filter((r) => r.property_id === prop.id)
      .map((r) => this.withTonightAvailability(r))
    return { property: prop, roomTypes: rooms }
  }

  /* ------------------------------------------------------------------
   * Property photography
   *
   * These rows override the build-time image glob in the frontend, which is
   * what makes a photo changeable without a redeploy. Ordered by sort_order so
   * the hotel controls which shot leads.
   * ------------------------------------------------------------------ */

  public async getPropertyImages(propertyId: string): Promise<PropertyImageRecord[]> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM property_images WHERE property_id = $1 ORDER BY sort_order ASC, created_at ASC',
        [propertyId]
      )
      return res.rows
    }
    return Array.from(this.memoryPropertyImages.values())
      .filter((i) => i.property_id === propertyId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  public async addPropertyImage(
    img: Omit<PropertyImageRecord, 'id' | 'sort_order' | 'created_at'> & { sort_order?: number }
  ): Promise<PropertyImageRecord> {
    // Append by default: a new upload goes to the end rather than silently
    // displacing whichever photo the hotel chose as its hero.
    const existing = await this.getPropertyImages(img.property_id)
    const order = img.sort_order ?? existing.length

    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO property_images (property_id, url, thumb_url, storage_key, alt_text, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [img.property_id, img.url, img.thumb_url, img.storage_key, img.alt_text, order]
      )
      return res.rows[0]
    }
    const row: PropertyImageRecord = { ...img, id: randomBytes(8).toString('hex'), sort_order: order }
    this.memoryPropertyImages.set(row.id, row)
    return row
  }

  public async getPropertyImageById(id: string): Promise<PropertyImageRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM property_images WHERE id = $1', [id])
      return res.rows[0] ?? null
    }
    return this.memoryPropertyImages.get(id) ?? null
  }

  public async deletePropertyImage(id: string): Promise<boolean> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('DELETE FROM property_images WHERE id = $1', [id])
      return (res.rowCount ?? 0) > 0
    }
    return this.memoryPropertyImages.delete(id)
  }

  /** Reorders in one pass; ids not in the list keep their current position. */
  public async reorderPropertyImages(propertyId: string, orderedIds: string[]): Promise<void> {
    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        for (let i = 0; i < orderedIds.length; i++) {
          await client.query(
            'UPDATE property_images SET sort_order = $1 WHERE id = $2 AND property_id = $3',
            [i, orderedIds[i], propertyId]
          )
        }
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
      return
    }
    orderedIds.forEach((id, i) => {
      const row = this.memoryPropertyImages.get(id)
      if (row && row.property_id === propertyId) this.memoryPropertyImages.set(id, { ...row, sort_order: i })
    })
  }

  /** Lookup is case-insensitive: nobody expects Bob@x.com to be a second account. */
  public async getUserByEmail(email: string): Promise<UserRecord | null> {
    const key = email.trim().toLowerCase()
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [key])
      return res.rows[0] || null
    }
    return Array.from(this.memoryUsers.values()).find((u) => u.email.toLowerCase() === key) || null
  }

  public async getUserById(id: string): Promise<UserRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id])
      return res.rows[0] || null
    }
    return this.memoryUsers.get(id) || null
  }

  public async createUser(payload: {
    fullName: string
    email: string
    phone?: string
    passwordHash: string
  }): Promise<UserRecord> {
    const email = payload.email.trim().toLowerCase()
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO users (full_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [payload.fullName, email, payload.phone || null, payload.passwordHash]
      )
      return res.rows[0]
    }
    const user: UserRecord = {
      id: `user-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: payload.fullName,
      email,
      phone: payload.phone,
      password_hash: payload.passwordHash,
      created_at: new Date(),
    }
    this.memoryUsers.set(user.id, user)
    return user
  }

  /**
   * A guest's own bookings. Matched by account id *or* email, so stays booked
   * as a guest before signing up still appear once they register with the same
   * address.
   */
  public async getBookingsForUser(userId: string, email: string): Promise<BookingRecord[]> {
    const key = email.trim().toLowerCase()
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM bookings
          WHERE user_id = $1 OR LOWER(guest_email) = $2
          ORDER BY created_at DESC`,
        [userId, key]
      )
      return res.rows
    }
    return Array.from(this.memoryBookings.values())
      .filter((b) => b.user_id === userId || (b.guest_email || '').toLowerCase() === key)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  /**
   * Units still sellable across every night of the stay — the tightest night
   * wins, since one full night blocks the whole range.
   */
  public async getAvailableUnits(roomTypeId: string, checkIn: string, checkOut: string): Promise<number> {
    const room = await this.getRoomTypeById(roomTypeId)
    if (!room) return 0

    const nights = nightsBetween(checkIn, checkOut)
    if (!nights.length) return room.total_units

    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        `SELECT stay_date, SUM(units)::int AS held
           FROM room_night_holds
          WHERE room_type_id = $1 AND stay_date = ANY($2::date[])
          GROUP BY stay_date`,
        [roomTypeId, nights]
      )
      const peak = res.rows.reduce((m: number, r: any) => Math.max(m, Number(r.held)), 0)
      return Math.max(0, room.total_units - peak)
    }

    const peak = nights.reduce((m, d) => {
      const held = (this.memoryNightHolds.get(`${roomTypeId}|${d}`) || []).reduce((s, h) => s + h.units, 0)
      return Math.max(m, held)
    }, 0)
    return Math.max(0, room.total_units - peak)
  }

  /**
   * `available_units` is no longer a stored counter — it is derived per night.
   * Read paths report tonight's figure, which is what "available now" means on
   * the dashboard and in the chatbot. Date-specific answers use
   * getAvailableUnits().
   */
  private withTonightAvailability(room: RoomTypeRecord): RoomTypeRecord {
    const held = (this.memoryNightHolds.get(`${room.id}|${todayIso()}`) || []).reduce((s, h) => s + h.units, 0)
    return { ...room, available_units: Math.max(0, room.total_units - held) }
  }

  /** SQL mirror of withTonightAvailability, for the Postgres read paths. */
  private static readonly ROOM_SELECT = `
    SELECT rt.*, GREATEST(0, rt.total_units - COALESCE((
      SELECT SUM(h.units)::int FROM room_night_holds h
       WHERE h.room_type_id = rt.id AND h.stay_date = CURRENT_DATE
    ), 0)) AS available_units
    FROM room_types rt`

  private releaseNightHoldsInMemory(bookingId: string): void {
    for (const [key, holds] of this.memoryNightHolds.entries()) {
      const kept = holds.filter((h) => h.bookingId !== bookingId)
      if (kept.length) this.memoryNightHolds.set(key, kept)
      else this.memoryNightHolds.delete(key)
    }
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
    mealPlan?: MealPlan
    userId?: string
    /** Defaults to the whole party being adults when the caller omits the split. */
    adultsCount?: number
    childAges?: number[]
  }): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
    if (new Date(payload.checkOut).getTime() <= new Date(payload.checkIn).getTime()) {
      return { success: false, error: 'Check-out date must be strictly after check-in date' }
    }

    // Occupancy is derived here, never trusted from the client — the extra-adult
    // charge is money, so the count that prices the stay must be the one the
    // server computed. Callers that predate the split (the AI concierge) send
    // only guestsCount; treat that whole party as adults.
    //
    // The rate and the free-child age come from the property row, which the
    // admin panel writes — so the charge always reflects what the hotel has set,
    // and the resolved policy is read once per booking below.
    const childAges = Array.isArray(payload.childAges) ? payload.childAges.map(Number).filter((n) => !Number.isNaN(n)) : []
    const childrenCount = childAges.length
    const adultsCount = Math.max(1, Number(payload.adultsCount) || payload.guestsCount - childrenCount || 1)

    if (!this.useInMemory && this.pool) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        // Lock room type row for update
        const roomRes = await client.query(
          `SELECT rt.*, p.id as prop_id, p.base_price, p.weekend_surcharge_percent,
                  p.extra_adult_percent, p.child_free_under_age FROM room_types rt
           JOIN properties p ON p.id = rt.property_id
           WHERE p.slug = $1 AND rt.slug = $2 FOR UPDATE`,
          [payload.propertySlug, payload.roomTypeSlug]
        )
        if (roomRes.rows.length === 0) {
          await client.query('ROLLBACK')
          return { success: false, error: 'Property or room category not found' }
        }
        const room = roomRes.rows[0]
        if (!room.is_available) {
          await client.query('ROLLBACK')
          return { success: false, error: 'This room category is currently unavailable' }
        }

        // Availability is per night: find the busiest night in the requested range.
        const nights = nightsBetween(payload.checkIn, payload.checkOut)
        const heldRes = await client.query(
          `SELECT COALESCE(MAX(held), 0)::int AS peak FROM (
             SELECT SUM(units)::int AS held FROM room_night_holds
              WHERE room_type_id = $1 AND stay_date = ANY($2::date[])
              GROUP BY stay_date
           ) t`,
          [room.id, nights]
        )
        const free = room.total_units - Number(heldRes.rows[0]?.peak || 0)
        if (free < payload.roomsCount) {
          await client.query('ROLLBACK')
          return { success: false, error: `Only ${Math.max(0, free)} units available for these dates` }
        }

        const policy = policyFor(room)
        const extraAdults = extraAdultsFor({
          adults: adultsCount,
          childAges,
          roomsCount: payload.roomsCount,
          childFreeUnderAge: policy.childFreeUnderAge,
        })

        const breakdown = computeStayBreakdown({
          basePrice: Number(room.base_price),
          roomOffset: Number(room.price_offset),
          mealOffset: mealOffsetFor(payload.mealPlan, room),
          weekendSurchargePercent: Number(room.weekend_surcharge_percent) || 0,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          roomsCount: payload.roomsCount,
          extraAdults,
          extraAdultPercent: policy.extraAdultPercent,
        })
        const totalAmount = breakdown.total

        // Retry on the unique-violation the code column raises, rather than
        // assuming the generated code is free. A savepoint is required because
        // a failed statement otherwise aborts the surrounding transaction.
        let created: any = null
        for (let attempt = 0; attempt < 5 && !created; attempt++) {
          await client.query('SAVEPOINT booking_code_attempt')
          try {
            const insertRes = await client.query(
              `INSERT INTO bookings (
                booking_code, user_id, property_id, room_type_id, guest_name, guest_phone, guest_email, company_name, gstin,
                check_in, check_out, rooms_count, guests_count, adults_count, children_count, child_ages, extra_adults,
                extra_adult_percent, extra_adult_charge, total_amount, booking_status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'PENDING_PAYMENT', NOW()) RETURNING *`,
              [
                generateBookingCode(),
                payload.userId || null,
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
                adultsCount,
                childrenCount,
                JSON.stringify(childAges),
                extraAdults,
                breakdown.extraAdultPercent,
                breakdown.extraAdultChargePerNight,
                totalAmount,
              ]
            )
            created = insertRes.rows[0]
            await client.query('RELEASE SAVEPOINT booking_code_attempt')
          } catch (insertErr: any) {
            await client.query('ROLLBACK TO SAVEPOINT booking_code_attempt')
            if (insertErr?.code !== '23505') throw insertErr
          }
        }
        if (!created) {
          await client.query('ROLLBACK')
          return { success: false, error: 'Could not allocate a booking code, please retry' }
        }
        // Claim each night of the stay for this booking.
        await client.query(
          `INSERT INTO room_night_holds (room_type_id, booking_id, stay_date, units)
           SELECT $1, $2, d::date, $3 FROM unnest($4::date[]) AS d`,
          [room.id, created.id, payload.roomsCount, nights]
        )

        await client.query('COMMIT')
        return { success: true, booking: created }
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
    if (!room.is_available) {
      return { success: false, error: 'This room category is currently unavailable' }
    }

    // Availability is per night: the busiest night in the range caps the stay.
    const nights = nightsBetween(payload.checkIn, payload.checkOut)
    const peakHeld = nights.reduce((m, d) => {
      const held = (this.memoryNightHolds.get(`${room.id}|${d}`) || []).reduce((s, h) => s + h.units, 0)
      return Math.max(m, held)
    }, 0)
    const free = room.total_units - peakHeld
    if (free < payload.roomsCount) {
      return { success: false, error: `Only ${Math.max(0, free)} units available for these dates` }
    }

    let bookingCode = generateBookingCode()
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = Array.from(this.memoryBookings.values()).some((b) => b.booking_code === bookingCode)
      if (!taken) break
      bookingCode = generateBookingCode()
    }
    const policy = policyFor(prop)
    const extraAdults = extraAdultsFor({
      adults: adultsCount,
      childAges,
      roomsCount: payload.roomsCount,
      childFreeUnderAge: policy.childFreeUnderAge,
    })

    const breakdown = computeStayBreakdown({
      basePrice: prop.base_price,
      roomOffset: room.price_offset,
      mealOffset: mealOffsetFor(payload.mealPlan, room),
      weekendSurchargePercent: prop.weekend_surcharge_percent,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      roomsCount: payload.roomsCount,
      extraAdults,
      extraAdultPercent: policy.extraAdultPercent,
    })
    const totalAmount = breakdown.total

    const bookingRecord: BookingRecord = {
      id: `booking-${Date.now()}-${randomBytes(4).toString('hex')}`,
      booking_code: bookingCode,
      user_id: payload.userId ?? null,
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
      adults_count: adultsCount,
      children_count: childrenCount,
      child_ages: childAges,
      extra_adults: extraAdults,
      extra_adult_percent: breakdown.extraAdultPercent,
      extra_adult_charge: breakdown.extraAdultChargePerNight,
      total_amount: totalAmount,
      payment_mode: 'INSTANT_FULL_PAYMENT',
      payment_status: 'PENDING',
      booking_status: 'PENDING_PAYMENT',
      created_at: new Date(),
    }
    this.memoryBookings.set(bookingRecord.id, bookingRecord)

    // Claim each night of the stay for this booking.
    for (const d of nights) {
      const key = `${room.id}|${d}`
      const holds = this.memoryNightHolds.get(key) || []
      holds.push({ bookingId: bookingRecord.id, units: payload.roomsCount })
      this.memoryNightHolds.set(key, holds)
    }

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

  /**
   * Accepts either identifier, matching how the admin routes address a
   * property elsewhere — the panel holds slugs, scripts tend to hold ids.
   */
  public async getPropertyByIdOrSlug(idOrSlug: string): Promise<PropertyRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM properties WHERE id = $1 OR slug = $1', [idOrSlug]
      )
      return res.rows[0] || null
    }
    return Array.from(this.memoryProperties.values())
      .find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null
  }

  public async getRoomTypeById(id: string): Promise<RoomTypeRecord | null> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query(`${DatabaseEngine.ROOM_SELECT} WHERE rt.id = $1`, [id])
      return res.rows[0] || null
    }
    const room = this.memoryRoomTypes.get(id)
    return room ? this.withTonightAvailability(room) : null
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
          // Dropping the night rows returns exactly the nights this booking held.
          await client.query(`DELETE FROM room_night_holds WHERE booking_id = $1`, [existing.id])
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
      this.releaseNightHoldsInMemory(existing.id)
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
          await client.query(`DELETE FROM room_night_holds WHERE booking_id = $1`, [booking.id])
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
        this.releaseNightHoldsInMemory(booking.id)
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

  /* ------------------------------------------------------------------
   * Admin editing
   *
   * Everything a hotel manager should be able to change without a developer:
   * the property record, its room categories and their rates. Each method
   * whitelists the columns it will write — a caller cannot rename a primary
   * key or flip a foreign key by posting extra fields.
   * ------------------------------------------------------------------ */

  /** Columns an admin may change on a property. */
  private static readonly PROPERTY_EDITABLE = [
    'name',
    'city',
    'address',
    'map_link',
    'phone',
    'whatsapp',
    'email',
    'base_price',
    'rating',
    'is_active',
    'weekend_surcharge_percent',
    'extra_adult_percent',
    'child_free_under_age',
    'lat',
    'lng',
    'place_id',
    'tier',
    'tier_label',
  ] as const

  /** Columns an admin may change on a room category. */
  private static readonly ROOM_EDITABLE = [
    'name',
    'description',
    'size_sqft',
    'bed_type',
    'max_guests',
    'price_offset',
    'breakfast_offset',
    'all_meals_offset',
    'total_units',
    'is_available',
  ] as const

  private static pickEditable<T extends string>(
    patch: Record<string, unknown>,
    allowed: readonly T[]
  ): Array<[T, unknown]> {
    return allowed
      .filter((col) => patch[col] !== undefined)
      .map((col) => [col, patch[col]] as [T, unknown])
  }

  public async updateProperty(
    idOrSlug: string,
    patch: Record<string, unknown>
  ): Promise<PropertyRecord | null> {
    const fields = DatabaseEngine.pickEditable(patch, DatabaseEngine.PROPERTY_EDITABLE)
    if (fields.length === 0) return this.getPropertyById(idOrSlug)

    if (!this.useInMemory && this.pool) {
      const sets = fields.map(([col], i) => `${col} = $${i + 2}`).join(', ')
      const res = await this.pool.query(
        `UPDATE properties SET ${sets} WHERE id = $1 OR slug = $1 RETURNING *`,
        [idOrSlug, ...fields.map(([, v]) => v)]
      )
      return res.rows[0] || null
    }

    const prop = Array.from(this.memoryProperties.values()).find(
      (p) => p.id === idOrSlug || p.slug === idOrSlug
    )
    if (!prop) return null
    fields.forEach(([col, v]) => { (prop as any)[col] = v })
    this.memoryProperties.set(prop.id, prop)
    return prop
  }

  /**
   * Edits one room category.
   *
   * Matches on id only. Room slugs are shared across properties — every hotel
   * has a `deluxe-room` — so accepting a slug here would let an admin editing
   * one property's rate silently change a different property's instead.
   */
  public async updateRoomType(
    id: string,
    patch: Record<string, unknown>
  ): Promise<RoomTypeRecord | null> {
    const fields = DatabaseEngine.pickEditable(patch, DatabaseEngine.ROOM_EDITABLE)
    if (fields.length === 0) return this.getRoomTypeById(id)

    if (!this.useInMemory && this.pool) {
      const sets = fields.map(([col], i) => `${col} = $${i + 2}`).join(', ')
      const res = await this.pool.query(
        `UPDATE room_types SET ${sets} WHERE id = $1 RETURNING *`,
        [id, ...fields.map(([, v]) => v)]
      )
      return res.rows[0] || null
    }

    const room = this.memoryRoomTypes.get(id)
    if (!room) return null
    fields.forEach(([col, v]) => { (room as any)[col] = v })
    // total_units is the ceiling for availability; never leave a room claiming
    // more free units than it physically has.
    if (room.available_units > room.total_units) room.available_units = room.total_units
    this.memoryRoomTypes.set(room.id, room)
    return room
  }

  /* ---------- Editable site copy ---------- */

  public async getSiteContent(): Promise<Record<string, string>> {
    if (!this.useInMemory && this.pool) {
      const res = await this.pool.query('SELECT key, value FROM site_content')
      return Object.fromEntries(res.rows.map((r: any) => [r.key, r.value]))
    }
    return Object.fromEntries(this.memorySiteContent)
  }

  public async setSiteContent(entries: Record<string, string>): Promise<Record<string, string>> {
    const pairs = Object.entries(entries).filter(([k]) => k.trim().length > 0)

    if (!this.useInMemory && this.pool) {
      for (const [key, value] of pairs) {
        await this.pool.query(
          `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, value]
        )
      }
      return this.getSiteContent()
    }

    // An empty string means "fall back to what the component shipped with",
    // so clearing a field in the admin UI restores the default rather than
    // blanking the section.
    pairs.forEach(([key, value]) => {
      if (value === '') this.memorySiteContent.delete(key)
      else this.memorySiteContent.set(key, value)
    })
    return this.getSiteContent()
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
