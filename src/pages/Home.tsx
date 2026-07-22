import { useMemo, useState } from 'react'
import { HOTELS } from '../data/hotels.ts'
import { hotelImages, banquetHero, restaurantImages, heroShowcaseImages } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import BookingBar from '../components/BookingBar.tsx'
import Testimonials from '../components/Testimonials.tsx'
import { HotelCard, FilterPills, Button } from '../components/ui.tsx'
import { Photo, HeroShowcase, HeroVideoShowcase } from '../components/media.tsx'
import { SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'
import { IconWifi, IconTv, IconAc, IconShield, IconTowel, IconShower, IconToiletries, IconBell } from '../components/icons.tsx'

import UpcomingHotels from '../components/UpcomingHotels.tsx'
import DestinationsGrid from '../components/DestinationsGrid.tsx'
import BusinessCtaBanner from '../components/BusinessCtaBanner.tsx'
import OurOfferings from '../components/OurOfferings.tsx'
import DealsSection from '../components/DealsSection.tsx'
import FeaturedInAndOffers from '../components/FeaturedInAndOffers.tsx'
import HappyClientsSection from '../components/HappyClientsSection.tsx'

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
      {/* 1. Master Welcome Hero: Video + Headline + Floating Booking Bar */}
      <section className="home-hero scrim" style={{ minHeight: '560px', height: 'clamp(560px, 75vh, 700px)' }}>
        <HeroVideoShowcase posterUrl={heroShowcaseImages[0]} />
        <div className="container home-hero__content">
          <span className="overline on-dark">DELHI NCR · A GROUP OF HOTELS · SINCE 2017</span>
          <h2 className="h1 on-dark home-hero__title">Comfort you can<br />book in <span className="script on-dark">seconds.</span></h2>
          <p className="lead home-hero__sub">Ten thoughtfully run hotels across Noida &amp; Delhi — refined rooms, warm service, and grand banquets, all a few taps from your stay.</p>
        </div>
      </section>

      {/* Booking Bar floating across bottom edge of Master Hero */}
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <BookingBar overlap={true} />
      </div>

      {/* 2. Photo Showcase (Rotating photos) right under Booking Bar */}
      <section className="home-hero scrim" style={{ minHeight: '480px', height: 'clamp(460px, 62vh, 580px)', marginTop: '24px' }}>
        <HeroShowcase images={heroShowcaseImages} intervalMs={3000} />
        <div className="container home-hero__content">
          <span className="overline on-dark">A WAY OF BEING · CONSIDERED COMFORT</span>
          <h2 className="h1 on-dark home-hero__title">Refined rooms &amp;<br /><span className="script on-dark">grand banquets.</span></h2>
          <p className="lead home-hero__sub">Step into spaces crafted for calm, confident stays and unforgettable celebrations across our 10 premier locations.</p>
        </div>
      </section>

      {/* 3. Stats Strip ("and 2nd one below photos") directly beneath Photo Showcase */}
      <StatsStrip />

      {/* 3. Intro statement */}
      <section className="section bg-cream">
        <Reveal className="container intro center-col">
          <span className="script">A Way of Being</span>
          <p className="intro__body">
            Quadis is hospitality reconsidered — warm, confident and calm. Every property is designed
            around considered comfort, so a stay in Delhi NCR feels less like a transaction and more like being looked after.
          </p>
        </Reveal>
      </section>

      {/* 4. Hotels */}
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

      {/* 5. Great Sleep & Refreshing Showers Guarantee (§Stay Promise) */}
      <section className="section stay-promise-section bg-dark text-on-dark">
        <div className="container">
          <Reveal className="stay-promise center-col">
            <span className="stay-promise__pill">FABULOUS STAYS, GUARANTEED</span>
            <h2 className="h2 on-dark stay-promise__title">Great <span className="gold-text" style={{ color: 'var(--gold)' }}>sleep.</span> Refreshing <span className="gold-text" style={{ color: 'var(--gold)' }}>showers.</span></h2>
            <p className="lead stay-promise__sub">Hassle-free stay across all 10 Quadis properties in Delhi NCR. Know more.</p>
            
            <div className="stay-promise__icons">
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconWifi /></div>
                <span>Free Wi-Fi</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconTv /></div>
                <span>HD Smart TV</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconAc /></div>
                <span>Climate AC</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconShield /></div>
                <span>24x7 Security</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconTowel /></div>
                <span>Clean Towels</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconShower /></div>
                <span>Hot Water</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconToiletries /></div>
                <span>Toiletries</span>
              </div>
              <div className="stay-promise__icon-item">
                <div className="stay-promise__icon-circle"><IconBell /></div>
                <span>Room Service</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. Our Offerings Section */}
      <OurOfferings />

      {/* Experiences by Quadis */}
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

      {/* 7. Upcoming Hotels Section */}
      <UpcomingHotels />

      {/* 8. Destinations For You Section */}
      <DestinationsGrid />

      {/* 9. Business & Franchisee CTA Banner */}
      <BusinessCtaBanner />

      {/* 10. Deal Of The Day / Never Too Old Section */}
      <DealsSection />

      {/* 11. Featured In & Offers For You Section */}
      <FeaturedInAndOffers />

      {/* 12. Our Happy Clients & Trusted by 500,000+ Verified Guests */}
      <HappyClientsSection />

      {/* 13. Testimonials */}
      <section className="section bg-cream">
        <div className="container testi">
          <div className="testi__head">
            <SectionHeader overline="CLIENTS REVIEW" title="What our guests say" align="left" flank={false} />
          </div>
          <Testimonials />
        </div>
      </section>

      {/* 14. Ecosystem & Partners banner */}
      <section className="section bg-dark">
        <div className="container center-col stack" style={{ gap: '40px' }}>
          <SectionHeader overline="THE QUADIS ECOSYSTEM" title="A Vision Beyond Room Count" onDark />
          <Reveal className="prose center-col mb-4">
            <p>
              As Delhi NCR&rsquo;s leading hospitality brand, our leadership is anchored in genuine guest satisfaction, rigorous employee welfare, and ambitious future horizons including <strong>Quadis Airlines</strong> and <strong>Quadis Homes</strong>.
            </p>
          </Reveal>
          <div className="partners">
            {PARTNERS.map((p) => (<span className="partner" key={p}>{p}</span>))}
          </div>
          <Button to="/about-us" variant="primary">EXPLORE OUR VISION &amp; ROADMAP</Button>
        </div>
      </section>

      {/* 15. CTA band */}
      <CtaBand />
    </>
  )
}

