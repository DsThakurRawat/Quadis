import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'
import { galleryFacade, corporateImages, galleryRoyal } from '../data/images.ts'

/**
 * The three brand tiers, presented as a stated future roadmap rather than as a
 * current, filterable attribute of the nine live properties — all of which are
 * Quadis Central today. Copy is the client's own wording (change order item 14).
 *
 * The client's reference for this block is another group's "Experiences" page;
 * the layout is borrowed, the branding is not.
 */
interface Tier {
  name: string
  description: string
  image: string
}

const TIERS: Tier[] = [
  {
    name: 'Quadis Central',
    description: 'Normal standard hotels.',
    image: galleryFacade[0] || '/images/home/hero.jpg',
  },
  {
    name: 'Quadis Select',
    description: 'Premium corporate stays or family stays with additional facilities.',
    image: corporateImages[0] || '/images/home/hero.jpg',
  },
  {
    name: 'Quadis Experience',
    description: 'Resorts or luxury experience hotels for leisure travellers.',
    image: galleryRoyal[0] || '/images/home/hero.jpg',
  },
]

export default function TierExpansion() {
  return (
    <section className="section bg-cream tier-expansion">
      <div className="container">
        <SectionHeader overline="THE ROAD AHEAD" title="Expanding into three categories" align="center" />
        <p className="lead tier-expansion__lead">
          In future we will be expanding into three distinct categories, each built around a
          different kind of stay.
        </p>
        <Reveal className="tier-grid">
          {TIERS.map((tier) => (
            <article key={tier.name} className="tier-card">
              <div className="tier-card__media">
                <img src={tier.image} alt={tier.name} className="tier-card__img" loading="lazy" />
              </div>
              <div className="tier-card__body">
                <h3 className="h3 tier-card__title">{tier.name}</h3>
                <p className="tier-card__desc">{tier.description}</p>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
