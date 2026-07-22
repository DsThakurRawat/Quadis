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
    <section className="section bg-warm py-12 border-t border-b border-stone-200">
      <div className="container">
        {/* Featured In */}
        <div className="mb-12 text-center">
          <SectionHeader overline="PRESS & ACCLAIM" title="Featured In" />
          <Reveal className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center justify-center mt-6">
            {PRESS_LOGOS.map((logo) => (
              <div key={logo.name} className="flex items-center justify-center p-4 bg-white/80 rounded-xl border border-stone-200/60 shadow-xs h-16 hover:bg-white hover:shadow-sm transition-all">
                <span className={logo.style}>{logo.display}</span>
              </div>
            ))}
          </Reveal>
        </div>

        {/* Offers for You */}
        <div className="mt-14">
          <SectionHeader overline="SPECIAL SAVINGS" title="Offers for You" />
          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {OFFERS.map((offer) => (
              <div key={offer.code} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black tracking-wider text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full">
                      {offer.bank}
                    </span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded">
                      {offer.discount}
                    </span>
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed mb-4">{offer.details}</p>
                  <p className="text-stone-400 text-xs italic mb-6">{offer.validity}</p>
                </div>
                <div className="flex items-center justify-between bg-stone-50 border border-dashed border-stone-300 rounded-xl p-2.5">
                  <span className="font-mono font-bold text-stone-900 tracking-wider text-sm pl-2">
                    {offer.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(offer.code)}
                    className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
