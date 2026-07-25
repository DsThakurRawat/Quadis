import { FOUNDED_YEAR } from '../data/site.ts'
import { Link } from 'react-router-dom'
import { IconFacebook, IconX, IconInstagram, IconLinkedin, IconPhone, IconMail, IconPin } from './icons.tsx'

interface FooterLink { label: string; to: string }
const HOTELS_LINKS: FooterLink[] = [
  { label: 'Hotel Amar Inn', to: '/hotels/hotel-amar-in' },
  { label: 'Hotel Amby Inn', to: '/hotels/hotel-amby-inn-lajpat-nagar-ii' },
  { label: 'Hotel Downtown', to: '/hotels/hotel-downtown-east-of-kailash' },
  { label: 'Hotel Cladis', to: '/hotels/hotel-cladis-sector-15-noida' },
  { label: 'Hotel Quadis', to: '/hotels/hotel-quadis-sector-51-noida' },
]
const IMPORTANT: FooterLink[] = [
  { label: 'Contact Us', to: '/contact' },
]

export default function Footer() {
  return (
    <footer className="footer bg-darkest">
      <div className="container footer__inner">
        <div className="footer__col footer__brand">
          <Link to="/" className="wordmark wordmark--footer">
            <span className="wordmark__main">QUADIS<sup>™</sup></span>
            <span className="wordmark__sub">HOTELS</span>
          </Link>
          <p className="footer__blurb">
            Quadis Services Private Limited is one of the leading hospitality brands in Delhi NCR,
            offering premium hotel stays, elegant banquet halls, and quality restaurant services.
          </p>
        </div>

        <nav className="footer__col" aria-label="Hotels">
          <h4 className="footer__head">HOTELS</h4>
          <ul className="footer__links">
            {HOTELS_LINKS.map((l) => (<li key={l.label}><Link to={l.to}>{l.label}</Link></li>))}
          </ul>
        </nav>

        <nav className="footer__col" aria-label="Important links">
          <h4 className="footer__head">IMPORTANT LINKS</h4>
          <ul className="footer__links">
            {IMPORTANT.map((l) => (<li key={l.label}><Link to={l.to}>{l.label}</Link></li>))}
          </ul>
        </nav>

        <div className="footer__col">
          <h4 className="footer__head">CONNECT WITH US</h4>
          <ul className="footer__links footer__contact">
            <li><a href="tel:+919217373532"><IconPhone /> <span>+91 92173 73532</span></a></li>
            <li><a href="mailto:info@quadishotels.com"><IconMail /> <span>info@quadishotels.com</span></a></li>
            <li className="footer__addr"><IconPin width={18} height={18} /> <span>H-22, LT SH Jagpal Singh, Sector-51, Noida, Gautam Buddha Nagar, UP 201307</span></li>
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <div className="footer__social" aria-label="Social links">
          <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><IconFacebook /></a>
          <a href="https://x.com" aria-label="X" target="_blank" rel="noopener noreferrer"><IconX /></a>
          <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><IconInstagram /></a>
          <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><IconLinkedin /></a>
        </div>
        <p className="footer__copy">© {FOUNDED_YEAR}–{new Date().getFullYear()} Quadis Services Private Limited. All Rights Reserved.</p>
      </div>
    </footer>
  )
}
