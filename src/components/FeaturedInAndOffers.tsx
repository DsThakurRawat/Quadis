import { useState } from 'react'
import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'
import { PRESS_LOGOS } from '../data/logos.ts'

interface OfferCard {
  bank: string
  code: string
  discount: string
  details: string
  validity: string
}

const OFFERS: OfferCard[] = [
  {
    bank: 'HDFC BANK',
    code: 'QUADISHDFC',
    discount: 'FLAT 15% OFF',
    details: 'Get 15% off up to ₹1,500 on your Quadis stay when paying with HDFC Bank Credit & Debit Cards.',
    validity: 'Valid on stays through Dec 2026',
  },
  {
    bank: 'ICICI BANK',
    code: 'QUADIS500',
    discount: '₹500 INSTANT DISCOUNT',
    details: 'Flat ₹500 discount on all room bookings above ₹1,999 using ICICI NetBanking or Cards.',
    validity: 'Valid on weekends & weekdays',
  },
  {
    bank: 'UPI SPECIAL',
    code: 'QUADISUPI',
    discount: 'FLAT 10% CASHBACK',
    details: 'Instant 10% discount when booking online directly and completing checkout via UPI (GPay, PhonePe, Paytm).',
    validity: 'Valid across all 10 properties',
  },
]

export default function FeaturedInAndOffers() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  return (
    <section className="featured-section">
      <div className="container">
        {/* Featured In */}
        <div className="featured-press-container">
          <SectionHeader overline="PRESS & ACCLAIM" title="Featured In" />
          <Reveal className="press-logos-grid">
            {PRESS_LOGOS.map((logo) => (
              <div key={logo.name} className="press-logo-card">
                <img className="logo-mark" src={logo.src} alt={logo.name} loading="lazy" />
              </div>
            ))}
          </Reveal>
        </div>

        {/* Offers for You */}
        <div className="offers-container">
          <SectionHeader overline="SPECIAL SAVINGS" title="Offers for You" />
          <Reveal className="offers-grid">
            {OFFERS.map((offer) => (
              <div key={offer.code} className="offer-card">
                <div>
                  <div className="offer-header">
                    <span className="offer-bank-tag">
                      {offer.bank}
                    </span>
                    <span className="offer-discount-tag">
                      {offer.discount}
                    </span>
                  </div>
                  <p className="offer-details">{offer.details}</p>
                  <p className="offer-validity">{offer.validity}</p>
                </div>
                <div className="offer-footer">
                  <span className="offer-code-text">
                    {offer.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(offer.code)}
                    className="offer-copy-button"
                  >
                    {copiedCode === offer.code ? '✓ COPIED' : 'COPY CODE'}
                  </button>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
