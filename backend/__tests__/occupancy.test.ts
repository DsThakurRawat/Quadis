import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'
import {
  DEFAULT_EXTRA_ADULT_PERCENT,
  DEFAULT_CHILD_FREE_UNDER_AGE,
  extraAdultsFor,
  chargeableChildren,
  computeStayBreakdown,
  policyFor,
} from '../src/lib/pricing'

// The client's rule: a third ADULT adds a percentage of the room rate; a CHILD
// adds nothing. The suite reads the default rather than hardcoding 40, so
// changing the default cannot silently pass.
const PCT = DEFAULT_EXTRA_ADULT_PERCENT
const ROOM_RATE = 1599
/**
 * What one extra adult costs per night at the seeded rate, in whole rupees.
 * The engine rounds per night (40% of 1599 = 639.60 -> 640), so the expectation
 * has to round the same way.
 */
const UPLIFT_PER_NIGHT = Math.round(ROOM_RATE * (PCT / 100))

const app = createApp()

// Fixed future dates so the "check-in cannot be in the past" rule never makes
// this suite fail with the calendar. Mon 2027-03-01 → Wed 2027-03-03 is two
// weekday nights, so no weekend surcharge is in play.
const CHECK_IN = '2027-03-01'
const CHECK_OUT = '2027-03-03'
const NIGHTS = 2

beforeEach(() => {
  db.initializeInMemorySeed()
})

describe('Occupancy — extra adult and child rules', () => {
  it('counts children against whatever threshold it is given', () => {
    // Explicit threshold of 12: only 12-and-over are chargeable.
    expect(chargeableChildren([4, 8, 11], 12)).toBe(0)
    expect(chargeableChildren([12], 12)).toBe(1)
    expect(chargeableChildren([6, 13, 17], 12)).toBe(2)
    expect(chargeableChildren(undefined, 12)).toBe(0)
  })

  it('never charges for a child by default — the client\'s "if it\'s child then no"', () => {
    // The default threshold is 18, so no child of any age is chargeable.
    expect(chargeableChildren([4, 11, 12, 15, 17])).toBe(0)
  })

  it('honours a property-specific free-child age', () => {
    // A hotel that lowers the threshold to 6 charges for an 8-year-old.
    expect(chargeableChildren([8], 6)).toBe(1)
    // One that leaves it at 16 does not.
    expect(chargeableChildren([8], 16)).toBe(0)
  })

  it('falls back to the group defaults when a property has no policy set', () => {
    expect(policyFor(null)).toEqual({
      extraAdultPercent: DEFAULT_EXTRA_ADULT_PERCENT,
      childFreeUnderAge: DEFAULT_CHILD_FREE_UNDER_AGE,
    })
    // Postgres returns NUMERIC as a string; it must still be read as a number.
    expect(policyFor({ extra_adult_percent: '55', child_free_under_age: '10' })).toEqual({
      extraAdultPercent: 55,
      childFreeUnderAge: 10,
    })
  })

  it('charges nothing for two adults in one room', () => {
    expect(extraAdultsFor({ adults: 2, roomsCount: 1 })).toBe(0)
  })

  it('charges the third adult in a single room', () => {
    expect(extraAdultsFor({ adults: 3, roomsCount: 1 })).toBe(1)
  })

  it('lets a young child share without charge', () => {
    expect(extraAdultsFor({ adults: 2, childAges: [5], roomsCount: 1 })).toBe(0)
  })

  it('does not charge a 12-year-old under the default policy', () => {
    // Was chargeable under the earlier "under 12 free" rule. The client's rule
    // supersedes it: a child never triggers the uplift.
    expect(extraAdultsFor({ adults: 2, childAges: [12], roomsCount: 1 })).toBe(0)
    // A hotel that opts into charging 12+ still can.
    expect(extraAdultsFor({ adults: 2, childAges: [12], roomsCount: 1, childFreeUnderAge: 12 })).toBe(1)
  })

  it('spreads the included occupancy across every room booked', () => {
    // Three adults in two rooms are inside the four included places.
    expect(extraAdultsFor({ adults: 3, roomsCount: 2 })).toBe(0)
    expect(extraAdultsFor({ adults: 5, roomsCount: 2 })).toBe(1)
  })
})

