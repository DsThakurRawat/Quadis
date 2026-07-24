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
    <section className="section bg-cream py-10">
      <div className="container">
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEALS.map((deal) => (
            <div key={deal.title} className="deal-card flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
              <div className="relative mb-5 w-full flex items-center justify-center">
                <img src={deal.image} alt={deal.title} className="w-full max-w-[256px] h-auto object-contain rounded-xl drop-shadow-md" loading="lazy" />
              </div>
              <h3 className="h3 text-stone-900 text-lg font-bold mb-2">{deal.title}</h3>
              <p className="text-stone-600 text-sm mb-6 flex-grow leading-relaxed">{deal.description}</p>
              <Button to={deal.link} variant="primary" className="w-full text-xs py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold tracking-wider uppercase rounded-xl">
                VIEW OFFER
              </Button>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
