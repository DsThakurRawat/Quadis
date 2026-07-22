import { useMemo, useState } from 'react'
import { HOTELS } from '../data/hotels.ts'
import { hotelImages, banquetHero, restaurantImages, heroShowcaseImages } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import BookingBar from '../components/BookingBar.tsx'
import Testimonials from '../components/Testimonials.tsx'
import { HotelCard, FilterPills, Button } from '../components/ui.tsx'
import { Photo, HeroShowcase } from '../components/media.tsx'
import { SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'
import { IconWifi, IconTv, IconAc, IconShield, IconTowel, IconShower, IconToiletries, IconBell } from '../components/icons.tsx'

import UpcomingHotels from '../components/UpcomingHotels.tsx'
import DestinationsGrid from '../components/DestinationsGrid.tsx'
import BusinessCtaBanner from '../components/BusinessCtaBanner.tsx'

interface Experience { title: string; blurb: string; to: string; img: () => string | undefined }
const EXPERIENCES: Experience[] = [
  { title: 'Hotels by Quadis', blurb: 'Ten considered properties across Noida and New Delhi — calm rooms, prime locations, and warm, attentive service.', to: '/hotels', img: () => hotelImages('hotel-cladis-sector-51-noida')[0] },
  { title: 'Banquets by Quadis', blurb: 'Elegant halls for weddings, receptions and corporate gatherings, with seamless catering and coordination.', to: '/banquets', img: () => banquetHero[0] },
  { title: 'Restaurant by Quadis', blurb: 'In-house dining and outdoor catering — refined menus, generous flavours, and effortless hospitality.', to: '/restaurant', img: () => restaurantImages()[0] },
]

const PARTNERS = ['Blackcomb Springs', 'Hitachi', 'Polycab', 'Aditya Birla Grasim']
const CITY_FILTERS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi', 'Upcoming']

export default function Home() {
  const [filter, setFilter] = useState<CityFilter>('All')

  const filtered = useMemo(
    () => (filter === 'All' ? HOTELS : HOTELS.filter((h) => h.city === filter)),
    [filter]
  )

  return (
    <>
      {/* 1. Hero + Booking bar */}
      <section className="home-hero scrim">
        <HeroShowcase images={heroShowcaseImages} intervalMs={3000} />
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
          <SectionHeader overline="OUR PROPERTIES" title={filter === 'Upcoming' ? 'Our Upcoming Hotels' : 'Best Hotels in Delhi NCR'} />
          <div className="home-hotels__pills">
            <FilterPills options={CITY_FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter hotels by city" />
          </div>
          {filter === 'Upcoming' ? (
            <div className="upcoming-grid mt-8">
              {[
                { name: 'OPO Hotel Rishikesh', location: 'Rishikesh, Uttarakhand' },
                { name: 'OPO Hotels Agra', location: 'Agra, Uttar Pradesh' },
                { name: 'OPO Hotels Chandigarh', location: 'Chandigarh, Punjab' },
                { name: 'OPO Hotels Dehradun', location: 'Dehradun, Uttarakhand' },
              ].map((h) => (
                <article key={h.name} className="upcoming-card">
                  <div className="upcoming-card__media">
                    <div className="photo__ph">
                      <span className="photo__ph-label">{h.name}</span>
                    </div>
                    <span className="upcoming-card__badge">COMING SOON</span>
                  </div>
                  <div className="upcoming-card__body">
                    <h3 className="h3 upcoming-card__title">{h.name}</h3>
                    <p className="upcoming-card__location">{h.location}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card-grid card-grid--anim" key={filter}>
              {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
            </div>
          )}
        </div>
      </section>

      {/* Great Sleep & Refreshing Showers Guarantee */}
      <section className="section stay-promise-section bg-dark text-on-dark">
        <div className="container">
          <Reveal className="stay-promise center-col">
            <span className="overline gold-accent">FABULOUS STAYS, GUARANTEED</span>
            <h2 className="h2 on-dark stay-promise__title">Great <span className="gold-text">sleep.</span> Refreshing <span className="gold-text">showers.</span></h2>
            <p className="lead stay-promise__sub">Hassle-free stay across all 10 Quadis properties in Delhi NCR.</p>
            
            <div className="stay-essentials-grid">
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconWifi /></div>
                <span className="stay-essential-label">Free Wi-Fi</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconTv /></div>
                <span className="stay-essential-label">HD Smart TV</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconAc /></div>
                <span className="stay-essential-label">Climate AC</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconShield /></div>
                <span className="stay-essential-label">24x7 Security</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconTowel /></div>
                <span className="stay-essential-label">Clean Towels</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconShower /></div>
                <span className="stay-essential-label">Hot Water</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconToiletries /></div>
                <span className="stay-essential-label">Toiletries</span>
              </div>
              <div className="stay-essential-card">
                <div className="stay-essential-icon"><IconBell /></div>
                <span className="stay-essential-label">Room Service</span>
              </div>
            </div>
          </Reveal>
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

      {/* 7. Upcoming Hotels */}
      <UpcomingHotels />

      {/* 8. Destinations For You */}
      <DestinationsGrid />

      {/* 9. Business & Franchisee CTA Banner */}
      <BusinessCtaBanner />

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
