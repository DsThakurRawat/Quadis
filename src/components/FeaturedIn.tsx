import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'
import { verifiedPressLogos } from '../data/logos.ts'

/**
 * Press coverage. Renders only entries that carry a live article URL, so the
 * section cannot assert coverage the group cannot point at. With no verified
 * entries it renders nothing at all rather than an empty band.
 *
 * Blocked on the client for article URLs and dates — see changes.md.
 */
export default function FeaturedIn() {
  const logos = verifiedPressLogos()
  if (logos.length === 0) return null

  return (
    <section className="featured-section">
      <div className="container">
        <div className="featured-press-container">
          <SectionHeader overline="PRESS & ACCLAIM" title="Featured In" />
          <Reveal className="press-logos-grid">
            {logos.map((logo) => (
              <a
                key={logo.name}
                className="press-logo-card"
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${logo.name} coverage of Quadis Hotels`}
              >
                <img className="logo-mark" src={logo.src} alt={logo.name} loading="lazy" />
                {logo.date && <span className="press-logo-card__date">{logo.date}</span>}
              </a>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
