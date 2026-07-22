import React, { useState } from 'react'
import { BookingRecord } from '../types'
import { inr } from '../data/hotels'
import { getApiUrl } from '../config/api'

interface CheckoutModalProps {
  propertySlug: string
  propertyName: string
  propertyAddress: string
  roomTypeSlug: string
  roomTypeName: string
  checkIn: string
  checkOut: string
  roomsCount: number
  guestsCount: number
  totalAmount: number
  onClose: () => void
  onSuccess?: (bookingCode: string) => void
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  propertySlug,
  propertyName,
  propertyAddress,
  roomTypeSlug,
  roomTypeName,
  checkIn,
  checkOut,
  roomsCount,
  guestsCount,
  totalAmount,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'CONFIRMED'>('DETAILS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guest details state
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [gstin, setGstin] = useState('')
  const [showCorporate, setShowCorporate] = useState(false)

  // Created hold / order state
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [orderData, setOrderData] = useState<any>(null)

  // Calculate nights & GST slab
  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  )
  const ratePerRoomNight = totalAmount / (nights * roomsCount)
  const isLuxurySlab = ratePerRoomNight >= 7500
  const gstRatePercent = isLuxurySlab ? 18 : 12
  const taxableBase = Math.round((totalAmount / (1 + gstRatePercent / 100)) * 100) / 100
  const gstAmount = Math.round((totalAmount - taxableBase) * 100) / 100

