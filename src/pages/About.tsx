import { aboutImages, galleryFacade, galleryRoyal, galleryDining } from '../data/images.ts'
import { HeroMedia, Photo } from '../components/media.tsx'
import { PhotoHero, SectionHeader, StatsStrip, CtaBand, Reveal } from '../components/blocks.tsx'

interface Value { title: string; body: string }
const VALUES: Value[] = [
  { title: 'Warm Service', body: 'Attentive without being intrusive. Our teams anticipate what a guest needs and quietly make it happen.' },
  { title: 'Prime Locations', body: 'Every property sits close to what matters — business districts, transit and the pulse of the neighbourhood.' },
  { title: 'Consistent Quality', body: 'The same considered comfort in every room, every venue, every visit across Delhi NCR.' },
]

export default function About() {
  const heroImg = aboutImages[0] ?? '/images/home/hero.jpg'
  const faImg = aboutImages[1] ?? galleryFacade[0] ?? '/images/home/hero.jpg'
  const leadershipImg = galleryFacade[1] ?? galleryFacade[0] ?? heroImg
  const welfareImg = galleryDining[0] ?? heroImg
  const airlinesImg = galleryFacade[2] ?? heroImg
  const homesImg = galleryRoyal[0] ?? heroImg

  return (
    <>
      <PhotoHero image={heroImg} title="About Us" sub="Quadis Services Private Limited — A tradition of considered comfort since 2017." height="short" />

      {/* Chapter 1: Story & Philosophy */}
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
              Today Quadis Services Private Limited is a premier hospitality group of hotels, elegant banquet halls and quality
              dining across Delhi NCR. We have grown deliberately, keeping the same attention to detail that
              defined the first room: refined stays, prime locations, and warm, attentive service.
            </p>
          </Reveal>

          <div className="quote-block">
            <blockquote className="quote-block__text">
              &ldquo;True luxury is not what you see around you—it is how calmly and genuinely you are looked after from the moment you step inside.&rdquo;
            </blockquote>
            <cite className="quote-block__cite">— The Quadis Guiding Principle</cite>
          </div>
        </div>
      </section>

      <section className="about-facade scrim" aria-label="A Quadis property at night">
        <HeroMedia src={faImg} alt="A Quadis property at night" />
      </section>

      {/* Chapter 2: No. 1 Hotel Chain & Service Leadership */}
      <section className="section bg-warm">
        <div className="container">
          <SectionHeader overline="SERVICE & SATISFACTION LEADER" title="Why Quadis is No. 1 in Delhi NCR" />
          
          <div className="vision-showcase grid-2">
            <Reveal className="vision-showcase__content">
              <h3 className="h3">More Than Room Count — A Standard of Excellence</h3>
              <p>
                While Quadis operates ten sought-after properties across Noida and New Delhi, our true measure of leadership has never been sheer volume. We measure our distinction through benchmark-setting guest satisfaction, repeat visitor loyalty, and operational reliability.
              </p>
              <p>
                Whether accommodating international delegations, hosting grand weddings, or providing a quiet sanctuary for corporate executives, our commitment remains uncompromising: zero friction, absolute cleanliness, and attentive human care.
              </p>
            </Reveal>
            <Reveal className="vision-showcase__media">
              <Photo src={leadershipImg} ratio="16 / 10" label="Quadis Service Leadership" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Chapter 3: Employee & Vendor Welfare */}
      <section className="section bg-dark welfare-section">
        <div className="container">
          <SectionHeader overline="ETHICAL HOSPITALITY" title="Employee &amp; Vendor Welfare" onDark />
          
          <div className="vision-showcase grid-2">
            <Reveal className="vision-showcase__media">
              <Photo src={welfareImg} ratio="16 / 10" label="Ethical Hospitality Foundation" />
            </Reveal>
            <Reveal className="vision-showcase__content on-dark">
              <h3 className="h3 on-dark">Our People Are Our Foundation</h3>
              <p className="on-dark">
                We believe that genuine hospitality cannot exist without dignified, empowered hosts. Quadis maintains industry-leading employee welfare programs, comprehensive healthcare, structured mentorship, and continuous professional development for all staff members.
              </p>
              <p className="on-dark">
                Equally, our ethical ecosystem extends to our vendor partners across Delhi NCR. Through fair contracts, timely payments, and sustainable local sourcing, we foster enduring partnerships that ensure unmatched quality in our kitchens, linens, and maintenance.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Chapter 4: Future Roadmap (Quadis Airlines & Quadis Homes) */}
      <section className="section bg-cream future-roadmap">
        <div className="container">
          <SectionHeader overline="LOOKING AHEAD" title="Future Horizons of Luxury" />
          <Reveal className="prose center-col mb-12">
            <p>
              As Quadis solidifies its position as the premier hospitality choice in Delhi NCR, our vision extends beyond traditional hotel stays into comprehensive luxury living and executive travel.
            </p>
          </Reveal>

          <div className="card-grid grid-2">
            <Reveal className="future-card">
              <div className="future-card__media">
                <Photo src={airlinesImg} ratio="16 / 9" label="Quadis Airlines Preview" />
                <span className="future-badge">UPCOMING INITIATIVE</span>
              </div>
              <div className="future-card__body">
                <h3 className="h3">Quadis Airlines<sup>™</sup></h3>
                <p>
                  Redefining regional transit with private aviation and executive air charter services. Designed for seamless door-to-door coordination where your luxury stay begins before you even touch down.
                </p>
              </div>
            </Reveal>

            <Reveal className="future-card">
              <div className="future-card__media">
                <Photo src={homesImg} ratio="16 / 9" label="Quadis Homes Preview" />
                <span className="future-badge">UPCOMING INITIATIVE</span>
              </div>
              <div className="future-card__body">
                <h3 className="h3">Quadis Homes<sup>™</sup></h3>
                <p>
                  Branded luxury residential living offering hotel-grade concierge, private culinary staff, and pristine housekeeping within exclusive private residences and long-stay suites.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Core Values */}
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
