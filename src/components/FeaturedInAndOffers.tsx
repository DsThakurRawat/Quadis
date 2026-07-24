import { useState } from 'react'
import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

const PRESS_LOGOS = [
  { name: 'Navbharat Times', display: 'NBT', style: 'font-extrabold text-red-600 text-2xl tracking-tighter' },
  { name: 'Condé Nast Traveller', display: 'Condé Nast TRAVELLER', style: 'font-serif tracking-widest text-stone-900 text-lg uppercase font-semibold' },
  { name: 'CONVOY', display: 'CONVOY', style: 'font-mono font-black text-amber-600 text-xl tracking-widest' },
  { name: 'Outlook Traveller', display: 'Outlook TRAVELLER', style: 'font-sans font-bold text-stone-800 text-lg tracking-tight' },
  { name: 'Lifestyle Asia', display: 'LIFESTYLE ASIA', style: 'font-serif italic text-stone-700 text-base tracking-widest' },
  { name: 'Pinkvilla', display: 'pinkvilla', style: 'font-sans font-bold text-pink-600 text-xl tracking-tight lowercase' },
  { name: 'The Economic Times', display: 'THE ECONOMIC TIMES', style: 'font-serif font-bold text-stone-900 text-base tracking-normal' },
  { name: 'Mint', display: 'mint', style: 'font-sans font-black text-orange-600 text-2xl tracking-tighter lowercase' },
]

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
                <span className={logo.style}>{logo.display}</span>
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