describe('Occupancy — effect on the stay total', () => {
  const base = {
    basePrice: 1599,
    roomOffset: 0,
    mealOffset: 0,
    weekendSurchargePercent: 0,
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
    roomsCount: 1,
  }

  it('leaves a double-occupancy stay untouched', () => {
    const b = computeStayBreakdown({ ...base, extraAdults: 0 })
    expect(b.nights).toBe(NIGHTS)
    expect(b.extraAdultTotal).toBe(0)
    expect(b.total).toBe(ROOM_RATE * NIGHTS)
  })

  it('adds the percentage uplift for every night, once per extra adult', () => {
    const b = computeStayBreakdown({ ...base, extraAdults: 1 })
    expect(b.extraAdultTotal).toBe(UPLIFT_PER_NIGHT * NIGHTS)
    expect(b.total).toBe(ROOM_RATE * NIGHTS + UPLIFT_PER_NIGHT * NIGHTS)
  })

  it('prices a triple at exactly the room rate plus the percentage', () => {
    // "Double occupancy room ka 40% increase hoga triple mein" — one night, so
    // the total should be the double rate x 1.40 exactly.
    const b = computeStayBreakdown({ ...base, checkOut: '2027-03-02', extraAdults: 1 })
    expect(b.nights).toBe(1)
    expect(b.total).toBe(ROOM_RATE + UPLIFT_PER_NIGHT)
    // Whole rupees, not 2238.6 — a guest should never see a fractional price.
    expect(Number.isInteger(b.total)).toBe(true)
  })

  it('scales the uplift with the weekend surcharge, since it is a percentage', () => {
    // Fri 2027-03-05 → Sat 2027-03-06 is one weekend night at +20%.
    const b = computeStayBreakdown({
      ...base,
      weekendSurchargePercent: 20,
      checkIn: '2027-03-05',
      checkOut: '2027-03-06',
      extraAdults: 1,
    })
    const surchargedRate = ROOM_RATE * 1.2
    expect(b.roomTotal).toBe(Math.round(surchargedRate * 100) / 100)
    // The uplift is 40% of THAT night's rate, not of the weekday rate.
    expect(b.extraAdultTotal).toBe(Math.round(surchargedRate * (PCT / 100)))
    expect(b.extraAdultTotal).toBeGreaterThan(UPLIFT_PER_NIGHT)
  })

  it('charges one extra adult once, not once per room', () => {
    const oneRoom = computeStayBreakdown({ ...base, roomsCount: 1, extraAdults: 1 })
    const twoRooms = computeStayBreakdown({ ...base, roomsCount: 2, extraAdults: 1 })
    expect(twoRooms.extraAdultTotal).toBe(oneRoom.extraAdultTotal)
    expect(twoRooms.roomTotal).toBe(oneRoom.roomTotal * 2)
  })
})

