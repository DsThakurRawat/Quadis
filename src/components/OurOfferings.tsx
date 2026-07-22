import { SectionHeader, Button } from './ui.tsx'
import { Reveal } from './blocks.tsx'
import { homeImages, banquetHero, restaurantImages } from '../data/images.ts'

interface Offering {
  title: string
  subtitle: string
  description: string
  badge: string
  image: string
  link: string
  cta: string
}

const OFFERINGS: Offering[] = [
  {
    title: 'Executive & Deluxe Stays',
    subtitle: 'Calm, considered rooms',
    description: 'Immaculate rooms designed around deep sleep, plush bedding, high-speed Wi-Fi, and 24x7 attentive room service across Sector 51, Sector 15, and Delhi.',
    badge: 'ROOMS & SUITES',
    image: homeImages[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
    link: '/hotels',
    cta: 'EXPLORE ROOMS',
  },
  {
    title: 'Grand Banquets & Weddings',
    subtitle: 'Celebrations up to 500 guests',
    description: 'Pillarless luxury halls in Sector 51 Noida and Lajpat Nagar Delhi, equipped with customized gourmet catering, valet parking, and dedicated event planners.',
    badge: 'BANQUETS & EVENTS',
    image: banquetHero[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    link: '/banquets',
    cta: 'EXPLORE VENUES',
  },
  {
    title: 'Corporate & Long Stays',
    subtitle: 'Tailored business packages',
    description: 'Dedicated GST-compliant invoicing, express check-in, priority laundry, and discounted long-stay corporate tariffs across our 10 NCR properties.',
    badge: 'BUSINESS TRAVEL',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    link: '/corporate-hotel-booking',
    cta: 'CORPORATE TARIFFS',
  },
  {
    title: 'In-House Dining & Catering',
    subtitle: 'Refined culinary experiences',
    description: 'Multi-cuisine in-house kitchens serving freshly prepared breakfast spreads, wholesome room dining, and customized event menus tailored to every palate.',
    badge: 'RESTAURANT & BAR',
    image: restaurantImages()[0] || 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
    link: '/restaurant',
    cta: 'VIEW MENUS',
  },
]

export default function OurOfferings() {
  return (
    <section className="section bg-cream py-12">
      <div className="container">
        <SectionHeader overline="WHAT WE PROVIDE" title="Our Offerings" />
        <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {OFFERINGS.map((offering) => (
            <article key={offering.title} className="offering-card group">
              <div className="offering-card__media">
                <img src={offering.image} alt={offering.title} className="offering-card__img" loading="lazy" />
                <span className="offering-card__badge">{offering.badge}</span>
              </div>
              <div className="offering-card__body">
                <span className="overline gold-accent text-xs font-semibold">{offering.subtitle}</span>
                <h3 className="h3 offering-card__title">{offering.title}</h3>
                <p className="offering-card__desc">{offering.description}</p>
                <div className="mt-4">
                  <Button to={offering.link} variant="ghost" className="offering-card__btn">
                    {offering.cta} &rarr;
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
