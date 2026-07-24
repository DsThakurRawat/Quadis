import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

interface Destination {
  name: string
  image: string
  status?: 'active' | 'coming_soon'
}

const DESTINATIONS: Destination[] = [
  { name: 'Delhi', image: '/images/upcoming/delhi.jpg', status: 'active' },
  { name: 'Gurgaon', image: '/images/upcoming/gurgaon.jpg', status: 'active' },
  { name: 'Rishikesh', image: '/images/upcoming/rishikesh.png', status: 'coming_soon' },
  { name: 'Chandigarh', image: '/images/upcoming/chandigarh.jpg', status: 'coming_soon' },
  { name: 'Noida', image: '/images/facade/facade.png', status: 'active' },
  { name: 'Manesar', image: '/images/upcoming/manesar.png', status: 'active' },
  { name: 'Faridabad', image: '/images/upcoming/faridabad.png', status: 'active' },
  { name: 'Bengaluru', image: '/images/home/hero.jpg', status: 'coming_soon' },
]

export default function DestinationsGrid() {
  return (
    <section className="section bg-cream">
      <div className="container">
        <SectionHeader overline="" title="Destinations For You" />

        <Reveal className="destinations-grid">
          {DESTINATIONS.map((dest) => (
            <div key={dest.name} className={`dest-stamp ${dest.status === 'coming_soon' ? 'dest-stamp--coming' : ''}`}>
              <div className="dest-stamp__frame">
                <div className="dest-stamp__inner">
                  <img src={dest.image} alt={dest.name} loading="lazy" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                </div>
                {dest.status === 'coming_soon' && (
                  <span className="dest-stamp__badge">COMING SOON</span>
                )}
              </div>
              <span className="dest-stamp__name">{dest.name}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
