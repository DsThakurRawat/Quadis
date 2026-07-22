import { Reveal } from './blocks.tsx'
import { Button } from './ui.tsx'
import { IconShield, IconBreakfast } from './icons.tsx'

export default function BusinessCtaBanner() {
  return (
    <section className="section bg-warm">
      <div className="container">
        <Reveal className="business-cta-grid">
          {/* Card 1: Franchisee */}
          <div className="biz-card">
            <div className="biz-card__icon-wrap">
              <IconBreakfast className="biz-card__icon" />
            </div>
            <div className="biz-card__content">
              <h3 className="h3 biz-card__title">Be a Quadis Hotel Franchisee</h3>
              <p className="biz-card__text">
                We increase occupancy, lower your marketing costs, and help provide fabulous stays to your guests.
              </p>
              <Button to="/contactus" variant="primary" className="biz-card__btn">
                JOIN OUR FAMILY &rarr;
              </Button>
            </div>
          </div>

          {/* Card 2: Corporate Deals */}
          <div className="biz-card">
            <div className="biz-card__icon-wrap">
              <IconShield className="biz-card__icon" />
            </div>
            <div className="biz-card__content">
              <h3 className="h3 biz-card__title">Get Corporate Deals</h3>
              <p className="biz-card__text">
                Avail highly reliable and value for money stays for your employees at discounted rates.
              </p>
              <Button to="/corporate-hotel-booking" variant="primary" className="biz-card__btn">
                REQUEST SPECIAL RATES &rarr;
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
