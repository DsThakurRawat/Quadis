import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

interface UpcomingHotel {
  name: string
  location: string
  badge?: string
}

const UPCOMING_HOTELS: UpcomingHotel[] = [
  { name: 'OPO Hotel Rishikesh', location: 'Rishikesh, Uttarakhand', badge: 'COMING SOON' },
  { name: 'OPO Hotels Agra', location: 'Agra, Uttar Pradesh', badge: 'COMING SOON' },
  { name: 'OPO Hotels Chandigarh', location: 'Chandigarh, Punjab', badge: 'COMING SOON' },
  { name: 'OPO Hotels Dehradun', location: 'Dehradun, Uttarakhand', badge: 'COMING SOON' },
]

export default function UpcomingHotels() {
  return (
    <section className="section bg-warm">
      <div className="container">
        <SectionHeader overline="EXPANDING OUR HORIZONS" title="Our Upcoming Hotels" />
        
        <Reveal className="upcoming-grid">
          {UPCOMING_HOTELS.map((hotel) => (
            <article key={hotel.name} className="upcoming-card">
              <div className="upcoming-card__media">
                <div className="photo__ph">
                  <span className="photo__ph-label">{hotel.name}</span>
                </div>
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
