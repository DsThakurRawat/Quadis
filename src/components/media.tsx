import { useState } from 'react'

interface PhotoProps {
  src?: string | undefined
  label?: string
  ratio?: string // e.g. '4 / 3'
  alt?: string
  className?: string
}

/**
 * Photo — an image slot with a reserved aspect-ratio.
 * Renders a neutral --bg-warm placeholder (label centered) until a real photo
 * URL is supplied, so real photography drops in with zero layout shift (§5).
 */
export function Photo({ src, label = 'Quadis', ratio = '4 / 3', alt, className = '' }: PhotoProps) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed
  return (
    <div className={`photo ${className}`} style={{ aspectRatio: ratio }}>
      {show ? (
        <img className="photo__img" src={src} alt={alt || label} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="photo__ph" role="img" aria-label={alt || label}>
          <span className="photo__ph-label">{label}</span>
        </div>
      )}
    </div>
  )
}

interface HeroMediaProps {
  src?: string | undefined
  alt?: string
}

/**
 * HeroMedia — full-bleed background for a hero/scrim band.
 * With a real photo: <img> under the parent's .scrim overlay.
 * Without: a dark gradient placeholder so light hero text keeps ≥4.5:1 contrast
 * (§7). Same container either way → zero layout change when a photo arrives.
 */
export function HeroMedia({ src, alt = '' }: HeroMediaProps) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return <img className="hero-media" src={src} alt={alt} aria-hidden={alt ? undefined : true} onError={() => setFailed(true)} />
  }
  return <div className="hero-media hero-media--ph" aria-hidden="true" />
}
