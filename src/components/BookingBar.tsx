import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HOTELS, CITIES } from '../data/hotels.ts'

// §4 booking bar. Client-side: builds /hotels query until backend lands.
function Stepper({ label, value, setValue, min, max }: {
  label: string; value: number; setValue: (n: number) => void; min: number; max: number
}) {
  return (
    <div className="bbar__field">
      <span className="bbar__label">{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => setValue(Math.max(min, value - 1))} aria-label={`Decrease ${label}`} disabled={value <= min}>−</button>
        <span className="stepper__val" aria-live="polite">{value}</span>
        <button type="button" onClick={() => setValue(Math.min(max, value + 1))} aria-label={`Increase ${label}`} disabled={value >= max}>+</button>
      </div>
    </div>
  )
}

export default function BookingBar({ overlap = true }: { overlap?: boolean }) {
  const nav = useNavigate()
  const [dest, setDest] = useState('All')
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState(2)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (dest !== 'All') {
      const hotel = HOTELS.find((h) => h.slug === dest)
      p.set('city', hotel ? hotel.city : dest)
    }
    if (checkin) p.set('checkin', checkin)
    if (checkout) p.set('checkout', checkout)
    p.set('guests', String(guests))
    nav(`/hotels?${p.toString()}`)
  }

  return (
    <form className={`bbar ${overlap ? 'bbar--overlap' : ''}`} onSubmit={submit} aria-label="Search stays">
      <div className="bbar__field bbar__dest">
        <label className="bbar__label" htmlFor="bbar-dest">Destination</label>
        <select id="bbar-dest" className="bbar__input" value={dest} onChange={(e) => setDest(e.target.value)}>
          <option value="All">All properties</option>
          {CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          <optgroup label="By hotel">
            {HOTELS.map((h) => (<option key={h.slug} value={h.slug}>{h.name}</option>))}
          </optgroup>
        </select>
      </div>

      <div className="bbar__field">
        <label className="bbar__label" htmlFor="bbar-in">Check In</label>
        <input id="bbar-in" type="date" className="bbar__input" value={checkin}
          onChange={(e) => { setCheckin(e.target.value); if (checkout && e.target.value > checkout) setCheckout(e.target.value) }} />
      </div>

      <div className="bbar__field">
        <label className="bbar__label" htmlFor="bbar-out">Check Out</label>
        <input id="bbar-out" type="date" className="bbar__input" value={checkout} min={checkin || undefined}
          onChange={(e) => setCheckout(e.target.value)} />
      </div>

      <Stepper label="Guests" value={guests} setValue={setGuests} min={1} max={12} />

      <button type="submit" className="bbar__search">SEARCH STAYS</button>
    </form>
  )
}
