import { restaurantImages, cateringImages } from '../data/images.ts'
import { PhotoHero, SectionHeader, CtaBand, Reveal } from '../components/blocks.tsx'
import { Button } from '../components/ui.tsx'
import { Photo } from '../components/media.tsx'

interface Offering { title: string; blurb: string; img?: string | undefined; to: string; cta: string }

export default function Restaurant() {
  const rImgs = restaurantImages()
  const cImgs = cateringImages()

  const OFFERINGS: Offering[] = [
    {
      title: 'In-house Restaurant',
      blurb: 'Refined all-day dining inside our properties — generous flavours, considered menus and warm, unhurried service.',
      img: rImgs[0],
      to: '/restaurant',
      cta: 'VIEW MENU',
    },
    {
      title: 'Outdoor Catering Service',
      blurb: 'Full-service catering for events and celebrations across Delhi NCR, with seamless coordination from menu to service.',
      img: cImgs[0] ?? rImgs[1],
      to: '/restaurant/outdoor-catering-service',
      cta: 'EXPLORE CATERING',
    },
  ]

  return (
    <>
      <PhotoHero image={rImgs[0]} overline="TASTE THE QUADIS WAY" title="Dining by Quadis" height="short" />

      <section className="section bg-cream">
        <div className="container">
          <SectionHeader overline="WHAT'S ON OFFER" title="Considered food, warm service" />
          <Reveal className="intro__body center-block">
            From relaxed in-house dining to full-service outdoor catering, Quadis brings the same attention to
            detail to the table as it does to the room.
          </Reveal>

          <div className="offer-grid">
            {OFFERINGS.map((o) => (
              <article className="offer-card" key={o.title}>
                <div className="offer-card__media"><Photo src={o.img} ratio="16 / 10" label={o.title} /></div>
                <div className="offer-card__body">
                  <h3 className="h3">{o.title}</h3>
                  <p className="prose__p">{o.blurb}</p>
                  <Button to={o.to} variant="ghost" className="hcard__cta">{o.cta}</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Hosting something special?" cta="ENQUIRE ON WHATSAPP" to="/restaurant/outdoor-catering-service" />
    </>
  )
}
