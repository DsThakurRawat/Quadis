import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Hotel } from '../types.ts'

/**
 * City-level locator: one map for the whole list, not a map per card.
 *
 * Deliberately schematic rather than a tile map — it needs no API key, no
 * third-party request and no cookies, and it stays in the brand palette. It
 * answers "how are these spread across NCR, and which is where" — the question
 * a list of nine addresses can't.
 *
 * Renders nothing unless real coordinates exist, so it can ship before the
 * coordinates are collected without inventing pin positions.
 */

interface Props {
  hotels: Hotel[]
  activeSlug: string | null
  onHover: (slug: string | null) => void
}

// Padding keeps pins off the plate edge when properties cluster tightly.
const PAD = 0.12

export default function NcrLocatorMap({ hotels, activeSlug, onHover }: Props) {
  const located = useMemo(() => hotels.filter((h) => h.coords), [hotels])

  const points = useMemo(() => {
    if (!located.length) return []
    const lats = located.map((h) => h.coords!.lat)
    const lngs = located.map((h) => h.coords!.lng)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    // Guard the single-property case, where the span would be zero.
    const spanLat = maxLat - minLat || 0.01
    const spanLng = maxLng - minLng || 0.01

    return located.map((h, i) => ({
      hotel: h,
      n: i + 1,
      // y inverts: higher latitude is further north, which is up.
      x: (PAD + (1 - 2 * PAD) * ((h.coords!.lng - minLng) / spanLng)) * 100,
      y: (PAD + (1 - 2 * PAD) * (1 - (h.coords!.lat - minLat) / spanLat)) * 100,
    }))
  }, [located])

  if (!points.length) return null

  return (
    <figure className="ncr-map">
      <figcaption className="ncr-map__cap">
        <span className="overline">DELHI NCR</span>
        <span className="ncr-map__count">{points.length} of {hotels.length} properties mapped</span>
      </figcaption>

      <div className="ncr-map__plate">
        <span className="ncr-map__grid" aria-hidden="true" />
        <ul className="ncr-map__pins">
          {points.map((p) => (
            <li
              key={p.hotel.slug}
              className={`ncr-pin ${activeSlug === p.hotel.slug ? 'is-active' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onMouseEnter={() => onHover(p.hotel.slug)}
              onMouseLeave={() => onHover(null)}
            >
              <Link to={`/hotels/${p.hotel.slug}`} className="ncr-pin__dot">
                <span className="ncr-pin__n">{p.n}</span>
                <span className="visually-hidden">{p.hotel.name}</span>
              </Link>
              <span className="ncr-pin__label">{p.hotel.area}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
