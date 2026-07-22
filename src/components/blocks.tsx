import type { ReactNode, ElementType } from 'react'
import { useReveal } from './useReveal.ts'
import { SectionHeader, Button } from './ui.tsx'
import { HeroMedia } from './media.tsx'

interface PhotoHeroProps {
  image?: string | undefined
  overline?: string
  title: string
  sub?: string
  height?: 'band' | 'short'
  children?: ReactNode
}
// Full-bleed photo hero band with scrim + centered light text (§1, §6).
export function PhotoHero({ image, overline, title, sub, height = 'band', children }: PhotoHeroProps) {
  return (
    <section className={`photo-hero photo-hero--${height} scrim`}>
      <HeroMedia src={image} />
      <div className="container photo-hero__content">
        {overline && <span className="overline on-dark">{overline}</span>}
        <h1 className="h1 on-dark photo-hero__title">{title}</h1>
        {sub && <p className="lead photo-hero__sub">{sub}</p>}
        {children}
      </div>
    </section>
  )
}

const STATS = [
  { n: '10', label: 'Properties' },
  { n: '2', label: 'Cities' },
  { n: '5000+', label: 'Happy Guests' },
  { n: '4.5★', label: 'Rating' },
  { n: '95%', label: 'Repeat Guests' },
] as const
export function StatsStrip() {
  const ref = useReveal()
  return (
    <section className="section bg-cream">
      <div ref={ref} className="container reveal stats">
        {STATS.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat__n">{s.n}</span>
            <span className="stat__l overline">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

interface CtaBandProps { title?: string; cta?: string; to?: string }
export function CtaBand({ title = 'Ready to book your stay?', cta = 'BOOK A RESERVATION', to = '/hotels' }: CtaBandProps) {
  const ref = useReveal()
  return (
    <section className="section bg-cream">
      <div ref={ref} className="container reveal cta-band">
        <h2 className="h2">{title}</h2>
        <Button to={to} variant="primary">{cta}</Button>
      </div>
    </section>
  )
}

interface RevealProps { as?: ElementType; className?: string; children: ReactNode }
export function Reveal({ as: Tag = 'div', className = '', children }: RevealProps) {
  const ref = useReveal<HTMLElement>()
  return <Tag ref={ref} className={`reveal ${className}`}>{children}</Tag>
}

export { SectionHeader }
