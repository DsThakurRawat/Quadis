import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import type { MealPlan } from '../types.ts'
import { HOTELS, priceNight, inr, getHotelRooms } from '../data/hotels.ts'
import { hotelImages, roomImages } from '../data/images.ts'
import { HotelCard, Button } from '../components/ui.tsx'
import { CtaBand } from '../components/blocks.tsx'
import Gallery from '../components/Gallery.tsx'
import { Photo } from '../components/media.tsx'
import { IconPin, IconStar, IconWifi, IconAc, IconBreakfast, IconParking, IconDesk, IconRoom } from '../components/icons.tsx'
import NotFound from './NotFound.tsx'
import { CheckoutModal } from '../components/CheckoutModal.tsx'

interface Amenity { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }
const AMENITIES: Amenity[] = [
  { icon: IconWifi, label: 'Free Wi-Fi' },
  { icon: IconAc, label: 'Air Conditioning' },
  { icon: IconBreakfast, label: 'Breakfast' },
  { icon: IconParking, label: 'Parking' },
  { icon: IconDesk, label: '24h Front Desk' },
  { icon: IconRoom, label: 'Room Service' },
]

function nights(a: string, b: string): number {
  if (!a || !b) return 0
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  return d > 0 ? Math.round(d) : 0
}

export default function HotelDetail() {
  const { slug } = useParams()
  const hotel = HOTELS.find((h) => h.slug === slug)
  const images = slug ? hotelImages(slug) : []
  const hotelRooms = useMemo(() => (hotel ? getHotelRooms(hotel) : []), [hotel])

  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [rooms, setRooms] = useState(1)
  const [guests, setGuests] = useState(2)
  const [confirmed, setConfirmed] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan>('Room Only')
  const [cardMealPlans, setCardMealPlans] = useState<Record<string, MealPlan>>({})
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)

  const nearby = useMemo(() => {
    if (!hotel) return []
    const same = HOTELS.filter((h) => h.slug !== slug && h.city === hotel.city)
    const pool = same.length >= 3 ? same : HOTELS.filter((h) => h.slug !== slug)
    return pool.slice(0, 3)
  }, [hotel, slug])

  if (!hotel) return <NotFound />

  const activeRoom = hotelRooms.find((r) => r.id === selectedRoomId) ?? hotelRooms[0] ?? null
  const activeMeal = activeRoom?.mealOptions.find((m) => m.plan === selectedMealPlan) ?? activeRoom?.mealOptions[0] ?? { plan: 'Room Only' as MealPlan, priceOffset: 0 }
  const roomOffset = activeRoom?.basePriceOffset ?? 0
  const mealOffset = activeMeal?.priceOffset ?? 0
  const effectiveNightPrice = hotel.price + roomOffset + mealOffset

  const n = nights(checkin, checkout)
  const total = n * rooms * effectiveNightPrice
  const mapQuery = encodeURIComponent(`${hotel.name}, ${hotel.address}`)

  const book = (e: React.FormEvent) => {
    e.preventDefault()
    setShowCheckoutModal(true)
  }

  return (
    <>
      <section className="section bg-cream detail-top">
        <div className="container">
          <Link to="/hotels" className="back-link">← All hotels</Link>
          <Gallery images={images} alt={hotel.name} />

          <div className="detail-head">
            <div>
              <h1 className="h2 detail-head__name">{hotel.name}</h1>
              <p className="detail-head__addr">
                <IconPin /> <span>{hotel.address}</span>
                <a className="map-link" href={`https://maps.google.com/?q=${mapQuery}`} target="_blank" rel="noreferrer">View on map</a>
              </p>
            </div>
            <div className="detail-head__meta">
              <span className="detail-head__rating"><IconStar /> {hotel.rating.toFixed(1)}</span>
              <span className="detail-head__price">{priceNight(effectiveNightPrice)}</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-main">
              <section className="detail-block">
                <span className="overline">AMENITIES</span>
                <div className="amenities">
                  {AMENITIES.map(({ icon: Icon, label }) => (
                    <div className="amenity" key={label}><Icon /> <span>{label}</span></div>
                  ))}
                </div>
              </section>

              <section className="detail-block">
                <span className="overline">AVAILABLE ACCOMMODATIONS</span>
                <h2 className="h3" style={{ marginTop: 6, marginBottom: 20 }}>Choose your room</h2>
                <div className="rooms-grid">
                  {hotelRooms.map((r) => {
                    const rPhotos = slug ? roomImages(slug, r.id) : []
                    const activeMealForCard = r.mealOptions.find((m) => m.plan === (cardMealPlans[r.id] ?? selectedMealPlan)) ?? r.mealOptions[0] ?? { plan: 'Room Only' as MealPlan, priceOffset: 0 }
                    const cardPrice = hotel.price + r.basePriceOffset + activeMealForCard.priceOffset
                    const isSelected = activeRoom && activeRoom.id === r.id && selectedMealPlan === activeMealForCard.plan

                    return (
                      <article className={`room-card ${isSelected ? 'room-card--selected' : ''}`} key={r.id}>
                        <div className="room-card__img">
                          <Photo src={rPhotos[0]} ratio="16 / 10" label={r.name} alt={r.name} />
                        </div>
                        <div className="room-card__body">
                          <div className="room-card__head">
                            <div>
                              <h3 className="h4 room-card__title">{r.name}</h3>
                              <p className="room-card__specs">
                                <span>{r.size}</span> • <span>{r.bed}</span> • <span>Up to {r.maxGuests} guests</span>
                              </p>
                            </div>
                            <div className="room-card__price">
                              <strong>{inr(cardPrice)}</strong>
                              <span>/ night</span>
                            </div>
                          </div>
                          <p className="room-card__desc">{r.description}</p>
                          <div className="room-card__meals">
                            <span className="room-card__meals-label">Meal options:</span>
                            <div className="room-card__meal-chips">
                              {r.mealOptions.map((m) => {
                                const chipSelected = activeMealForCard.plan === m.plan
                                return (
                                  <button
                                    key={m.plan}
                                    type="button"
                                    className={`meal-chip ${chipSelected ? 'is-active' : ''}`}
                                    onClick={() => setCardMealPlans((prev) => ({ ...prev, [r.id]: m.plan }))}
                                  >
                                    {m.plan} {m.priceOffset > 0 ? `(+${inr(m.priceOffset)})` : ''}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <div className="room-card__cta">
                            <Button
                              variant={isSelected ? 'primary' : 'ghost'}
                              onClick={() => {
                                setSelectedRoomId(r.id)
                                setSelectedMealPlan(activeMealForCard.plan)
                              }}
                            >
                              {isSelected ? 'SELECTED ✓' : 'SELECT ROOM'}
                            </Button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="detail-block">
                <span className="overline">ABOUT THIS HOTEL</span>
                <h2 className="h3">Considered comfort in {hotel.area}</h2>
                <p className="prose__p">
                  {hotel.name} offers refined, well-appointed rooms in {hotel.area}, {hotel.city} — a calm base
                  with warm, attentive service and easy access to the neighbourhood. Every stay is designed
                  around considered comfort: quiet rooms, thoughtful amenities and a team that anticipates what you need.
                </p>
                <p className="prose__p">
                  Located at {hotel.address}, the property is well connected for both leisure and business travellers
                  across Delhi NCR.
                </p>

                <div className="quote-block mt-8">
                  <blockquote className="quote-block__text">
                    &ldquo;Every stay in {hotel.name} is underpinned by our commitment to attentive human warmth, spotless rooms, and effortless booking.&rdquo;
                  </blockquote>
                  <cite className="quote-block__cite">— Quadis Guest Satisfaction Standard</cite>
                </div>
              </section>

              <section className="detail-block">
                <span className="overline">LOCATION</span>
                <div className="map-embed">
                  <iframe
                    title={`Map of ${hotel.name}`}
                    src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </section>
            </div>

            {/* Sticky booking card */}
            <aside className="book-card">
              <form onSubmit={book}>
                <div className="book-card__summary">
                  <p className="book-card__price"><strong>{inr(effectiveNightPrice)}</strong> <span>/ night</span></p>
                  {activeRoom && (
                    <p className="book-card__selection">
                      Selected: <strong>{activeRoom.name}</strong> • <em>{activeMeal.plan}</em>
                    </p>
                  )}
                </div>
                <div className="book-card__row">
                  <label className="field">
                    <span className="field__label">Check-in</span>
                    <input type="date" className="field__input" value={checkin}
                      onChange={(e) => { setCheckin(e.target.value); if (checkout && e.target.value > checkout) setCheckout(e.target.value) }} required />
                  </label>
                  <label className="field">
                    <span className="field__label">Check-out</span>
                    <input type="date" className="field__input" value={checkout} min={checkin || undefined}
                      onChange={(e) => setCheckout(e.target.value)} required />
                  </label>
                </div>
                <div className="book-card__row">
                  <label className="field">
                    <span className="field__label">Rooms</span>
                    <select className="field__input" value={rooms} onChange={(e) => setRooms(+e.target.value)}>
                      {[1, 2, 3, 4, 5].map((r) => (<option key={r} value={r}>{r}</option>))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Guests</span>
                    <select className="field__input" value={guests} onChange={(e) => setGuests(+e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                  </label>
                </div>

                <div className="book-card__total">
                  <span>{n > 0 ? `${inr(effectiveNightPrice)} × ${n} night${n > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''}` : 'Select your dates'}</span>
                  <strong>{n > 0 ? inr(total) : '—'}</strong>
                </div>

                <Button as="button" type="submit" variant="primary" className="book-card__cta">BOOK NOW</Button>
                {confirmed && (
                  <p className="book-card__ok" role="status">
                    Request received — our team will confirm availability shortly.
                  </p>
                )}
              </form>
            </aside>
          </div>
        </div>
      </section>

      <section className="section bg-warm">
        <div className="container">
          <span className="overline">YOU MIGHT ALSO LIKE</span>
          <h2 className="h2" style={{ marginTop: 8, marginBottom: 32 }}>Nearby stays</h2>
          <div className="card-grid">
            {nearby.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
          </div>
        </div>
      </section>

      <CtaBand />

      {showCheckoutModal && activeRoom && (
        <CheckoutModal
          propertySlug={hotel.slug}
          propertyName={hotel.name}
          propertyAddress={hotel.address}
          roomTypeSlug={activeRoom.id}
          roomTypeName={activeRoom.name}
          checkIn={checkin}
          checkOut={checkout}
          roomsCount={rooms}
          guestsCount={guests}
          totalAmount={total}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={(code) => {
            console.log('Payment successful for booking:', code)
            setConfirmed(true)
          }}
        />
      )}
    </>
  )
}
