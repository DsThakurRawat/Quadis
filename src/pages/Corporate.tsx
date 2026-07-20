import { corporateImages } from '../data/images.ts'
import { CITIES } from '../data/hotels.ts'
import type { CorporateRFPPayload } from '../types.ts'
import { PhotoHero, SectionHeader, Reveal } from '../components/blocks.tsx'
import { Photo } from '../components/media.tsx'
import { Field, Button } from '../components/ui.tsx'
import { useForm, SuccessPanel, isEmail, isPhone, required } from '../components/forms.tsx'

interface Benefit { title: string; body: string }
const BENEFITS: Benefit[] = [
  { title: 'Negotiated Rates', body: 'Consistent, transparent corporate pricing across every Quadis property in Delhi NCR.' },
  { title: 'Priority Availability', body: 'Reserved allocations and faster confirmations for your travelling teams.' },
  { title: 'Single Invoice', body: 'Consolidated, GST-compliant billing — one statement across stays and cities.' },
]

export default function Corporate() {
  const heroImg = corporateImages[0]
  const sideImg = corporateImages[1] ?? corporateImages[0]

  const f = useForm<CorporateRFPPayload>(
    { company: '', person: '', email: '', phone: '', city: '', rooms: '', message: '' },
    (v) => {
      const e: Partial<Record<keyof CorporateRFPPayload, string>> = {}
      if (!required(v.company)) e.company = 'Company name required'
      if (!required(v.person)) e.person = 'Contact person required'
      if (!isEmail(v.email)) e.email = 'Enter a valid email'
      if (!isPhone(v.phone)) e.phone = 'Enter a valid 10-digit phone'
      if (!required(v.city)) e.city = 'Select a city'
      return e
    }
  )

  return (
    <>
      <PhotoHero image={heroImg} overline="FOR BUSINESS TRAVEL" title="Corporate Hotel Booking" height="short" />

      <section className="section bg-cream">
        <div className="container corp-split">
          <div className="corp-copy">
            <span className="overline">Your Reliable Partner for Corporate Accommodation</span>
            <h2 className="h2">Dependable stays for your teams</h2>
            <p className="prose__p">
              Quadis partners with businesses across Delhi NCR to make corporate travel effortless. Our properties
              sit in prime business districts, with fast Wi-Fi, GST invoicing and flexible terms designed around how teams actually travel.
            </p>
            <p className="prose__p">
              Whether it is a single visiting executive or a rolling monthly requirement, you get one point of
              contact, consistent quality and transparent billing.
            </p>
          </div>
          <Reveal className="corp-photo">
            <Photo src={sideImg} ratio="4 / 3" label="Quadis Lobby" alt="Quadis hotel lobby" />
          </Reveal>
        </div>
      </section>

      <section className="section bg-warm">
        <div className="container">
          <SectionHeader overline="WHY QUADIS FOR BUSINESS" title="Built for corporate travel" />
          <div className="card-grid values-grid">
            {BENEFITS.map((b) => (
              <Reveal key={b.title} className="value-card">
                <span className="value-card__rule" aria-hidden="true" />
                <h3 className="h3">{b.title}</h3>
                <p>{b.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container form-wrap">
          <SectionHeader overline="REQUEST A PROPOSAL" title="Request corporate rates" />
          {f.done ? (
            <SuccessPanel title="Request received" onReset={f.reset}>
              Thank you — our corporate desk will respond with negotiated rates and terms shortly.
            </SuccessPanel>
          ) : (
            <form className="form-grid form-grid--card" onSubmit={f.submit()} noValidate>
              <Field label="Company" value={f.values.company} onChange={f.set('company')} error={f.errors.company} />
              <Field label="Contact person" value={f.values.person} onChange={f.set('person')} error={f.errors.person} />
              <Field label="Email" type="email" value={f.values.email} onChange={f.set('email')} error={f.errors.email} />
              <Field label="Phone" type="tel" value={f.values.phone} onChange={f.set('phone')} error={f.errors.phone} />
              <Field label="City" as="select" value={f.values.city} onChange={f.set('city')} error={f.errors.city}>
                <option value="">Select city</option>
                {CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </Field>
              <Field label="Rooms / month (approx.)" type="number" min="1" value={f.values.rooms} onChange={f.set('rooms')} />
              <Field label="Message" as="textarea" className="form-grid__full" value={f.values.message} onChange={f.set('message')} placeholder="Tell us about your travel patterns and requirements…" />
              <div className="form-grid__full">
                <Button as="button" type="submit" variant="primary" disabled={f.pending}>{f.pending ? 'Sending…' : 'REQUEST CORPORATE RATES'}</Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
