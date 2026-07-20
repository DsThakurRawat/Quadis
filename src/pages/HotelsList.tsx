import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HOTELS } from '../data/hotels.ts'
import { hotelsHero } from '../data/images.ts'
import type { CityFilter } from '../types.ts'
import { HotelCard, FilterPills } from '../components/ui.tsx'
import { HeroMedia } from '../components/media.tsx'
import { CtaBand } from '../components/blocks.tsx'

const OPTIONS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi']
const isFilter = (v: string | null): v is CityFilter => !!v && (OPTIONS as readonly string[]).includes(v)

export default function HotelsList() {
  const [params, setParams] = useSearchParams()
  const cityParam = params.get('city')
  const [filter, setFilter] = useState<CityFilter>(isFilter(cityParam) ? cityParam : 'All')

  // Honor ?city= on load / when it changes externally.
  useEffect(() => {
    if (isFilter(cityParam) && cityParam !== filter) setFilter(cityParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityParam])

  const onFilter = (v: CityFilter) => {
    setFilter(v)
    const next = new URLSearchParams(params)
    if (v === 'All') next.delete('city'); else next.set('city', v)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(
    () => (filter === 'All' ? HOTELS : HOTELS.filter((h) => h.city === filter)),
    [filter]
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
            <FilterPills options={OPTIONS} value={filter} onChange={onFilter} ariaLabel="Filter hotels by city" />
          </div>
          <p className="list-count meta">{filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}{filter !== 'All' ? ` in ${filter}` : ''}</p>
          <div className="card-grid card-grid--anim" key={filter}>
            {filtered.map((h) => (<HotelCard key={h.slug} hotel={h} />))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
