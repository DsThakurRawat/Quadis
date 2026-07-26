// Photography resolver.
//
// Per spec §5 + readme-3 §3: the repo's Reference-images/ are screenshots for
// layout/content reference ONLY and are never shipped. Real client photography
// lands under public/images/** in EXACTLY this structure (no renaming, no code
// edits) and is picked up on the next build:
//   home/hero.jpg            about/story.jpg            auth.jpg
//   hotels/<slug>/hero.jpg + 01..04.jpg
//   banquets/<slug>/hero.jpg + 01..03.jpg
//   restaurant/hero.jpg + 01..04.jpg
// Until files exist, every group is empty and each slot renders a --bg-warm
// placeholder with the correct aspect-ratio reserved → zero layout shift.
const files = import.meta.glob('/public/images/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

type Entry = { url: string; name: string }
const buckets: Record<string, Entry[]> = {}

for (const [path, url] of Object.entries(files)) {
  const rel = path.split('/public/images/')[1]
  if (!rel) continue
  const slash = rel.lastIndexOf('/')
  const dir = slash === -1 ? '' : rel.slice(0, slash)
  const name = slash === -1 ? rel : rel.slice(slash + 1)
  const cleanUrl = typeof url === 'string' ? url.replace(/^\/public\//, '/') : url
  ;(buckets[dir] ??= []).push({ url: cleanUrl, name })
}

// hero.jpg leads; numbered gallery files follow in ascending order.
const rank = (name: string): number => (name.toLowerCase().startsWith('hero') ? -1 : 0)
const groups: Record<string, string[]> = {}
for (const [dir, entries] of Object.entries(buckets)) {
  entries.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, undefined, { numeric: true }))
  groups[dir] = entries.map((e) => e.url)
}

const at = (key: string): string[] => groups[key] ?? []

// Categorized collections from public/images/**
export const galleryDeluxe: string[] = at('rooms/deluxe')
export const gallerySuperior: string[] = at('rooms/superior')
export const galleryRoyal: string[] = at('rooms/royal')
export const galleryFacade: string[] = at('facade')
export const galleryDining: string[] = at('restaurant/dining')

// Section artwork — page banners and the Airlines/Homes concept renders. These
// are design assets, not property photography, so they must never surface in the
// "Moments of Calm & Comfort" gallery.
const SECTION_ARTWORK = ['banner', 'service-leadership', 'employee-vendor-welfare', 'quadis-airlines', 'quadis-homes']
const isSectionArtwork = (name: string): boolean =>
  SECTION_ARTWORK.some((slug) => name.toLowerCase().startsWith(slug))

// Master gallery list — a true superset of the category tabs.
//
// This used to drop every .png, so "All" showed 58 of 178 photos while the
// category tabs showed all of them: a guest could see a room under "Deluxe
// Rooms" that "All" hid. Only section artwork is excluded, since that is design
// material rather than photography.
export const galleryAll: string[] = Object.values(buckets)
  .flat()
  .filter((e) => !isSectionArtwork(e.name))
  .map((e) => e.url)

const allPhotos = galleryAll

const deluxePhotos = galleryDeluxe.length ? galleryDeluxe : allPhotos
const superiorPhotos = gallerySuperior.length ? gallerySuperior : allPhotos
const suitePhotos = galleryRoyal.length ? galleryRoyal : allPhotos

