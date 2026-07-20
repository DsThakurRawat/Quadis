import { aboutImages } from '../data/images.ts'
import { HeroMedia } from '../components/media.tsx'
import { PhotoHero, SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'

interface Value { title: string; body: string }
const VALUES: Value[] = [
  { title: 'Warm Service', body: 'Attentive without being intrusive. Our teams anticipate what a guest needs and quietly make it happen.' },
  { title: 'Prime Locations', body: 'Every property sits close to what matters — business districts, transit and the pulse of the neighbourhood.' },
  { title: 'Consistent Quality', body: 'The same considered comfort in every room, every venue, every visit across Delhi NCR.' },
]

export default function About() {
  const heroImg = aboutImages[0]
  const faImg = aboutImages[1]
  return (
    <>
      <PhotoHero image={heroImg} title="About Us" height="short" />

      <section className="section bg-cream">
        <div className="container center-col">
          <SectionHeader overline="QUADIS HOTELS GROUP" title="Comfort, made effortless" />
          <Reveal className="prose center-col">
            <p>
              Quadis began in 2017 as a single venture with a simple conviction — that a stay should feel
              considered, not transactional. That first property became the blueprint for a way of doing
              hospitality that is warm, confident and calm.
            </p>
            <p>
              Today Quadis Services Private Limited is a group of hotels, elegant banquet halls and quality
              dining across Delhi NCR. We have grown deliberately, keeping the same attention to detail that
              defined the first room: refined stays, prime locations, and warm, attentive service.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-facade scrim" aria-label="A Quadis property at night">
        <HeroMedia src={faImg} alt="A Quadis property at night" />
      </section>

      <section className="section bg-warm">
        <div className="container">
          <SectionHeader overline="WHAT WE STAND FOR" title="A considered way of hosting" />
          <div className="card-grid values-grid">
            {VALUES.map((v) => (
              <Reveal key={v.title} className="value-card">
                <span className="value-card__rule" aria-hidden="true" />
                <h3 className="h3">{v.title}</h3>
                <p>{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StatsStrip />
      <CtaBand />
    </>
  )
}
