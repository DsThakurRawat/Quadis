import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'
import { IconPin } from './icons.tsx'

interface Destination {
  name: string
  code: string
  status?: 'active' | 'coming_soon'
}

const DESTINATIONS: Destination[] = [
  { name: 'Delhi', code: 'DEL', status: 'active' },
  { name: 'Gurgaon', code: 'GUR', status: 'active' },
  { name: 'Rishikesh', code: 'RSH', status: 'coming_soon' },
  { name: 'Chandigarh', code: 'CHD', status: 'coming_soon' },
  { name: 'Noida', code: 'NOI', status: 'active' },
  { name: 'Manesar', code: 'MNR', status: 'active' },
  { name: 'Faridabad', code: 'FBD', status: 'active' },
  { name: 'Bengaluru', code: 'BLR', status: 'coming_soon' },
]

export default function DestinationsGrid() {
  return (
    <section className="section bg-cream">
      <div className="container">
        <SectionHeader overline="EXPLORE INDIA" title="Destinations For You" />

        <Reveal className="destinations-grid">
          {DESTINATIONS.map((dest) => (
            <div key={dest.name} className={`dest-stamp ${dest.status === 'coming_soon' ? 'dest-stamp--coming' : ''}`}>
              <div className="dest-stamp__frame">
                <div className="dest-stamp__inner">
                  <IconPin className="dest-stamp__pin" />
                  <span className="dest-stamp__code">{dest.code}</span>
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
