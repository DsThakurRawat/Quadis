import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()

describe('Phase 1: Core API & Reservation Soft Hold Tests', () => {
  beforeEach(() => {
    // Reset in-memory database to initial state before each test
    db.initializeInMemorySeed()
  })

  test('GET /api/properties returns exact 10 seeded active properties', async () => {
    const res = await request(app).get('/api/properties')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.count).toBe(10)
    expect(res.body.data[0].slug).toBe('hotel-cladis-sector-51-noida')
  })

  test('GET /api/properties/:slug returns property and room types', async () => {
    const res = await request(app).get('/api/properties/hotel-cladis-sector-51-noida')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('Hotel Cladis Sector 51')
    expect(Array.isArray(res.body.data.rooms)).toBe(true)
    expect(res.body.data.rooms.length).toBe(3) // Deluxe, Superior, Royal
  })

  test('POST /api/bookings/initiate creates a 15-minute soft hold and decrements available units', async () => {
    const payload = {
      propertySlug: 'hotel-cladis-sector-51-noida',
      roomTypeSlug: 'deluxe-room',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      roomsCount: 2,
      guestsCount: 4,
      guestName: 'Rajesh Kumar',
      guestPhone: '9876543210',
      guestEmail: 'rajesh@example.com',
    }

    const res = await request(app).post('/api/bookings/initiate').send(payload)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.booking_code).toMatch(/^QD-\d{4}$/)
    expect(res.body.data.booking_status).toBe('PENDING_PAYMENT')
    expect(res.body.data.rooms_count).toBe(2)

    // Verify inventory was decremented from 5 to 3
    const propRes = await request(app).get('/api/properties/hotel-cladis-sector-51-noida')
    const deluxeRoom = propRes.body.data.rooms.find((r: any) => r.slug === 'deluxe-room')
    expect(deluxeRoom.available_units).toBe(3)
  })

  test('POST /api/bookings/initiate prevents double booking when room units are sold out', async () => {
    const payload = {
      propertySlug: 'hotel-cladis-sector-51-noida',
      roomTypeSlug: 'royal-suite',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      roomsCount: 3, // Total units for Royal Suite is 2, so asking for 3 should fail
      guestsCount: 4,
      guestName: 'Ananya Sharma',
      guestPhone: '9123456780',
    }

    const res = await request(app).post('/api/bookings/initiate').send(payload)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toContain('Only 2 units available')
  })

  test('GET /api/bookings/:code retrieves booking correctly', async () => {
    const payload = {
      propertySlug: 'hotel-cladis-sector-51-noida',
      roomTypeSlug: 'superior-room',
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      roomsCount: 1,
      guestsCount: 2,
      guestName: 'Vikram Singh',
      guestPhone: '9988776655',
    }

    const initRes = await request(app).post('/api/bookings/initiate').send(payload)
    const code = initRes.body.data.booking_code

    const lookupRes = await request(app).get(`/api/bookings/${code}?phone=9988776655`)
    expect(lookupRes.status).toBe(200)
    expect(lookupRes.body.success).toBe(true)
    expect(lookupRes.body.data.guest_name).toBe('Vikram Singh')
  })
})
