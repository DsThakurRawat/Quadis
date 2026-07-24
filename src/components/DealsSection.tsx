import { Reveal } from './blocks.tsx'
import { Button } from './ui.tsx'

interface Deal {
  badgeText: string
  badgeColor: string
  title: string
  description: string
  image: string
  link: string
}

const DEALS: Deal[] = [
  {
    badgeText: 'DEAL OF THE DAY',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Deal Of The Day',
    description: "Enjoy today's special deal with up to 25% instant discount across all properties!",
    image: '/images/offers/deal-of-the-day.png',
    link: '/hotels',
  },
  {
    badgeText: 'NEVER TOO OLD',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Never Too Old',
    description: 'Enjoy Our Full-Fledged Senior Citizen Package with special ground-floor rooms and complimentary breakfast!',
    image: '/images/offers/never-too-old.png',
    link: '/hotels',
  },
  {
    badgeText: 'BOSS LADY',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Boss Lady',
    description: 'Exclusive Perks, priority 24x7 security, and express check-in for Solo Female Travelers!',
    image: '/images/offers/boss-lady.png',
    link: '/hotels',
  },
  {
    badgeText: 'STAY LONG STAY GREEN',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Stay Long Stay Green',
    description: 'Big Savings up to 35% off on weekly and monthly extended stays across Noida & Delhi!',
    image: '/images/offers/stay-long-stay-green.png',
    link: '/hotels',
  },
]

export default function DealsSection() {
  return (
    <section className="section bg-stone-50 py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="h2 text-stone-900 font-serif">Curated Offers</h2>
          <p className="text-stone-500 mt-3">Exclusive savings tailored for your next stay.</p>
        </div>
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {DEALS.map((deal) => (
            <div key={deal.title} className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 bg-white border border-stone-200 cursor-pointer">
              {/* The Graphic (Aspect ratio perfectly matches the 256x224 px images) */}
              <div className="w-full aspect-[256/224] overflow-hidden bg-stone-100">
                <img 
                  src={deal.image} 
                  alt={deal.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                  loading="lazy" 
                />
              </div>
              
              {/* Sleek Hover Overlay with Action Button */}
              <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors duration-500 flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100">
                <Button 
                  to={deal.link} 
                  className="bg-white text-emerald-950 px-8 py-3 rounded-full text-xs font-bold tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                >
                  CLAIM OFFER
                </Button>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
