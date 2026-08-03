import request from 'supertest'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { requireAdmin } from '../src/middleware/auth'
import { signSession } from '../src/lib/auth'

const app = createApp()

/**
 * A FAKE pin. The test sets `process.env.ADMIN_PIN` to it below, so any six
 * digits work and the real one buys nothing.
 *
 * This constant held the LIVE production PIN from `/quadis/admin-pin` until
 * 3 Aug, caught while staging this file for its first commit. This repo is
 * public (§3b), so committing it would have published the admin PIN for
 * quadishotels.com/admin. Never paste a real credential in here — not even a
 * "temporary" one, because tests are the files people forget to reread.
 */
const BOOTSTRAP_PIN = '246813'

describe('Admin PIN — the client can change it herself', () => {
  beforeEach(() => {
    db.initializeInMemorySeed()
    db.memoryAdminPinHash = null
    process.env.ADMIN_PIN = BOOTSTRAP_PIN
    process.env.ADMIN_PASSWORD = 'test-admin-token'
    process.env.SESSION_SECRET = 'test-session-secret'
  })

  describe('sign-in', () => {
    it('accepts the bootstrap PIN and flags that it still needs changing', async () => {
      const res = await request(app).post('/api/admin/auth').send({ pin: BOOTSTRAP_PIN })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeTruthy()
      expect(res.body.mustChangePin).toBe(true)
    })

    it('rejects a wrong PIN', async () => {
      const res = await request(app).post('/api/admin/auth').send({ pin: '000000' })
      expect(res.status).toBe(401)
    })

    it('no longer returns ADMIN_PASSWORD as the token', async () => {
      // The old endpoint handed back the permanent admin secret itself, so a
      // single intercepted sign-in response was the credential, for ever.
      const res = await request(app).post('/api/admin/auth').send({ pin: BOOTSTRAP_PIN })
      expect(res.body.token).not.toBe('test-admin-token')
    })
  })

  describe('changing it', () => {
    it('replaces the PIN, and the old one stops working', async () => {
      const change = await request(app)
        .post('/api/admin/change-pin')
        .send({ currentPin: BOOTSTRAP_PIN, newPin: '739154' })
      expect(change.status).toBe(200)

      const withOld = await request(app).post('/api/admin/auth').send({ pin: BOOTSTRAP_PIN })
      expect(withOld.status).toBe(401)

      const withNew = await request(app).post('/api/admin/auth').send({ pin: '739154' })
      expect(withNew.status).toBe(200)
      // Changed once, so the nag is gone.
      expect(withNew.body.mustChangePin).toBe(false)
    })

    it('never stores the PIN in plaintext', async () => {
      await request(app)
        .post('/api/admin/change-pin')
        .send({ currentPin: BOOTSTRAP_PIN, newPin: '739154' })

      expect(db.memoryAdminPinHash).toBeTruthy()
      expect(db.memoryAdminPinHash).not.toContain('739154')
      expect(db.memoryAdminPinHash!.startsWith('scrypt$')).toBe(true)
    })

    it('refuses a wrong current PIN, so an unattended dashboard cannot lock the owner out', async () => {
      const res = await request(app)
        .post('/api/admin/change-pin')
        .send({ currentPin: '111111', newPin: '739154' })

      expect(res.status).toBe(401)
      expect(db.memoryAdminPinHash).toBeNull()
    })

    it.each([
      ['000000', 'same digit six times'],
      ['123456', 'ascending run'],
      ['987654', 'descending run'],
      ['1234', 'too short'],
      ['abcdef', 'not digits'],
    ])('rejects %s (%s)', async (pin) => {
      const res = await request(app)
        .post('/api/admin/change-pin')
        .send({ currentPin: BOOTSTRAP_PIN, newPin: pin })

      expect(res.status).toBe(400)
      expect(db.memoryAdminPinHash).toBeNull()
    })
  })

  /**
   * requireAdmin short-circuits under NODE_ENV=test, so these drive the
   * middleware directly with the env flipped. Without this block the whole
   * guard is untested — which is how the escalation below would ship unseen.
   */
  describe('requireAdmin (env flipped to production)', () => {
    const original = process.env.NODE_ENV

    beforeEach(() => { process.env.NODE_ENV = 'production' })
    afterEach(() => { process.env.NODE_ENV = original })

    const run = (authorization?: string) => {
      const req: any = { headers: authorization ? { authorization } : {} }
      const res: any = {
        statusCode: 0,
        body: null,
        status(code: number) { this.statusCode = code; return this },
        json(payload: any) { this.body = payload; return this },
      }
      const next = jest.fn()
      requireAdmin(req, res, next)
      return { res, next }
    }

    it('accepts a session carrying role=admin', () => {
      const token = signSession({ sub: 'admin', email: '', role: 'admin' }, 60)
      const { next } = run(`Bearer ${token}`)
      expect(next).toHaveBeenCalled()
    })

    it('REJECTS a valid guest session — signing up must not grant admin', () => {
      // The escalation this guards: verifySession() validates ordinary guest
      // logins too, so a guard that accepted "any valid session" would promote
      // every registered guest to full admin.
      const guest = signSession({ sub: 'user-123', email: 'guest@example.com' }, 60)
      const { res, next } = run(`Bearer ${guest}`)

      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(401)
    })

    it('rejects a guest session that tries to forge the claim', () => {
      // Forged payload, signed with the wrong secret — the HMAC must catch it.
      const forged = signSession({ sub: 'user-123', email: 'g@example.com', role: 'admin' } as any, 60)
      const realSecret = process.env.SESSION_SECRET
      process.env.SESSION_SECRET = 'a-different-secret'
      const { res, next } = run(`Bearer ${forged}`)
      process.env.SESSION_SECRET = realSecret

      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(401)
    })

    it('rejects an expired admin session', () => {
      const expired = signSession({ sub: 'admin', email: '', role: 'admin' }, -10)
      const { res, next } = run(`Bearer ${expired}`)

      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(401)
    })

    it('still accepts the raw ADMIN_PASSWORD as break-glass', () => {
      const { next } = run('Bearer test-admin-token')
      expect(next).toHaveBeenCalled()
    })

    it('rejects no token at all', () => {
      const { res, next } = run()
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(401)
    })
  })
})
