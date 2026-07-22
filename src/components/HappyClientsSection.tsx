import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

const CLIENT_LOGOS = [
  { name: 'ABInBev', display: 'ABInBev', color: 'text-amber-700 font-black tracking-tighter text-xl' },
  { name: 'Airtel', display: 'airtel', color: 'text-red-600 font-extrabold tracking-tight text-2xl lowercase font-sans' },
  { name: 'Comviva', display: 'comviva', color: 'text-rose-600 font-bold tracking-normal text-xl lowercase font-mono' },
  { name: 'Emcure', display: 'Emcure', color: 'text-red-700 font-serif font-bold tracking-wide text-xl' },
  { name: 'Paytm', display: 'Paytm', color: 'text-sky-600 font-black tracking-tight text-2xl' },
  { name: 'Zomato', display: 'zomato', color: 'text-red-600 font-extrabold tracking-tighter text-2xl lowercase italic font-sans' },
  { name: 'Zepto', display: 'zepto', color: 'text-purple-700 font-black tracking-tight text-2xl lowercase' },
  { name: 'Hitachi', display: 'HITACHI', style: 'text-stone-800 font-mono font-bold tracking-widest text-lg' },
  { name: 'Polycab', display: 'POLYCAB', style: 'text-blue-900 font-sans font-black tracking-wider text-xl' },
  { name: 'Aditya Birla Group', display: 'ADITYA BIRLA', style: 'text-amber-900 font-serif font-bold tracking-widest text-base' },
]

const VERIFIED_GUEST_REVIEWS = [
  {
    quote: 'Good room sizes and very well maintained bathroom. Very welcoming staff and professional service quality with nice behaviour of room service operator.',
    name: 'Ramesh Kumar',
    meta: 'Stayed at Quadis Sector 51 Noida',
    rating: '5.0 ★',
  },
  {
    quote: 'Excellent location, well connected to all important places. Clean, comfortable property with very nice and helpful staff. Overall, a very comfortable stay.',
    name: "Sa'aim Tahrir",
    meta: 'Stayed at Quadis Sector 15 Noida',
    rating: '4.8 ★',
  },
  {
    quote: "I appreciate the environmentally friendly practices of the hotel. It's good to see them taking steps towards sustainability and providing clean linen daily.",
    name: 'Mrs Shubdha',
    meta: 'Stayed at Quadis Sector 51 Noida',
    rating: '5.0 ★',
  },
]

export default function HappyClientsSection() {
  return (
    <section className="section bg-cream py-12">
      <div className="container">
        {/* Our Happy Clients */}
        <div className="mb-14 text-center">
          <SectionHeader overline="CORPORATE TRUST" title="Our Happy Clients" />
          <p className="text-stone-600 text-sm max-w-xl mx-auto -mt-4 mb-8">
            Proudly hosting executives and corporate teams from India&rsquo;s most respected enterprises.
          </p>
          <Reveal className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center justify-center">
            {CLIENT_LOGOS.map((client) => (
              <div key={client.name} className="flex items-center justify-center p-4 bg-white rounded-xl border border-stone-200/80 shadow-xs h-16 hover:shadow-sm transition-all">
                <span className={client.color || client.style}>{client.display}</span>
              </div>
            ))}
          </Reveal>
        </div>

        {/* Trusted by 500,000+ verified guests */}
        <div className="bg-emerald-950 text-white rounded-3xl p-8 md:p-10 shadow-lg border border-emerald-900/50">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
              <span className="overline text-amber-400 text-xs font-bold tracking-widest">GUEST EXPERIENCE</span>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
                Trusted by <span className="text-amber-400 underline decoration-amber-400/40">500,000+</span> verified guests
              </h3>
            </div>
            <div className="flex items-center gap-2 bg-emerald-900/80 px-4 py-2 rounded-full border border-emerald-800">
              <span className="text-amber-400 font-bold text-sm">★ 4.5 Rating</span>
              <span className="text-emerald-300 text-xs">|</span>
              <span className="text-emerald-200 text-xs">95% Repeat Guests</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VERIFIED_GUEST_REVIEWS.map((review) => (
              <div key={review.name} className="bg-white text-stone-900 rounded-2xl p-6 flex flex-col justify-between shadow-sm border border-stone-100">
                <p className="text-stone-700 text-xs sm:text-sm leading-relaxed italic mb-6">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{review.name}</h4>
                    <p className="text-stone-400 text-[11px] leading-tight mt-0.5">{review.meta}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-1 rounded-md">
                    {review.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
