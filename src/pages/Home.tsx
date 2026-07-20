import { useMemo, useState } from 'react'
import { HOTELS } from '../data/hotels.ts'
import { homeImages, hotelImages, banquetHero, restaurantImages } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import BookingBar from '../components/BookingBar.tsx'
import Testimonials from '../components/Testimonials.tsx'
import { HotelCard, FilterPills, Button } from '../components/ui.tsx'
import { Photo, HeroMedia } from '../components/media.tsx'
import { SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'

interface Experience { title: string; blurb: string; to: string; img: () => string | undefined }
const EXPERIENCES: Experience[] = [
  { title: 'Hotels by Quadis', blurb: 'Ten considered properties across Noida and New Delhi — calm rooms, prime locations, and warm, attentive service.', to: '/hotels', img: () => hotelImages('hotel-cladis-sector-51-noida')[0] },
  { title: 'Banquets by Quadis', blurb: 'Elegant halls for weddings, receptions and corporate gatherings, with seamless catering and coordination.', to: '/banquets', img: () => banquetHero[0] },
  { title: 'Restaurant by Quadis', blurb: 'In-house dining and outdoor catering — refined menus, generous flavours, and effortless hospitality.', to: '/restaurant', img: () => restaurantImages()[0] },
]

const PARTNERS = ['Blackcomb Springs', 'Hitachi', 'Polycab', 'Aditya Birla Grasim']
const CITY_FILTERS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi']

export default function Home() {
  const [filter, setFilter] = useState<CityFilter>('All')
  const hero = homeImages[0]

  const filtered = useMemo(
    () => (filter === 'All' ? HOTELS : HOTELS.filter((h) => h.city === filter)),
    [filter]
  )

  return (
    <>
      {/* 1. Hero + Booking bar */}
      <section className="home-hero scrim">
        <HeroMedia src={hero} />
        <div className="container home-hero__content">
          <span className="overline on-dark">DELHI NCR · A GROUP OF HOTELS · SINCE 2017</span>
          <h1 className="h1 on-dark home-hero__title">Comfort you can<br />book in <span className="script on-dark">seconds.</span></h1>
          <p className="lead home-hero__sub">Ten thoughtfully run hotels across Noida &amp; Delhi — refined rooms, warm service, and grand banquets, all a few taps from your stay.</p>
        </div>
        <div className="container home-hero__bar">
          <BookingBar overlap={false} />
        </div>
      </section>

      {/* 3. Stats strip */}
      <StatsStrip />

      {/* 4. Intro statement */}
      <section className="section bg-cream">
        <Reveal className="container intro center-col">
          <span className="script">A Way of Being</span>
          <p className="intro__body">
            Quadis is hospitality reconsidered — warm, confident and calm. Every property is designed
            around considered comfort, so a stay in Delhi NCR feels less like a transaction and more like being looked after.
          </p>
        </Reveal>
      </section>

      {/* 5. Hotels */}
      <section className="section bg-warm">
        <div className="container">
          <SectionHeader overline="OUR PROPERTIES" title="Best Hotels in Delhi NCR" />
          <div className="home-hotels__pills">
            <FilterPills options={CITY_FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter hotels by city" />
          </div>
          <div className="card-grid card-grid--anim" key={filter}>
            {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
          </div>

          <div className="quote-block mt-16">
            <blockquote className="quote-block__text">
              &ldquo;Whether staying for a night or celebrating for a lifetime, every detail across our 10 hotels is designed around calm, considered comfort.&rdquo;
            </blockquote>
            <cite className="quote-block__cite">— Quadis Hospitality Promise</cite>
          </div>
        </div>
      </section>

      {/* Ecosystem banner */}
      <section className="section bg-cream">
        <div className="container center-col">
          <SectionHeader overline="THE QUADIS ECOSYSTEM" title="A Vision Beyond Room Count" />
          <Reveal className="prose center-col mb-8">
            <p>
              As Delhi NCR&rsquo;s leading hospitality brand, our leadership is anchored in genuine guest satisfaction, rigorous employee welfare, and ambitious future horizons including <strong>Quadis Airlines</strong> and <strong>Quadis Homes</strong>.
            </p>
          </Reveal>
          <Button to="/about-us" variant="primary">EXPLORE OUR VISION &amp; ROADMAP</Button>
        </div>
      </section>

      {/* 6. Experiences */}
      <section className="section bg-dark">
        <div className="container">
          <SectionHeader overline="WE OFFER" title="Experiences by Quadis" onDark />
          <div className="card-grid exp-grid">
            {EXPERIENCES.map((e) => (
              <article className="exp-card" key={e.title}>
                <div className="exp-card__media"><Photo src={e.img()} ratio="4 / 3" label={e.title} /></div>
                <div className="exp-card__body">
                  <h3 className="h3 on-dark">{e.title}</h3>
                  <p className="exp-card__blurb">{e.blurb}</p>
                  <Button to={e.to} variant="ghost" className="exp-card__cta">KNOW MORE</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Testimonial */}
      <section className="section bg-cream">
        <div className="container testi">
          <div className="testi__head">
            <SectionHeader overline="CLIENTS REVIEW" title="What our guests say" align="left" flank={false} />
          </div>
          <Testimonials />
        </div>
      </section>

      {/* 8. Partners */}
      <section className="section bg-dark">
        <div className="container center-col stack" style={{ gap: '40px' }}>
          <SectionHeader overline="WE WORK WITH" title="Trusted by teams across NCR" onDark />
          <div className="partners">
            {PARTNERS.map((p) => (<span className="partner" key={p}>{p}</span>))}
          </div>
        </div>
      </section>

      {/* 9. CTA band */}
      <CtaBand />
    </>
  )
}
