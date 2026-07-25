import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HOTELS, TIER_FILTERS, CITY_FILTERS } from '../data/hotels.ts'
import { hotelsHero } from '../data/images.ts'
import type { CityFilter, TierFilter } from '../types.ts'
import { HotelCard, FilterPills } from '../components/ui.tsx'
import { HeroMedia } from '../components/media.tsx'
import { CtaBand } from '../components/blocks.tsx'
import UpcomingHotels from '../components/UpcomingHotels.tsx'

const isCityFilter = (v: string | null): v is CityFilter => !!v && (CITY_FILTERS as readonly string[]).includes(v)
const isTierFilter = (v: string | null): v is TierFilter => !!v && (TIER_FILTERS as readonly string[]).includes(v)

export default function HotelsList() {
  const [params, setParams] = useSearchParams()
  const cityParam = params.get('city')
  const tierParam = params.get('tier')
  const [cityFilter, setCityFilter] = useState<CityFilter>(isCityFilter(cityParam) ? cityParam : 'All')
  const [tierFilter, setTierFilter] = useState<TierFilter>(isTierFilter(tierParam) ? tierParam : 'All Tiers')

  // Honor query params on load / when it changes externally.
  useEffect(() => {
    if (isCityFilter(cityParam) && cityParam !== cityFilter) setCityFilter(cityParam)
    if (isTierFilter(tierParam) && tierParam !== tierFilter) setTierFilter(tierParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityParam, tierParam])

  const onCityFilter = (v: CityFilter) => {
    setCityFilter(v)
    const next = new URLSearchParams(params)
    if (v === 'All') next.delete('city'); else next.set('city', v)
    setParams(next, { replace: true })
  }

  const onTierFilter = (v: TierFilter) => {
    setTierFilter(v)
    const next = new URLSearchParams(params)
    if (v === 'All Tiers') next.delete('tier'); else next.set('tier', v)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    return HOTELS.filter(h => {
      const cityMatch = cityFilter === 'All' || h.city === cityFilter
      const tierMatch = tierFilter === 'All Tiers' || h.tier === tierFilter
      return cityMatch && tierMatch
    })
  }, [cityFilter, tierFilter])

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
          
          <div className="tier-explainer-row mb-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div>
              <h3 className="h3" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '8px' }}>Quadis Central</h3>
              <p className="meta">Current core inventory · Normal standard hotels</p>
            </div>
            <div>
              <h3 className="h3" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '8px' }}>Quadis Select</h3>
              <p className="meta">Upgraded / corporate-facing properties · Premium corporate stays or family stays with additional facilities</p>
            </div>
            <div>
              <h3 className="h3" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '8px' }}>Quadis Experience</h3>
              <p className="meta">Leisure &amp; resort inventory · Resorts or luxury experience hotels for leisure travellers</p>
            </div>
          </div>

          <div className="list-pills" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FilterPills options={CITY_FILTERS} value={cityFilter} onChange={onCityFilter} ariaLabel="Filter hotels by city" />
            <FilterPills options={TIER_FILTERS} value={tierFilter} onChange={onTierFilter} ariaLabel="Filter hotels by tier" />
          </div>

          <p className="list-count meta mt-8">
            {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}
            {cityFilter !== 'All' ? ` in ${cityFilter}` : ''}
            {tierFilter !== 'All Tiers' ? ` (${tierFilter})` : ''}
          </p>
          
          {filtered.length > 0 ? (
            <div className="card-grid card-grid--anim mt-8" key={`${cityFilter}-${tierFilter}`}>
              {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
            </div>
          ) : (
            <div className="mt-8 py-12 text-center" style={{ border: '1px dashed var(--border-card-2)' }}>
              <p className="lead">No properties found matching the selected filters.</p>
              <button className="btn btn--ghost mt-4" onClick={() => { setCityFilter('All'); setTierFilter('All Tiers'); setParams({}); }}>Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <UpcomingHotels />

      <CtaBand />
    </>
  )
}
