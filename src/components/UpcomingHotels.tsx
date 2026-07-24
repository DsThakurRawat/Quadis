import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

import { UPCOMING_HOTELS } from '../data/hotels.ts'

export default function UpcomingHotels() {
  return (
    <section className="section bg-warm">
      <div className="container">
        <SectionHeader overline="EXPANDING OUR HORIZONS" title="Our Upcoming Hotels" />
        
        <Reveal className="upcoming-grid">
          {UPCOMING_HOTELS.map((hotel) => (
            <article key={hotel.name} className="upcoming-card">
              <div className="upcoming-card__media">
                {hotel.image ? (
                  <img src={hotel.image} alt={hotel.name} className="photo__img" loading="lazy" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                ) : (
                  <div className="photo__ph">
                    <span className="photo__ph-label">{hotel.name}</span>
                  </div>
                )}
                {hotel.badge && <span className="upcoming-card__badge">{hotel.badge}</span>}
              </div>
              <div className="upcoming-card__body">
                <h3 className="h3 upcoming-card__title">{hotel.name}</h3>
                <p className="upcoming-card__location">{hotel.location}</p>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
