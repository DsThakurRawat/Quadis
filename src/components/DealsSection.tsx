import { Reveal, SectionHeader } from './blocks.tsx'
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
    <section className="section bg-cream">
      <div className="container center-col">
        <div className="mb-10 text-center">
          <SectionHeader overline="CURATED OFFERS" title="Exclusive Savings" />
          <p className="intro__body" style={{ marginTop: '12px' }}>Exclusive savings tailored for your next stay.</p>
        </div>
        
        <Reveal className="deals-grid">
          {DEALS.map((deal) => (
            <div key={deal.title} className="deals-poster">
              <div className="deals-poster-media">
                <img src={deal.image} alt={deal.title} className="deals-poster-img" loading="lazy" />
              </div>
              
              <div className="deals-poster-overlay">
                <Button to={deal.link} variant="primary" className="deals-poster-btn">
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
