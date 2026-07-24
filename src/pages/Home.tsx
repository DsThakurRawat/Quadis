import { useMemo, useState } from 'react'
import { HOTELS } from '../data/hotels.ts'
import { heroShowcaseImages } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import BookingBar from '../components/BookingBar.tsx'
import Testimonials from '../components/Testimonials.tsx'
import { HotelCard, FilterPills, Button } from '../components/ui.tsx'
import { HeroVideoShowcase } from '../components/media.tsx'
import { SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'
import { IconWifi, IconTv, IconAc, IconShield, IconTowel, IconShower, IconToiletries, IconBell } from '../components/icons.tsx'

import UpcomingHotels from '../components/UpcomingHotels.tsx'
import DestinationsGrid from '../components/DestinationsGrid.tsx'
import BusinessCtaBanner from '../components/BusinessCtaBanner.tsx'
import OurOfferings from '../components/OurOfferings.tsx'
import DealsSection from '../components/DealsSection.tsx'
import FeaturedInAndOffers from '../components/FeaturedInAndOffers.tsx'
import HappyClientsSection from '../components/HappyClientsSection.tsx'



const PARTNERS = ['Blackcomb Springs', 'Hitachi', 'Polycab', 'Aditya Birla Grasim']
import { CITY_FILTERS } from '../data/hotels.ts'
export default function Home() {
  const [filter, setFilter] = useState<CityFilter>('All')

  const filtered = useMemo(
    () => (filter === 'All' ? HOTELS : HOTELS.filter((h) => h.city === filter)),
    [filter]
  )

  return (
    <>
      {/* 1. Master Welcome Hero: Video + Headline + Floating Booking Bar */}
      <section className="home-hero scrim" style={{ minHeight: '100vh', height: '100vh' }}>
        <HeroVideoShowcase posterUrl={heroShowcaseImages[0]} />
        <div className="container home-hero__content">
          <span className="overline on-dark">DELHI NCR · A GROUP OF HOTELS · SINCE 2017</span>
          <h2 className="h1 on-dark home-hero__title">Comfort you can<br />book in <span className="script on-dark">seconds.</span></h2>
          <p className="lead home-hero__sub">Ten thoughtfully run hotels across Noida & Delhi — refined rooms, warm service, and grand banquets, all a few taps from your stay.</p>
        </div>
      </section>

      {/* Booking Bar floating across bottom edge of Master Hero */}
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <BookingBar overlap={true} />
      </div>

      {/* 3. Stats Strip ("and 2nd one below photos") directly beneath Photo Showcase */}
      <StatsStrip />

      {/* 3. Intro statement - Removed as per PDF request */}
      
      {/* 4. Hotels */}
      <section className="section bg-warm">
        <div className="container">
          <SectionHeader overline="OUR PROPERTIES" title="Best Hotels in Delhi NCR" />
          <div className="home-hotels__pills">
            <FilterPills options={CITY_FILTERS.filter(f => f !== 'Upcoming')} value={filter} onChange={setFilter} ariaLabel="Filter hotels by city" />
          </div>
          <div className="card-grid card-grid--anim" key={filter}>
            {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
          </div>
        </div>
      </section>
      {/* 5. Great Sleep & Refreshing Showers Guarantee (§Stay Promise) */}
      <section className="section stay-promise-section bg-blue text-on-dark" style={{ margin: '40px auto', maxWidth: '1200px' }}>
        <div className="container" style={{ padding: '20px 0' }}>
          <Reveal className="stay-promise center-col">
            <span className="stay-promise__pill" style={{ background: '#366bc5', color: 'white', borderRadius: '4px', border: 'none', padding: '4px 12px', fontSize: '0.85rem' }}>Fabulous, or Free</span>
            <h2 className="h2 on-dark stay-promise__title" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '2.2rem', marginTop: '16px' }}>Great <span className="gold-text" style={{ color: '#ffc107' }}>sleep.</span> Refreshing <span className="gold-text" style={{ color: '#ffc107' }}>showers.</span></h2>
            <p className="lead stay-promise__sub" style={{ fontSize: '1rem', opacity: 0.9 }}>Hassle free stay, else we pay. <a href="#" style={{color: 'white', textDecoration: 'underline'}}>Know more.</a></p>
            
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

      {/* 7. Upcoming Hotels Section */}
      <UpcomingHotels />

      {/* 8. Destinations For You Section */}
      <DestinationsGrid />

      {/* 9. Deal Of The Day / Curated Offers */}
      <DealsSection />

      {/* 10. Featured In & Offers For You Section */}
      <FeaturedInAndOffers />

      {/* 11. Business & Franchisee CTA Banner */}

      <BusinessCtaBanner />

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

