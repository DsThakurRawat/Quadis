import { useState, useEffect } from 'react'

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

interface HeroShowcaseProps {
  images?: string[]
  intervalMs?: number
}

/**
 * HeroShowcase — dynamic full-bleed hero carousel with smooth 3s crossfades
 * and smart sequential rotation on refresh.
 */
export function HeroShowcase({ images = [], intervalMs = 3000 }: HeroShowcaseProps) {
  const [index, setIndex] = useState(() => {
    if (typeof window === 'undefined' || !images.length) return 0
    const saved = Number(localStorage.getItem('quadis_hero_last_idx') || 0)
    const next = (saved + 1) % images.length
    localStorage.setItem('quadis_hero_last_idx', String(next))
    return next
  })
  const [prevIndex, setPrevIndex] = useState(index)

  useEffect(() => {
    if (!images.length || images.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => {
        setPrevIndex(current)
        return (current + 1) % images.length
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [images.length, intervalMs])

  const handleDotClick = (i: number) => {
    if (i === index) return
    setPrevIndex(index)
    setIndex(i)
  }

  if (!images.length) {
    return <div className="hero-media hero-media--ph" aria-hidden="true" />
  }

  return (
    <>
      {images.map((img, i) => {
        const isActive = i === index
        const isPrev = i === prevIndex && !isActive
        return (
          <img
            key={img}
            className="hero-media"
            src={img}
            alt={`Quadis property showcase ${i + 1}`}
            style={{
              opacity: isActive || isPrev ? 1 : 0,
              transition: isActive ? 'opacity 1s ease-in-out' : 'none',
              zIndex: isActive ? 0 : isPrev ? -1 : -2,
            }}
          />
        )
      })}
      {images.length > 1 && (
        <div className="hero-dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              className={`hero-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => handleDotClick(i)}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface HeroVideoShowcaseProps {
  videoUrl?: string
  posterUrl?: string
}

/**
 * HeroVideoShowcase — Full-screen looping background video for the top banner (§1).
 * Features smooth autoPlay loop and high-res poster fallback.
 */
export function HeroVideoShowcase({
  videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-luxury-hotel-lobby-and-reception-42681-large.mp4',
  posterUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80'
}: HeroVideoShowcaseProps) {
  const [videoFailed, setVideoFailed] = useState(false)

  if (videoFailed) {
    return <img className="hero-media" src={posterUrl} alt="Quadis Hotel Showcase" />
  }

  return (
    <video
      className="hero-media"
      autoPlay
      loop
      muted
      playsInline
      poster={posterUrl}
      onError={() => setVideoFailed(true)}
      style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <source src={videoUrl} type="video/mp4" />
      <img className="hero-media" src={posterUrl} alt="Quadis Hotel Showcase" />
    </video>
  )
}

