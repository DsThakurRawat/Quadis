import { db } from '../src/db'

describe('Phase 1: 15-Minute Soft Hold Cleanup Cron Verification', () => {
  beforeEach(() => {
    db.initializeInMemorySeed()
  })

  test('cleanupExpiredHolds(15) expires old unpaid holds and restores available units back to inventory', async () => {
    // Initiate two holds for Deluxe Rooms (which starts with 5 available units)
    const hold1 = await db.initiateBookingHold({
      propertySlug: 'hotel-cladis-sector-51-noida',
      roomTypeSlug: 'deluxe-room',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      roomsCount: 2,
      guestsCount: 4,
      guestName: 'User One',
      guestPhone: '9000000001',
    })

    const hold2 = await db.initiateBookingHold({
      propertySlug: 'hotel-cladis-sector-51-noida',
      roomTypeSlug: 'deluxe-room',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      roomsCount: 1,
      guestsCount: 2,
      guestName: 'User Two',
      guestPhone: '9000000002',
    })

    // Verify room inventory decreased from 5 to 2 (since 2 + 1 = 3 units held)
    const { roomTypes } = await db.getPropertyBySlug('hotel-cladis-sector-51-noida')
    const deluxeRoom = roomTypes.find((r) => r.slug === 'deluxe-room')
    expect(deluxeRoom?.available_units).toBe(2)

    // Simulate hold1 expiring by forcing its created_at to 20 minutes ago
    if (hold1.booking) {
      hold1.booking.created_at = new Date(Date.now() - 20 * 60 * 1000)
      db.memoryBookings.set(hold1.booking.id, hold1.booking)
    }

    // Run hold cleanup worker with 15-minute threshold
    const cleanedCount = await db.cleanupExpiredHolds(15)
    expect(cleanedCount).toBe(1) // Only hold1 (20 mins old) should expire; hold2 (just created) stays active

    // Verify hold1 status transitioned to EXPIRED
    const lookupHold1 = await db.getBookingByCode(hold1.booking!.booking_code)
    expect(lookupHold1?.booking_status).toBe('EXPIRED')

    // Verify hold2 is still active (PENDING_PAYMENT)
    const lookupHold2 = await db.getBookingByCode(hold2.booking!.booking_code)
    expect(lookupHold2?.booking_status).toBe('PENDING_PAYMENT')

    // Verify room inventory restored 2 units (from hold1), moving from 2 up to 4 available units!
    const { roomTypes: afterRoomTypes } = await db.getPropertyBySlug('hotel-cladis-sector-51-noida')
    const afterDeluxeRoom = afterRoomTypes.find((r) => r.slug === 'deluxe-room')
    expect(afterDeluxeRoom?.available_units).toBe(4)
  })
})
