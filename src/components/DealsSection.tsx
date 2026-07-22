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
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
    link: '/hotels',
  },
  {
    badgeText: 'NEVER TOO OLD',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Never Too Old',
    description: 'Enjoy Our Full-Fledged Senior Citizen Package with special ground-floor rooms and complimentary breakfast!',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
    link: '/hotels',
  },
  {
    badgeText: 'DEAR LADY',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Dear Lady',
    description: 'Exclusive Perks, priority 24x7 security, and express check-in for Solo Female Travelers!',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
    link: '/hotels',
  },
  {
    badgeText: 'STAY LONG STAY GREEN',
    badgeColor: 'bg-emerald-800 text-amber-300',
    title: 'Stay Long Stay Green',
    description: 'Big Savings up to 35% off on weekly and monthly extended stays across Noida & Delhi!',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=80',
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
              <div className="relative mb-4 w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-900 shadow-inner flex items-center justify-center bg-stone-100">
                <img src={deal.image} alt={deal.title} className="w-full h-full object-cover opacity-90" loading="lazy" />
                <div className="absolute inset-0 bg-emerald-950/60 flex items-center justify-center p-2">
                  <span className="text-center font-extrabold text-amber-400 text-xs tracking-wider leading-tight uppercase">
                    {deal.badgeText}
                  </span>
                </div>
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
