import { GUESTS_SERVED_CLAIM } from '../data/site.ts'
import { PARTNER_LOGOS } from '../data/logos.ts'
import { SectionHeader } from './ui.tsx'
import { Reveal } from './blocks.tsx'

const VERIFIED_GUEST_REVIEWS = [
  {
    quote: 'Good room sizes and very well maintained bathroom. Very welcoming staff and professional service quality with nice behaviour of room service operator.',
    name: 'Ramesh Kumar',
    meta: 'Stayed at Quadis Sector 51 Noida',
    rating: '5.0 ★',
  },
  {
    quote: 'Excellent location, well connected to all important places. Clean, comfortable property with very nice and helpful staff. Overall, a very comfortable stay.',
    name: "Sanjeev Talwar",
    meta: 'Stayed at Quadis Sector 15 Noida',
    rating: '4.8 ★',
  },
  {
    quote: "I appreciate the environmentally friendly practices of the hotel. It's good to see them taking steps towards sustainability and providing clean linen daily.",
    name: 'Miss Shubdha',
    meta: 'Stayed at Quadis Sector 51 Noida',
    rating: '5.0 ★',
  },
]

export default function HappyClientsSection() {
  return (
    <section className="section bg-cream py-12">
      <div className="container">
        {/* Our Happy Clients */}
        <div className="happy-clients-container">
          <SectionHeader overline="CORPORATE TRUST" title="Our Happy Clients" />
          <p className="intro__body mb-10 text-center">
            Proudly hosting executives and corporate teams from India&rsquo;s most respected enterprises.
          </p>
          <Reveal className="happy-clients-logos">
            {PARTNER_LOGOS.map((client) => (
              <div key={client.name} className="happy-client-logo-card">
                <img className="logo-mark" src={client.src} alt={client.name} loading="lazy" />
              </div>
            ))}
          </Reveal>
        </div>

        <div className="guest-experience-banner">
          <div className="guest-experience-header">
            <div>
              <span className="guest-experience-overline">GUEST EXPERIENCE</span>
              <h3 className="h3 on-dark" style={{ marginTop: '4px' }}>
                Trusted by <span className="gold-text">{GUESTS_SERVED_CLAIM}</span> verified guests
              </h3>
            </div>
            <div className="guest-experience-stats">
              <span className="stat-rating">★ 4.5 Rating</span>
              <span className="stat-divider">|</span>
              <span className="stat-repeat">95% Repeat Guests</span>
            </div>
          </div>

          <div className="guest-reviews-grid">
            {VERIFIED_GUEST_REVIEWS.map((review) => (
              <div key={review.name} className="guest-review-card">
                <p className="guest-review-quote">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="guest-review-footer">
                  <div>
                    <h4 className="guest-review-name">{review.name}</h4>
                    <p className="guest-review-meta">{review.meta}</p>
                  </div>
                  <span className="guest-review-rating">
                    {review.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