  const handleInitiateHold = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(getApiUrl('/api/bookings/initiate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertySlug,
          roomTypeSlug,
          checkIn,
          checkOut,
          roomsCount,
          guestsCount,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || undefined,
          companyName: companyName.trim() || undefined,
          gstin: gstin.trim() || undefined,
        }),
      })

      const resData = await response.json()
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Could not initiate booking hold')
      }

      setBooking(resData.data)

      // Initialize Razorpay order right after hold
      const orderRes = await fetch(getApiUrl('/api/payments/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode: resData.data.booking_code }),
      })
      const orderJson = await orderRes.json()
      if (orderRes.ok && orderJson.success) {
        setOrderData(orderJson.data)
      }

      setStep('PAYMENT')
    } catch (err: any) {
      setError(err.message || 'Error communicating with reservation server')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulatePayment = async (status: 'order.paid' | 'payment.failed') => {
    if (!booking) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(getApiUrl('/api/webhooks/razorpay'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-webhook': 'true',
        },
        body: JSON.stringify({
          event: status,
          payload: {
            payment: {
              entity: {
                id: status === 'order.paid' ? `pay_live_sim_${Date.now()}` : `pay_failed_sim_${Date.now()}`,
                order_id: orderData?.orderId || 'order_sim_online',
                notes: {
                  bookingCode: booking.booking_code,
                },
              },
            },
          },
        }),
      })

      const resData = await response.json()
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to process payment verification')
      }

      if (status === 'order.paid') {
        const lookup = await fetch(getApiUrl(`/api/bookings/${booking.booking_code}`))
        const lookupJson = await lookup.json()
        if (lookup.ok && lookupJson.success) {
          setBooking(lookupJson.data)
        }
        setStep('CONFIRMED')
        if (onSuccess) onSuccess(booking.booking_code)
      } else {
        setError('❌ Payment transaction failed or declined. Room hold has been released back to inventory.')
      }
    } catch (err: any) {
      setError(err.message || 'Payment simulation error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = () => {
    if (!booking) return
    window.open(getApiUrl(`/api/bookings/${booking.booking_code}/invoice`), '_blank')
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.badge}>Quadis Instant Booking & Pay</span>
            <h3 style={styles.title}>{propertyName}</h3>
            <p style={styles.subtitle}>{roomTypeName} • {propertyAddress}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">×</button>
        </div>

        {/* Price Breakdown Banner */}
        <div style={styles.summaryBar}>
          <div style={styles.datesBox}>
            <span style={styles.datesLabel}>Check-In / Out ({nights} Night{nights > 1 ? 's' : ''})</span>
            <strong style={styles.datesText}>{checkIn} ➔ {checkOut}</strong>
          </div>
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Total Payable (Incl. {gstRatePercent}% GST)</span>
            <strong style={styles.totalAmount}>{inr(totalAmount)}</strong>
          </div>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* STEP 1: GUEST & CORPORATE DETAILS */}
        {step === 'DETAILS' && (
          <form onSubmit={handleInitiateHold} style={styles.body}>
            <div style={styles.sectionTitle}>1. Guest Information (For WhatsApp Receipt & Check-in)</div>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Full Name *
                <input
                  type="text"
                  required
                  style={styles.input}
                  placeholder="e.g. Divyansh Rawat"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </label>
              <label style={styles.label}>
                WhatsApp Mobile Number *
                <input
                  type="tel"
                  required
                  style={styles.input}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </label>
            </div>
            <label style={styles.label}>
              Email Address (Optional — For PDF Invoice copy)
              <input
                type="email"
                style={styles.input}
                placeholder="divyansh@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </label>

            <div style={styles.toggleCorporate}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showCorporate}
                  onChange={(e) => setShowCorporate(e.target.checked)}
                />
                <span>🏢 Add Company GSTIN for Corporate Tax Invoice (SAC 996311)</span>
              </label>
            </div>

            {showCorporate && (
              <div style={styles.formGrid}>
                <label style={styles.label}>
                  Company Name
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Quadis Technologies Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </label>
                <label style={styles.label}>
                  Corporate GSTIN
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="09AAACQ1234F1Z9"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* GST Slab note */}
            <div style={styles.gstInfo}>
              <span style={{ fontSize: 13, color: '#4B5563' }}>
                ℹ️ SAC Code 996311: Base Tariff ₹{taxableBase.toLocaleString('en-IN')} + {gstRatePercent}% GST (₹{gstAmount.toLocaleString('en-IN')}) = <strong>{inr(totalAmount)}</strong>
              </span>
            </div>

            <button type="submit" disabled={loading} style={styles.ctaBtn}>
              {loading ? 'Securing 15-Min Soft Hold...' : 'Proceed to Payment ➔'}
            </button>
          </form>
        )}

        {/* STEP 2: RAZORPAY & DEMO PAYMENT OPTIONS */}
        {step === 'PAYMENT' && booking && (
          <div style={styles.body}>
            <div style={styles.holdBanner}>
              🔒 <strong>15-Minute Soft Hold Active!</strong> Booking Code: <code style={styles.code}>{booking.booking_code}</code>
            </div>

            <div style={styles.sectionTitle}>2. Choose Payment Option</div>
            <p style={{ color: '#4B5563', fontSize: 14, marginBottom: 16 }}>
              You are paying <strong>{inr(totalAmount)}</strong> to confirm room category <strong>{roomTypeName}</strong>.
            </p>

            <div style={styles.paymentActions}>
              <button
                type="button"
                onClick={() => handleSimulatePayment('order.paid')}
                disabled={loading}
                style={styles.payOnlineBtn}
              >
                {loading ? 'Processing...' : `⚡ Confirm Online Payment (${inr(totalAmount)})`}
              </button>

              <div style={styles.demoDivider}><span>or test instant API simulation</span></div>

              <button
                type="button"
                onClick={() => handleSimulatePayment('payment.failed')}
                disabled={loading}
                style={styles.failDemoBtn}
              >
                ⚠️ Simulate Payment Failure / Decline (Releases Hold)
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRMED RECEIPT & INVOICE DOWNLOAD */}
        {step === 'CONFIRMED' && booking && (
          <div style={styles.body}>
            <div style={styles.successHeader}>
              <div style={styles.successIcon}>🎉</div>
              <h4 style={styles.successTitle}>Reservation Confirmed & Paid!</h4>
              <p style={styles.successSubtitle}>Booking Code: <strong>{booking.booking_code}</strong></p>
            </div>

            <div style={styles.ticketBox}>
              <div style={styles.ticketRow}><span>Guest Name:</span> <strong>{booking.guest_name}</strong></div>
              <div style={styles.ticketRow}><span>WhatsApp Number:</span> <strong>+91 {booking.guest_phone}</strong></div>
              <div style={styles.ticketRow}><span>Property:</span> <strong>{propertyName}</strong></div>
              <div style={styles.ticketRow}><span>Dates:</span> <strong>{booking.check_in} ➔ {booking.check_out}</strong></div>
              <div style={styles.ticketRow}><span>Payment ID:</span> <strong>{booking.razorpay_payment_id || 'ONLINE_INSTANT'}</strong></div>
              <div style={styles.ticketRow}><span>Amount Paid:</span> <strong>{inr(booking.total_amount)} ({gstRatePercent}% GST)</strong></div>
            </div>

            <div style={styles.whatsAppBadge}>
              ✅ Instant WhatsApp Confirmation Receipt dispatched to +91 {booking.guest_phone}!
            </div>

            <div style={styles.confirmButtons}>
              <button onClick={handleDownloadInvoice} style={styles.invoiceBtn}>
                📄 Download SAC 996311 GST Invoice (PDF)
              </button>
              <button onClick={onClose} style={styles.returnBtn}>
                Done & Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #E5E7EB',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    padding: '3px 8px',
    borderRadius: 9999,
    display: 'inline-block',
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 14,
    color: '#6B7280',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 24,
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  summaryBar: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  datesBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  datesLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  datesText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  totalBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  totalAmount: {
    fontSize: 18,
    color: '#F3F4F6',
    fontWeight: 700,
  },
  body: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 16,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    gap: 6,
    marginBottom: 16,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  toggleCorporate: {
    marginBottom: 16,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    color: '#1E3A8A',
    cursor: 'pointer',
  },
  gstInfo: {
    backgroundColor: '#F3F4F6',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 20,
    borderLeft: '4px solid #3B82F6',
  },
  ctaBtn: {
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#111827',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  holdBanner: {
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  code: {
    fontWeight: 700,
    backgroundColor: '#D1FAE5',
    padding: '2px 6px',
    borderRadius: 4,
  },
  paymentActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  payOnlineBtn: {
    padding: '16px',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)',
  },
  demoDivider: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    margin: '8px 0',
  },
  failDemoBtn: {
    padding: '12px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  successHeader: {
    textAlign: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#065F46',
  },
  successSubtitle: {
    margin: '4px 0 0 0',
    color: '#4B5563',
    fontSize: 15,
  },
  ticketBox: {
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  ticketRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#374151',
  },
  whatsAppBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  invoiceBtn: {
    padding: '14px',
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  returnBtn: {
    padding: '12px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderBottom: '1px solid #FECACA',
    color: '#B91C1C',
    padding: '12px 24px',
    fontSize: 13,
    fontWeight: 500,
  },
}
