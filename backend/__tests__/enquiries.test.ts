import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'

describe('Enquiry Engine & Mode 2/3 Payment Links (Phase 2 Patch)', () => {
  const app = createApp()
  let createdEnquiryId: string

  beforeAll(() => {
    db.useInMemory = true
    db.initializeInMemorySeed()
  })

  it('should create a new banquet enquiry and dispatch WhatsApp alert to management', async () => {
    const payload = {
      enquiryType: 'BANQUET',
      propertySlug: 'banquet-cladis-sector-51-noida',
      guestName: 'Anil Kapoor',
      guestPhone: '9876543210',
      guestEmail: 'anil.kapoor@example.com',
      eventDate: '2026-12-25',
      guestCount: 300,
      message: 'Looking for full banquet hall rental with dinner buffet',
    }

    const res = await request(app).post('/api/enquiries').send(payload)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.id).toMatch(/^enq_/)
    expect(res.body.data.enquiry_type).toBe('BANQUET')
    expect(res.body.data.status).toBe('NEW')

    createdEnquiryId = res.body.data.id
  })

  it('should retrieve all enquiries via GET /api/enquiries', async () => {
    const res = await request(app).get('/api/enquiries')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.some((e: any) => e.id === createdEnquiryId)).toBe(true)
  })

  it('should generate an instant Razorpay payment link for the enquiry (Mode 2/3 Deposit)', async () => {
    const linkPayload = {
      enquiryId: createdEnquiryId,
      amount: 50000,
      description: 'Advance Token Deposit for Grand Wedding Reception',
    }

    const res = await request(app).post('/api/payments/enquiry-payment-link').send(linkPayload)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.paymentLinkId).toMatch(/^plink_enq_sim_/)
    expect(res.body.data.shortUrl).toContain('/pay-enquiry/')
  })

  it('should verify that the enquiry status is updated to LINK_SENT with paymentLinkId attached', async () => {
    const res = await request(app).get(`/api/enquiries/${createdEnquiryId}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('LINK_SENT')
    expect(res.body.data.razorpay_payment_link_id).toBeDefined()
  })

  it('should allow admin/dashboard to manually update status via PATCH /api/enquiries/:id/status', async () => {
    const res = await request(app)
      .patch(`/api/enquiries/${createdEnquiryId}/status`)
      .send({ status: 'CONVERTED' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('CONVERTED')
  })
})
