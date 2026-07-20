import { useState, useMemo } from 'react'
import {
  galleryAll,
  galleryDeluxe,
  gallerySuperior,
  galleryRoyal,
  galleryFacade,
  galleryDining,
} from '../data/images.ts'
import { FilterPills } from '../components/ui.tsx'
import { PhotoHero, SectionHeader, Reveal } from '../components/blocks.tsx'
import { IconArrowLeft, IconArrowRight, IconX } from '../components/icons.tsx'

type GalleryTab = 'All' | 'Deluxe Rooms' | 'Superior Rooms' | 'Royal Suites' | 'Facades & Lobbies' | 'Dining & Banquets'
const TABS: readonly GalleryTab[] = [
  'All',
  'Deluxe Rooms',
  'Superior Rooms',
  'Royal Suites',
  'Facades & Lobbies',
  'Dining & Banquets',
]

export default function GalleryPage() {
  const [tab, setTab] = useState<GalleryTab>('All')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const images = useMemo(() => {
    switch (tab) {
      case 'Deluxe Rooms':
        return galleryDeluxe
      case 'Superior Rooms':
        return gallerySuperior
      case 'Royal Suites':
        return galleryRoyal
      case 'Facades & Lobbies':
        return galleryFacade
      case 'Dining & Banquets':
        return galleryDining
      case 'All':
      default:
        return galleryAll
    }
  }, [tab])

  const heroImg = galleryFacade[0] ?? galleryAll[0] ?? '/images/home/hero.jpg'

  return (
    <>
      <PhotoHero image={heroImg} title="Photo Gallery" sub="A visual journey across our 10 considered properties, refined suites, and grand banquets." height="short" />

      <section className="section bg-cream gallery-page">
        <div className="container center-col">
          <SectionHeader overline="EXPLORE OUR SPACES" title="128 Moments of Calm & Comfort" />
          
          <div className="gallery-page__filters">
            <FilterPills options={TABS} value={tab} onChange={setTab} ariaLabel="Filter photo gallery categories" />
          </div>

          <div className="gallery-page__grid card-grid--anim" key={tab}>
            {images.map((src, i) => (
              <Reveal key={`${src}-${i}`} className="gallery-page__item">
                <button
                  className="gallery-page__thumb"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Open photo ${i + 1} in full screen`}
                >
                  <img
                    src={src}
                    alt={`Quadis Hotels ${tab} photograph ${i + 1}`}
                    loading="lazy"
                    className="gallery-page__img"
                  />
                  <span className="gallery-page__overlay">
                    <span className="gallery-page__zoom-label">View Full Screen</span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>

          {images.length === 0 && (
            <div className="empty-state">
              <p>No photographs available in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      {lightboxIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${tab} photograph view`}
          onClick={() => setLightboxIndex(null)}
        >
          <button className="lightbox__close" onClick={() => setLightboxIndex(null)} aria-label="Close photo view">
            <IconX />
          </button>
          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((i) => ((i! - 1 + images.length) % images.length))
            }}
            aria-label="Previous photograph"
          >
            <IconArrowLeft />
          </button>
          <img
            className="lightbox__img"
            src={images[lightboxIndex]}
            alt={`Quadis Hotels ${tab} full screen photograph`}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((i) => ((i! + 1) % images.length))
            }}
            aria-label="Next photograph"
          >
            <IconArrowRight />
          </button>
          <span className="lightbox__count">
            {lightboxIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  )
}
