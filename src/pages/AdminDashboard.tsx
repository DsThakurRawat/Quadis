import React, { useState, useEffect } from 'react'
import { Button } from '../components/ui'

interface GlanceMetrics {
  todayCheckIns: number
  pendingHolds: number
  pendingEnquiries: number
  todayRevenue: number
}

interface RoomType {
  id: string
  name: string
  slug: string
  is_available: boolean
  total_units: number
  available_units: number
  price_offset: number
}

interface PropertyItem {
  property: {
    id: string
    name: string
    slug: string
    city: string
    base_price: number
    weekend_surcharge_percent?: number
  }
  rooms: RoomType[]
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('quadis_admin_token'))
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const [metrics, setMetrics] = useState<GlanceMetrics>({ todayCheckIns: 0, pendingHolds: 0, pendingEnquiries: 0, todayRevenue: 0 })
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([])

  // Instant payment link generator state
  const [linkPhone, setLinkPhone] = useState('')
  const [linkAmount, setLinkAmount] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{ shortUrl: string; paymentLinkId: string } | null>(null)
  const [linkPending, setLinkPending] = useState(false)

  const fetchDashboard = async (authToken: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: authToken },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setMetrics(data.data.metrics)
        setProperties(data.data.properties)
        setRecentBookings(data.data.recentBookings || [])
        setRecentEnquiries(data.data.recentEnquiries || [])
      } else if (res.status === 401) {
        sessionStorage.removeItem('quadis_admin_token')
        setToken(null)
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchDashboard(token)
    }
  }, [token])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      })
      const data = await res.json()
      if (data.success && data.token) {
        sessionStorage.setItem('quadis_admin_token', data.token)
        setToken(data.token)
      } else {
        setAuthError(data.error || 'Invalid PIN code')
      }
    } catch (err) {
      setAuthError('Authentication server error')
    }
  }

  const toggleRoom = async (roomTypeId: string, currentStatus: boolean) => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/room-availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ roomTypeId, isAvailable: !currentStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setProperties((prev) =>
          prev.map((item) => ({
            ...item,
            rooms: item.rooms.map((r) => (r.id === roomTypeId ? { ...r, is_available: !currentStatus } : r)),
          }))
        )
      }
    } catch (err) {
      console.error('Error toggling room:', err)
    }
  }

  const toggleSurcharge = async (currentSurcharge = 0) => {
    if (!token) return
    const newPercent = currentSurcharge > 0 ? 0 : 15
    try {
      const res = await fetch('/api/admin/surcharge', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ surchargePercent: newPercent, propertyId: 'all' }),
      })
      const data = await res.json()
      if (data.success) {
        fetchDashboard(token)
      }
    } catch (err) {
      console.error('Error toggling surcharge:', err)
    }
  }

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !linkPhone || !linkAmount) return
    setLinkPending(true)
    setGeneratedLink(null)
    try {
      const res = await fetch('/api/admin/payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          phone: linkPhone,
          amount: Number(linkAmount),
          guestName: linkName || 'Walk-in Guest',
          description: linkDesc || 'Quadis Hotels Deposit',
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setGeneratedLink(data.data)
        setLinkPhone('')
        setLinkAmount('')
        setLinkName('')
        setLinkDesc('')
        fetchDashboard(token)
      }
    } catch (err) {
      console.error('Error generating link:', err)
    } finally {
      setLinkPending(false)
    }
  }

  if (!token) {
    return (
      <section className="section container" style={{ maxWidth: '440px', margin: '4rem auto' }}>
        <div className="card p-6" style={{ background: '#1c1917', color: '#fff', borderRadius: '12px', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>🔒 Quadis Manager Login</h1>
          <p style={{ color: '#a8a29e', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            Enter your 6-digit Hotel Management PIN to access the 30-second mobile switchboard.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              placeholder="Enter Admin PIN (Default: 998877)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #444',
                background: '#292524',
                color: '#fff',
                fontSize: '1rem',
                textAlign: 'center',
                letterSpacing: '0.2em',
              }}
              maxLength={10}
            />
            {authError && <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{authError}</div>}
            <Button as="button" type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem' }}>
              ACCESS SWITCHBOARD
            </Button>
          </form>
        </div>
      </section>
    )
  }

  const globalSurcharge = properties[0]?.property.weekend_surcharge_percent || 0

  return (
    <div className="admin-portal" style={{ background: '#0c0a09', color: '#f5f5f4', minHeight: '100vh', padding: '1.5rem 1rem' }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #292524', paddingBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: '#d97706', fontWeight: '700' }}>MOBILE MANAGEMENT SWITCHBOARD</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0' }}>Quadis Owner Dashboard</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('quadis_admin_token')
              setToken(null)
            }}
            style={{ background: '#292524', color: '#a8a29e', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Sign Out
          </button>
        </div>

        {/* 1. Daily Glance Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <div style={{ color: '#a8a29e', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today's Check-ins</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>{metrics.todayCheckIns}</div>
          </div>
          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <div style={{ color: '#a8a29e', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Holds (15m)</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b', marginTop: '0.25rem' }}>{metrics.pendingHolds}</div>
          </div>
          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <div style={{ color: '#a8a29e', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Leads / Enquiries</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3b82f6', marginTop: '0.25rem' }}>{metrics.pendingEnquiries}</div>
          </div>
          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <div style={{ color: '#a8a29e', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today's Revenue</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#eab308', marginTop: '0.25rem' }}>₹{metrics.todayRevenue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* 2. Global Controls (Weekend Surcharge Toggle) */}
        <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0' }}>⚡ Global Weekend & Seasonal Surcharge</h3>
            <p style={{ color: '#a8a29e', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              Instantly apply +15% pricing boost across all 10 properties during high demand periods or Friday/Saturday stays.
            </p>
          </div>
          <button
            onClick={() => toggleSurcharge(globalSurcharge)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              background: globalSurcharge > 0 ? '#10b981' : '#44403c',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: globalSurcharge > 0 ? '#fff' : '#a8a29e', display: 'inline-block' }}></span>
            {globalSurcharge > 0 ? 'ACTIVE (+15% APPLIED)' : 'OFF (NORMAL PRICING)'}
          </button>
        </div>

        {/* 3. Instant Payment Link Generator */}
        <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.5rem', borderRadius: '10px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem' }}>💬 Instant WhatsApp Payment Link Generator</h3>
          <form onSubmit={handleGenerateLink} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a8a29e', marginBottom: '0.4rem' }}>Guest Phone</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={linkPhone}
                onChange={(e) => setLinkPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', background: '#292524', border: '1px solid #444', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a8a29e', marginBottom: '0.4rem' }}>Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={linkAmount}
                onChange={(e) => setLinkAmount(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', background: '#292524', border: '1px solid #444', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a8a29e', marginBottom: '0.4rem' }}>Guest Name / Walk-in Purpose</label>
              <input
                type="text"
                placeholder="e.g. Rajat Verma (Banquet Deposit)"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', background: '#292524', border: '1px solid #444', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <Button as="button" type="submit" variant="primary" disabled={linkPending} style={{ padding: '0.65rem' }}>
              {linkPending ? 'Generating…' : 'SEND LINK'}
            </Button>
          </form>

          {generatedLink && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#047857', borderRadius: '8px', color: '#fff' }}>
              <strong style={{ display: 'block', marginBottom: '0.3rem' }}>✅ Payment Link Dispatched!</strong>
              <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                Shareable URL: <a href={generatedLink.shortUrl} target="_blank" rel="noreferrer" style={{ color: '#a7f3d0', textDecoration: 'underline' }}>{generatedLink.shortUrl}</a>
              </div>
            </div>
          )}
        </div>

        {/* 4. Inventory Switchboard (One-Tap Switches) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem' }}>🏨 Live Inventory Switchboard (One-Tap Control)</h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#a8a29e' }}>Loading switchboard…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {properties.map((item) => (
                <div key={item.property.id} style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #292524', paddingBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0' }}>{item.property.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#a8a29e' }}>{item.property.city} • Base Rate: ₹{Number(item.property.base_price).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    {item.rooms.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: '#292524',
                          borderRadius: '8px',
                          border: r.is_available ? '1px solid #10b981' : '1px solid #ef4444',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{r.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a8a29e' }}>
                            {r.available_units} / {r.total_units} units left • +₹{r.price_offset}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRoom(r.id, r.is_available)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            border: 'none',
                            cursor: 'pointer',
                            background: r.is_available ? '#10b981' : '#ef4444',
                            color: '#fff',
                            minWidth: '105px',
                            textAlign: 'center',
                          }}
                        >
                          {r.is_available ? 'AVAILABLE' : 'SOLD OUT'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Recent Bookings & Enquiries */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem' }}>📋 Recent Bookings ({recentBookings.length})</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentBookings.map((b) => (
                <div key={b.id} style={{ background: '#292524', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#fff' }}>{b.booking_code}</strong> — {b.guest_name} ({b.guest_phone})
                    <div style={{ color: '#a8a29e', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Check-in: {b.check_in} • {b.rooms_count} room(s) • ₹{Number(b.total_amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: b.booking_status === 'CONFIRMED' ? '#047857' : b.booking_status === 'PENDING_PAYMENT' ? '#d97706' : '#991b1b',
                      color: '#fff',
                    }}
                  >
                    {b.booking_status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#1c1917', border: '1px solid #292524', padding: '1.25rem', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem' }}>🔔 Recent Leads & RFPs ({recentEnquiries.length})</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentEnquiries.map((e) => (
                <div key={e.id} style={{ background: '#292524', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#fff' }}>[{e.enquiry_type}]</strong> {e.guest_name} ({e.guest_phone})
                    <div style={{ color: '#a8a29e', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      {e.message || 'No message provided'} • {e.event_date ? `Date: ${e.event_date}` : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: e.status === 'CONVERTED' ? '#047857' : e.status === 'LINK_SENT' ? '#2563eb' : '#d97706',
                      color: '#fff',
                    }}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
