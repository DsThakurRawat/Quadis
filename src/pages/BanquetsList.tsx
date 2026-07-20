import { Link } from 'react-router-dom'
import { BANQUETS } from '../data/hotels.ts'
import { banquetImages, banquetHero } from '../data/images.ts'
import { PhotoHero, SectionHeader, CtaBand, Reveal } from '../components/blocks.tsx'
import { Button } from '../components/ui.tsx'
import { Photo } from '../components/media.tsx'
import { IconPin } from '../components/icons.tsx'

export default function BanquetsList() {
  return (
    <>
      <PhotoHero image={banquetHero[0]} overline="CELEBRATE WITH QUADIS" title="Banquets by Quadis" height="short" />

      <section className="section bg-cream">
        <div className="container">
          <SectionHeader overline="OUR VENUES" title="Elegant halls for every occasion" />
          <Reveal className="intro__body center-block">
            From intimate receptions to grand weddings, our banquet halls across Delhi NCR pair refined
            spaces with seamless catering and warm, attentive coordination.
          </Reveal>

          <div className="venue-grid">
            {BANQUETS.map((v) => (
              <article className="venue-card" key={v.slug}>
                <Link to={`/banquets/${v.slug}`} className="venue-card__media">
                  <Photo src={banquetImages(v.slug)[0]} ratio="16 / 10" label={v.name} alt={`${v.name} — ${v.area}, ${v.city}`} />
                </Link>
                <div className="venue-card__body">
                  <h3 className="h3">{v.name}</h3>
                  <p className="venue-card__cap">Up to {v.capacity} guests</p>
                  <p className="hcard__addr"><IconPin /> <span>{v.area}, {v.city}</span></p>
                  <Button to={`/banquets/${v.slug}`} variant="ghost" className="hcard__cta">EXPLORE VENUE</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Planning an occasion?" cta="ENQUIRE NOW" to="/banquets/banquets-at-hotel-cladis" />
    </>
  )
}