describe('POST /api/bookings/initiate — occupancy', () => {
  const payload = {
    propertySlug: 'hotel-quadis-sector-51-noida',
    roomTypeSlug: 'deluxe-room',
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
    roomsCount: 1,
    guestName: 'Occupancy Test',
    guestPhone: '9876543210',
  }

  it('stores the adult/child split and charges the third adult', async () => {
    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 3, childAges: [] })

    expect(res.status).toBe(201)
    expect(res.body.data.adults_count).toBe(3)
    expect(res.body.data.children_count).toBe(0)
    expect(res.body.data.extra_adults).toBe(1)

    const twoAdults = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 2, adultsCount: 2, childAges: [] })

    // Subtracting two already-rounded totals reintroduces binary float error
    // (1279.1999999999998), so compare to the paisa rather than exactly.
    const delta = Number(res.body.data.total_amount) - Number(twoAdults.body.data.total_amount)
    expect(delta).toBeCloseTo(UPLIFT_PER_NIGHT * NIGHTS, 2)
  })

  it('does not charge for a child under 12', async () => {
    const withChild = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 2, childAges: [7] })

    expect(withChild.status).toBe(201)
    expect(withChild.body.data.children_count).toBe(1)
    expect(withChild.body.data.extra_adults).toBe(0)

    const twoAdults = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 2, adultsCount: 2, childAges: [] })

    expect(Number(withChild.body.data.total_amount)).toBe(Number(twoAdults.body.data.total_amount))
  })

  it('does not charge for a child of any age', async () => {
    // 2 adults + 1 child costs the same as 2 adults, per the client's rule.
    const withTeen = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 2, childAges: [16] })

    const twoAdults = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 2, adultsCount: 2, childAges: [] })

    expect(withTeen.status).toBe(201)
    expect(withTeen.body.data.extra_adults).toBe(0)
    expect(Number(withTeen.body.data.total_amount)).toBe(Number(twoAdults.body.data.total_amount))
  })

  it('rejects a split that contradicts the headcount', async () => {
    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 4, adultsCount: 2, childAges: [7] })

    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body.details)).toContain('equal the total number of guests')
  })

  it('treats a legacy payload with no split as all adults', async () => {
    // The AI concierge still posts guestsCount alone; it must keep working and
    // must not silently skip the extra-bed charge.
    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3 })

    expect(res.status).toBe(201)
    expect(res.body.data.adults_count).toBe(3)
    expect(res.body.data.extra_adults).toBe(1)
  })

  it('charges the percentage the admin set, not the built-in default', async () => {
    await request(app)
      .patch('/api/admin/properties/hotel-quadis-sector-51-noida')
      .send({ extra_adult_percent: 60 })

    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 3, childAges: [] })

    expect(res.status).toBe(201)
    expect(Number(res.body.data.extra_adult_percent)).toBe(60)
    expect(Number(res.body.data.total_amount)).toBe(
      ROOM_RATE * NIGHTS + Math.round(ROOM_RATE * 0.6) * NIGHTS
    )
  })

  it('honours an admin-set free-child age', async () => {
    // Drop the threshold to 5, so a 7-year-old now counts as an adult.
    await request(app)
      .patch('/api/admin/properties/hotel-quadis-sector-51-noida')
      .send({ child_free_under_age: 5 })

    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 2, childAges: [7] })

    expect(res.status).toBe(201)
    expect(res.body.data.extra_adults).toBe(1)
  })

  it('freezes the uplift onto the booking so a later reprice cannot rewrite it', async () => {
    const booked = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 3, childAges: [] })

    const chargedAtBooking = Number(booked.body.data.total_amount)
    expect(Number(booked.body.data.extra_adult_percent)).toBe(PCT)
    expect(Number(booked.body.data.extra_adult_charge)).toBe(UPLIFT_PER_NIGHT)

    // The hotel doubles its uplift afterwards.
    await request(app)
      .patch('/api/admin/properties/hotel-quadis-sector-51-noida')
      .send({ extra_adult_percent: PCT * 2 })

    const reread = await request(app).get(`/api/bookings/${booked.body.data.booking_code}`)
    expect(Number(reread.body.data.total_amount)).toBe(chargedAtBooking)
    expect(Number(reread.body.data.extra_adult_percent)).toBe(PCT)
  })

  it('rejects an implausible uplift percentage', async () => {
    const res = await request(app)
      .patch('/api/admin/properties/hotel-quadis-sector-51-noida')
      .send({ extra_adult_percent: 900 })

    expect(res.status).toBe(400)
  })

  it('ignores a client-supplied extra_adults and derives it server-side', async () => {
    const res = await request(app)
      .post('/api/bookings/initiate')
      .send({ ...payload, guestsCount: 3, adultsCount: 3, childAges: [], extra_adults: 0, total_amount: 1 })

    expect(res.status).toBe(201)
    expect(res.body.data.extra_adults).toBe(1)
    expect(Number(res.body.data.total_amount)).toBe(ROOM_RATE * NIGHTS + UPLIFT_PER_NIGHT * NIGHTS)
  })
})
