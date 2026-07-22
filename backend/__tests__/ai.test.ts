import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

const app = createApp()

describe('Phase 4: Agentic GenAI Chatbot (`Quadis Assist`) Suite', () => {
  const testSessionId = 'sess_test_ai_1001'

  beforeAll(() => {
    db.useInMemory = true
    db.initializeInMemorySeed()
  })

  it('POST /api/ai/chat responds to general inquiry and invokes search_hotels tool', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        sessionId: testSessionId,
        message: 'Are there any available rooms in Noida Sector 51?',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reply).toBeDefined()
    expect(res.body.data.toolsInvoked).toContain('search_hotels')
  })

  it('POST /api/ai/chat initiates a 15-minute soft reservation hold via initiate_soft_hold tool', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        sessionId: testSessionId,
        message: 'Please hold a Deluxe room for me at Sector 51 for tomorrow',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.toolsInvoked).toContain('initiate_soft_hold')
    expect(res.body.data.reply).toContain('15-Minute Reservation Hold Created!')

    // Verify hold exists in DB
    const bookings = Array.from(db.memoryBookings.values())
    const hold = bookings.find((b) => b.guest_name === 'Chatbot Guest')
    expect(hold).toBeDefined()
    expect(hold?.booking_status).toBe('PENDING_PAYMENT')
  })

  it('POST /api/ai/chat creates a banquet RFP enquiry and alerts manager via create_banquet_enquiry tool', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        sessionId: testSessionId,
        message: 'I want to submit a banquet RFP for a corporate conference of 150 guests on 25th Dec',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.toolsInvoked).toContain('create_banquet_enquiry')
    expect(res.body.data.reply).toContain('Our event director has received an instant alert')

    // Verify enquiry in DB
    const enquiries = Array.from(db.memoryEnquiries.values())
    const rfp = enquiries.find((e) => e.enquiry_type === 'BANQUET' && e.message?.includes('conference'))
    expect(rfp).toBeDefined()
  })

  it('POST /api/ai/chat checks real-time booking status via check_booking_status tool', async () => {
    // First get a known booking code from seed or our previous test
    const allBookings = Array.from(db.memoryBookings.values())
    const targetBooking = allBookings[0]

    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        sessionId: testSessionId,
        message: `What is the status of my booking ${targetBooking.booking_code}?`,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.toolsInvoked).toContain('check_booking_status')
    expect(res.body.data.reply).toContain(targetBooking.booking_code)
  })

  it('POST /api/ai/chat triggers human handoff alert when guest requests manager', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        sessionId: testSessionId,
        message: 'Please trigger human handoff and connect me with the hotel manager right now',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.toolsInvoked).toContain('human_handoff')
    expect(res.body.data.handoffTriggered).toBe(true)
    expect(res.body.data.reply).toContain('A hotel manager has been alerted on WhatsApp')
  })

  it('GET /api/ai/logs returns complete audit trail of AI conversation turns', async () => {
    const res = await request(app).get('/api/ai/logs')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.count).toBeGreaterThanOrEqual(5)
    expect(res.body.data[0].session_id).toBe(testSessionId)
  })
})
