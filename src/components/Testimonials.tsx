import { useEffect, useRef, useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconStar } from './icons.tsx'
import { homeImages, aboutImages } from '../data/images.ts'

interface Quote { quote: string; name: string; role: string }
const QUOTES: Quote[] = [
  { quote: 'A calm, considered stay. The room was immaculate and the team anticipated everything before we asked. This is how hospitality should feel.', name: 'Ananya Sharma', role: 'Leisure guest, Noida' },
  { quote: 'We booked ten rooms for a corporate offsite. Seamless invoicing, prime location, and warm, attentive service throughout. We will return.', name: 'Rohit Menon', role: 'Corporate booking, New Delhi' },
  { quote: 'Our reception at the Quadis banquet was elegant without being fussy. The catering and coordination were faultless from start to finish.', name: 'Priya & Kabir', role: 'Wedding reception, Lajpat Nagar' },
]

const BG: string[] = [...homeImages, ...aboutImages]

export default function Testimonials() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const n = QUOTES.length

  const go = (d: number) => setI((v) => (v + d + n) % n)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 6000)
    return () => clearInterval(timer.current)
  }, [paused, n])

  const t = QUOTES[i]!
  const bg = BG.length ? BG[i % BG.length] : null

  return (
    <div className="tcard" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="tcard__media" style={bg ? { backgroundImage: `url(${bg})` } : undefined} aria-hidden="true" />
      <div className="tcard__frame">
        <div className="tcard__inner">
          <p className="tcard__eyebrow"><span className="script">Guest</span> <span className="tcard__label">TESTIMONIAL</span></p>
          <blockquote className="tcard__quote" key={i}>&ldquo;{t.quote}&rdquo;</blockquote>
          <div className="tcard__stars" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, k) => (<IconStar key={k} />))}
          </div>
          <p className="tcard__name">{t.name}</p>
          <p className="tcard__role">{t.role}</p>
        </div>
      </div>
      <div className="tcard__nav">
        <button type="button" className="tcard__arrow" onClick={() => go(-1)} aria-label="Previous testimonial"><IconArrowLeft /></button>
        <button type="button" className="tcard__arrow" onClick={() => go(1)} aria-label="Next testimonial"><IconArrowRight /></button>
      </div>
    </div>
  )
}
