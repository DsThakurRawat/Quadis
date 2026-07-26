import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useHotels, CITY_FILTERS } from '../data/hotels.ts'
import { hotelsHero } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import { HotelCard, FilterPills } from '../components/ui.tsx'
import { HeroMedia } from '../components/media.tsx'
import { CtaBand } from '../components/blocks.tsx'
import UpcomingHotels from '../components/UpcomingHotels.tsx'
import TierExpansion from '../components/TierExpansion.tsx'
import NcrLocatorMap from '../components/NcrLocatorMap.tsx'

const isCityFilter = (v: string | null): v is CityFilter => !!v && (CITY_FILTERS as readonly string[]).includes(v)

export default function HotelsList() {
  const [params, setParams] = useSearchParams()
  const cityParam = params.get('city')
  const [cityFilter, setCityFilter] = useState<CityFilter>(isCityFilter(cityParam) ? cityParam : 'All')

  const hotels = useHotels()

  // Honor query params on load / when it changes externally.
  useEffect(() => {
    if (isCityFilter(cityParam) && cityParam !== cityFilter) setCityFilter(cityParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityParam])

  const onCityFilter = (v: CityFilter) => {
    setCityFilter(v)
    const next = new URLSearchParams(params)
    if (v === 'All') next.delete('city'); else next.set('city', v)
    setParams(next, { replace: true })
  }

  /*
   * The tier filter is gone. All nine properties are Quadis Central, so
   * "Select" and "Experience" always returned zero results and rendered their
   * raw enum values as pill labels. The three tiers are a roadmap, and are now
   * presented as one below via <TierExpansion />.
   */
  const filtered = useMemo(
    () => hotels.filter((h) => cityFilter === 'All' || h.city === cityFilter),
    [hotels, cityFilter]
  )

  return (
    <>
      <section className="mini-hero scrim">
        <HeroMedia src={hotelsHero[0]} />
        <div className="container mini-hero__content">
          <span className="overline on-dark">STAY WITH QUADIS</span>
          <h1 className="h1 on-dark mini-hero__title">Our Hotels</h1>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container">
          <div className="list-pills">
            <FilterPills options={CITY_FILTERS} value={cityFilter} onChange={onCityFilter} ariaLabel="Filter hotels by city" />
          </div>

          <p className="list-count meta">
            {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}
            {cityFilter !== 'All' ? ` in ${cityFilter}` : ''}
          </p>

          {filtered.length > 0 ? (
            <div className="card-grid card-grid--anim" key={cityFilter}>
              {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
            </div>
          ) : (
            <div className="list-empty">
              <p className="lead">No properties found matching the selected filters.</p>
              <button className="btn btn--ghost" onClick={() => { setCityFilter('All'); setParams({}) }}>Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <NcrLocatorMap hotels={filtered} />

      <TierExpansion />

      <UpcomingHotels />

      <CtaBand />
    </>
  )
}