// Simple deterministic hash for slug-to-photo indexing
function hashSlug(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Per-entity photo sets (arrays of real photo URLs with smart production fallbacks).
export const hotelImages = (slug: string): string[] => {
  const explicit = at(`hotels/${slug}`)
  const pool = galleryFacade.length ? galleryFacade : (allPhotos.length ? allPhotos : ['/images/home/hero.jpg'])
  const idx = hashSlug(slug)

  // Fallback 5 distinct photos from available pool
  const fallbacks = [
    pool[idx % pool.length] ?? pool[0]!,
    pool[(idx + 2) % pool.length] ?? pool[0]!,
    pool[(idx + 4) % pool.length] ?? pool[0]!,
    pool[(idx + 6) % pool.length] ?? pool[0]!,
    pool[(idx + 8) % pool.length] ?? pool[0]!,
  ]

  if (!explicit.length) return fallbacks

  // If explicit set exists but has fewer than 5 photos, pad with fallbacks so gallery thumbnails are never empty
  const combined = [...explicit]
  let fIdx = 0
  while (combined.length < 5 && fIdx < fallbacks.length) {
    if (!combined.includes(fallbacks[fIdx]!)) {
      combined.push(fallbacks[fIdx]!)
    }
    fIdx++
  }
  return combined
}

export const roomImages = (hotelSlug: string, roomId: string): string[] => {
  // Check explicit subdirectories first
  const sub = at(`hotels/${hotelSlug}/rooms/${roomId}`)
  if (sub.length) return sub
  const sub2 = at(`hotels/${hotelSlug}/${roomId}`)
  if (sub2.length) return sub2

  // Fallback 1: keyword match on flat hotel files
  const all = at(`hotels/${hotelSlug}`)
  if (all.length) {
    const keywords = roomId.split('-').filter((k) => k !== 'room' && k.length > 2)
    const matched = all.filter((url) => {
      const lower = url.toLowerCase()
      return keywords.some((k) => lower.includes(k))
    })
    if (matched.length) return matched
  }

  // Fallback 2: fallback room tier photos directly from categorized room collections
  const idx = hashSlug(`${hotelSlug}-${roomId}`)
  if (roomId.includes('suite') || roomId.includes('royal')) {
    const pool = suitePhotos
    return [
      pool[idx % pool.length] ?? pool[0]!,
      pool[(idx + 1) % pool.length] ?? pool[0]!,
      pool[(idx + 2) % pool.length] ?? pool[0]!,
      pool[(idx + 3) % pool.length] ?? pool[0]!,
    ]
  }
  if (roomId.includes('superior')) {
    const pool = superiorPhotos
    return [
      pool[idx % pool.length] ?? pool[0]!,
      pool[(idx + 1) % pool.length] ?? pool[0]!,
      pool[(idx + 2) % pool.length] ?? pool[0]!,
      pool[(idx + 3) % pool.length] ?? pool[0]!,
    ]
  }
  const pool = deluxePhotos
  return [
    pool[idx % pool.length] ?? pool[0]!,
    pool[(idx + 1) % pool.length] ?? pool[0]!,
    pool[(idx + 2) % pool.length] ?? pool[0]!,
    pool[(idx + 3) % pool.length] ?? pool[0]!,
  ]
}

export const banquetImages = (slug: string): string[] => {
  const explicit = at(`banquets/${slug}`)
  if (explicit.length) return explicit
  const pool = galleryDining.length ? galleryDining : (allPhotos.length ? allPhotos : ['/images/home/hero.jpg'])
  const idx = hashSlug(slug)
  return [
    pool[(idx + 1) % pool.length] ?? pool[0]!,
    pool[(idx + 3) % pool.length] ?? pool[0]!,
    pool[(idx + 4) % pool.length] ?? pool[0]!,
  ]
}

export const restaurantImages = (): string[] => {
  const explicit = at('restaurant')
  if (explicit.length) return explicit
  const pool = galleryDining.length ? galleryDining : (allPhotos.length ? allPhotos : ['/images/home/hero.jpg'])
  return [pool[0]!, pool[1 % pool.length] ?? pool[0]!, pool[2 % pool.length] ?? pool[0]!]
}

export const cateringImages = (): string[] => {
  const dedicated = at('restaurant/catering')
  if (dedicated.length) return dedicated
  return restaurantImages()
}

// Site-level hero/section photo sets.
export const homeImages: string[] = at('home').filter((url) => !url.toLowerCase().endsWith('.png'))
export const aboutImages: string[] = at('about').length ? at('about') : homeImages

/**
 * Client-supplied About page artwork, addressed by name rather than by index
 * into `aboutImages` — a glob index silently repoints at a different photo the
 * moment a file is added to the folder.
 */
const aboutNamed = (file: string, fallback: string[]): string =>
  at('about').find((url) => url.includes(`/${file}`)) ?? fallback[0] ?? homeImages[0] ?? ''

export const aboutBanner: string = aboutNamed('banner', aboutImages)
export const aboutServiceLeadership: string = aboutNamed('service-leadership', galleryFacade)
export const aboutWelfare: string = aboutNamed('employee-vendor-welfare', galleryDining)
export const aboutAirlines: string = aboutNamed('quadis-airlines', galleryFacade)
export const aboutHomes: string = aboutNamed('quadis-homes', galleryRoyal)
export const restaurantHero: string[] = at('restaurant').length ? at('restaurant') : homeImages
export const banquetHero: string[] = at('banquets').length ? at('banquets') : homeImages
export const hotelsHero: string[] = at('hotels').length ? at('hotels') : homeImages

export const heroShowcaseImages: string[] = [
  '/images/home/hero.jpg',
  '/images/hotels/hotel-downtown-sector-51-noida/03.png',
  '/images/hotels/hotel-downtown-sector-51-noida/02.png',
  '/images/hotels/hotel-downtown-sector-51-noida/01.png',
  '/images/restaurant/dining/banquet-2-.png',
].filter(Boolean)

const authSet: string[] = at('')
export const loginImages: string[] = authSet.length ? authSet : homeImages
export const registerImages: string[] = authSet.length ? authSet : homeImages
export const corporateImages: string[] = at('corporate').length ? at('corporate') : homeImages
export const contactImages: string[] = at('contact').length ? at('contact') : homeImages

/*
 * Named picks for the home page.
 *
 * Three sections now run back to back — Our Offerings, Experiences by Quadis
 * and the tier roadmap — and several of them want "a banquet photo" or "a
 * dining photo". public/images/banquets/ and public/images/restaurant/ hold
 * exactly ONE file each, so a second section asking for [1] gets undefined and
 * silently falls back to the same hero. These reach into restaurant/dining/,
 * which has 15, and select by filename rather than by index so re-sorting the
 * bucket cannot quietly repoint them.
 */
const firstMatching = (pool: string[], needle: string): string | undefined =>
  pool.find((url) => url.toLowerCase().includes(needle))

/** A banquet hall, distinct from banquets/hero.png. */
export const banquetHallImage: string =
  firstMatching(galleryDining, 'banquet') ?? banquetHero[0] ?? homeImages[0] ?? ''

/** A dining room, distinct from restaurant/hero.png. */
export const diningHallImage: string =
  firstMatching(galleryDining, 'dining-hall') ?? galleryDining[0] ?? homeImages[0] ?? ''
