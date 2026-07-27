import type { Hotel, BanquetVenue, City, HotelRoom, UpcomingHotel, CityFilter } from '../types.ts'

export const DEFAULT_ROOMS: HotelRoom[] = [
  {
    id: 'deluxe-room',
    name: 'Deluxe Room',
    description: 'Calm, refined comfort designed for effortless rest. Features plush bedding, executive workspace, and modern ensuite bath with premium bath amenities.',
    size: '240 sq ft',
    bed: 'King / Twin Beds',
    maxGuests: 2,
    basePriceOffset: 0,
    mealOptions: [
      { plan: 'Room Only', priceOffset: 0 },
      { plan: 'With Breakfast', priceOffset: 300 },
      { plan: 'All Meals Included', priceOffset: 800 },
    ],
  },
  {
    id: 'superior-room',
    name: 'Superior Room with Balcony',
    description: 'Elevated space with private outdoor seating and expansive city views. Includes upgraded seating area, high-speed Wi-Fi, and personalized evening turndown.',
    size: '310 sq ft',
    bed: 'King Bed + Balcony',
    maxGuests: 3,
    basePriceOffset: 400,
    mealOptions: [
      { plan: 'Room Only', priceOffset: 0 },
      { plan: 'With Breakfast', priceOffset: 350 },
      { plan: 'All Meals Included', priceOffset: 900 },
    ],
  },
  {
    id: 'royal-suite',
    name: 'Royal Suite',
    description: 'Our most luxurious sanctuary featuring separate master bedroom, private lounge and dining area, luxury soaking tub, and priority concierge check-in.',
    size: '450 sq ft',
    bed: 'Master Suite + Living Room',
    maxGuests: 4,
    basePriceOffset: 1200,
    mealOptions: [
      { plan: 'Room Only', priceOffset: 0 },
      { plan: 'With Breakfast', priceOffset: 450 },
      { plan: 'All Meals Included', priceOffset: 1200 },
    ],
  },
]

const MEALS_STANDARD: HotelRoom['mealOptions'] = [
  { plan: 'Room Only', priceOffset: 0 },
  { plan: 'With Breakfast', priceOffset: 300 },
  { plan: 'All Meals Included', priceOffset: 800 },
]
const MEALS_UPGRADED: HotelRoom['mealOptions'] = [
  { plan: 'Room Only', priceOffset: 0 },
  { plan: 'With Breakfast', priceOffset: 350 },
  { plan: 'All Meals Included', priceOffset: 900 },
]

/**
 * The client's rate sheet (27 Jul 2026) settles the category question: there
 * are three across the group — DELUXE, SUPER and ROYAL — not the five this file
 * used to carry. Every hotel sells Deluxe and Super; only Downtown EOK and Amar
 * Inn sell a Royal, one key each.
 *
 * Pricing is uniform, again per the sheet: "Upper category 1000 plus in each
 * hotel". The per-hotel variation is entirely in `price` (the Deluxe rate) —
 * Super is always +1,000 on it and Royal always +2,000, at every property. So
 * these are offsets, not rates, and the sheet's Super and Royal columns fall
 * out of them: Cladis 15 at 1,800 quotes Super at 2,800, EOK at 3,000 quotes
 * Royal at 5,000.
 *
 * Slugs are unchanged on purpose — `room_types.id` is derived from them and
 * `bookings.room_type_id` points at it, so renaming would strand live bookings.
 */
const SUPER: HotelRoom = {
  id: 'super-deluxe',
  name: 'Super Deluxe',
  description: 'A larger, more considered room with an upgraded seating area, high-speed Wi-Fi and evening turndown.',
  size: '290 sq ft',
  bed: 'King Bed',
  maxGuests: 3,
  basePriceOffset: 1000,
  mealOptions: MEALS_UPGRADED,
}
const DELUXE: HotelRoom = { ...DEFAULT_ROOMS[0]!, mealOptions: MEALS_STANDARD }
const ROYAL: HotelRoom = { ...DEFAULT_ROOMS[2]!, basePriceOffset: 2000 }

/**
 * Every property is listed now, so the DEFAULT_ROOMS fallback below is only
 * reached by a slug this file has never heard of. Must stay in step with
 * ROOMS_BY_SLUG in backend/src/data/seed.ts, which additionally carries the
 * key counts — a category the site offers but the API has not seeded cannot be
 * booked.
 */
const ROOMS_BY_SLUG: Record<string, HotelRoom[]> = {
  'hotel-downtown-sector-15-noida': [DELUXE, SUPER],
  'hotel-downtown-sector-51-noida': [DELUXE, SUPER],
  'hotel-cladis-sector-19-noida': [DELUXE, SUPER],
  'hotel-quadis-sector-51-noida': [DELUXE, SUPER],
  'hotel-cladis-sector-15-noida': [DELUXE, SUPER],
  'hotel-quadis-central-sector-27-noida': [DELUXE, SUPER],
  'hotel-downtown-east-of-kailash': [DELUXE, SUPER, ROYAL],
  'hotel-amby-inn-lajpat-nagar-ii': [DELUXE, SUPER],
  'hotel-amar-in': [DELUXE, SUPER, ROYAL],
}

export const getHotelRooms = (hotel: Hotel): HotelRoom[] =>
  hotel.rooms ?? ROOMS_BY_SLUG[hotel.slug] ?? DEFAULT_ROOMS

import { getApiUrl } from '../config/api'

import { useState, useEffect } from 'react'

export const STATIC_HOTELS: Hotel[] = [
  { slug: 'hotel-quadis-sector-51-noida', coords: { lat: 28.5833, lng: 77.3712 }, transit: { metro: { name: 'Sector 52 Metro', value: '5 min walk' }, airport: { name: 'IGI Airport T3', value: '32 km · 55 min' }, rail: { name: 'New Delhi Railway Station', value: '24 km' }, landmark: { name: 'Sector 51 Market', note: 'dining & retail' } }, name: 'Hotel Quadis Sector 51', area: 'Sector 51', city: 'Noida', address: 'H-22, Hoshiarpur Village, Sector 51, Noida, Uttar Pradesh 201301', price: 1500, rating: 4.6 },
  { slug: 'hotel-quadis-central-sector-27-noida', coords: { lat: 28.5778, lng: 77.3243 }, transit: { metro: { name: 'Sector 18 Metro', value: '10 min walk' }, airport: { name: 'IGI Airport T3', value: '28 km · 45 min' }, rail: { name: 'Nizamuddin Railway Station', value: '15 km' }, landmark: { name: 'Atta Market', note: 'dining & retail' } }, name: 'Hotel Quadis Central', area: 'Sector 27', city: 'Noida', address: 'D-192, E Block, Pocket E, Sector 27, Noida, Uttar Pradesh 201301', price: 2500, rating: 4.5 },
  { slug: 'hotel-downtown-sector-15-noida', coords: { lat: 28.5847, lng: 77.3129 }, transit: { metro: { name: 'Sector 15 Metro', value: '2 min walk' }, airport: { name: 'IGI Airport T3', value: '26 km · 40 min' }, rail: { name: 'Nizamuddin Railway Station', value: '13 km' }, landmark: { name: 'Sector 15 Indian Oil', note: 'Metro Pillar 33' } }, name: 'Hotel Downtown Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'Metro pillar no. 33, Opposite, New Ashok Nagar Rd, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 2000, rating: 4.4 },
  { slug: 'hotel-cladis-sector-15-noida', coords: { lat: 28.5855, lng: 77.311 }, transit: { metro: { name: 'Sector 15 Metro', value: '4 min walk' }, airport: { name: 'IGI Airport T3', value: '26 km · 40 min' }, rail: { name: 'Nizamuddin Railway Station', value: '13 km' }, landmark: { name: 'Naya Bans Village', note: 'neighbourhood' } }, name: 'Hotel Cladis Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'New Ashok Nagar Rd, opposite metro pillar no. 36, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1800, rating: 4.4 },
  { slug: 'hotel-cladis-sector-19-noida', coords: { lat: 28.583, lng: 77.321 }, transit: { metro: { name: 'Sector 16 Metro', value: '8 min walk' }, airport: { name: 'IGI Airport T3', value: '27 km · 45 min' }, rail: { name: 'Nizamuddin Railway Station', value: '14 km' }, landmark: { name: 'Indo Gulf Hospital', note: 'landmark' } }, name: 'Hotel Cladis Sector 19 Noida', area: 'Sector 19', city: 'Noida', address: 'A-369, A Block, Pocket A, Sector 19, Noida, Uttar Pradesh 201301', price: 2000, rating: 4.3 },
  { slug: 'hotel-downtown-sector-51-noida', coords: { lat: 28.5815, lng: 77.375 }, transit: { metro: { name: 'Sector 52 Metro', value: '10 min walk' }, airport: { name: 'IGI Airport T3', value: '33 km · 55 min' }, rail: { name: 'New Delhi Railway Station', value: '25 km' }, landmark: { name: 'Kendriya Vihar', note: 'neighbourhood' } }, name: 'Hotel Downtown Sector 51 Noida', area: 'Sector 51', city: 'Noida', address: 'House No : C-155, Sector 51, Noida, Uttar Pradesh 201304', price: 2500, rating: 4.5 },
  { slug: 'hotel-downtown-east-of-kailash', coords: { lat: 28.555, lng: 77.245 }, transit: { metro: { name: 'Kailash Colony Metro', value: '5 min walk' }, airport: { name: 'IGI Airport T3', value: '18 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '4 km' }, landmark: { name: 'ISKCON Temple', note: 'landmark' } }, name: 'Hotel Downtown EOK', area: 'East of Kailash', city: 'New Delhi', address: 'B-14, B Block, East of Kailash, New Delhi, Delhi 110065', price: 3000, rating: 4.6 },
  { slug: 'hotel-amby-inn-lajpat-nagar-ii', coords: { lat: 28.57, lng: 77.24 }, transit: { metro: { name: 'Lajpat Nagar Metro', value: '3 min walk' }, airport: { name: 'IGI Airport T3', value: '19 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '5 km' }, landmark: { name: 'Central Market', note: 'dining & retail' } }, name: 'Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'M13, Vinoba Puri, Block M, Lajpat Nagar II, Lajpat Nagar, New Delhi, Delhi 110024', price: 2500, rating: 4.5 },
  { slug: 'hotel-amar-in', coords: { lat: 28.571, lng: 77.2415 }, transit: { metro: { name: 'Lajpat Nagar Metro', value: '4 min walk' }, airport: { name: 'IGI Airport T3', value: '19 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '5 km' }, landmark: { name: 'Jal Vihar', note: 'neighbourhood' } }, name: 'Hotel Amar Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'K-102, Road, near Central Market, Block K, Lajpat Nagar II, Jal Vihar, New Delhi, Delhi 110024', price: 3000, rating: 4.4 },
]

/**
 * Card order requested by the client (Change Order #2, item 4). Applied to both
 * the static list and the API response — the API returns seed order, so sorting
 * only one of them makes the grid re-shuffle the moment the fetch lands.
 */
export const HOTEL_DISPLAY_ORDER: readonly string[] = [
  'hotel-amar-in',                        // Hotel Amar Inn
  'hotel-downtown-east-of-kailash',       // Hotel Downtown EOK
  'hotel-downtown-sector-51-noida',       // Hotel Downtown Sec 51
  'hotel-downtown-sector-15-noida',       // Hotel Downtown Sec 15
  'hotel-quadis-central-sector-27-noida', // Hotel Quadis Central
  'hotel-cladis-sector-19-noida',         // Hotel Cladis Sector 19
  'hotel-cladis-sector-15-noida',         // Hotel Cladis Sector 15
  'hotel-quadis-sector-51-noida',         // Hotel Quadis 51
  'hotel-amby-inn-lajpat-nagar-ii',       // Hotel Amby Inn
]

const orderOf = (slug: string): number => {
  const i = HOTEL_DISPLAY_ORDER.indexOf(slug)
  // Anything the client has not ranked sorts to the end rather than the front.
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

export const inDisplayOrder = (list: Hotel[]): Hotel[] =>
  [...list].sort((a, b) => orderOf(a.slug) - orderOf(b.slug))

export const HOTELS: Hotel[] = inDisplayOrder(STATIC_HOTELS)

let cachedHotels: Hotel[] | null = null
let fetchPromise: Promise<void> | null = null
const listeners = new Set<() => void>()

export function useHotels(): Hotel[] {
  const [hotels, setHotels] = useState<Hotel[]>(cachedHotels || HOTELS)

  useEffect(() => {
    if (cachedHotels) return
    if (!fetchPromise) {
      fetchPromise = fetch(getApiUrl('properties'))
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data)) {
            // Merge over the static record rather than replacing it. The API is
            // authoritative for operational data (price, surcharge), but
            // editorial content — transit facts, hand-written area labels — only
            // lives here. Replacing outright silently blanked the "Getting here"
            // panel the moment the API responded.
            const staticBySlug = new Map(STATIC_HOTELS.map((s) => [s.slug, s]))

            cachedHotels = inDisplayOrder(json.data.map((h: any): Hotel => {
              const base = staticBySlug.get(h.slug)
              const derivedArea = h.name.includes('Sector')
                ? `Sector ${h.name.split('Sector ')[1]}`
                : h.name.split(' ').slice(-2).join(' ')

              return {
                ...base,
                slug: h.slug,
                name: h.name,
                area: base?.area ?? derivedArea,
                city: h.city as City,
                address: h.address,
                coords:
                  h.lat != null && h.lng != null
                    ? { lat: Number(h.lat), lng: Number(h.lng), placeId: h.place_id ?? undefined }
                    : base?.coords,
                // Coerce every numeric the API hands back.
                //
                // Postgres NUMERIC arrives as a string unless a type parser is
                // registered, and one missing coercion took the entire site
                // down: `rating.toFixed(1)` threw and React unmounted, so every
                // page rendered blank. The backend now parses these properly,
                // but this stays as the second line of defence — a string
                // reaching `hotel.price + offset` concatenates instead of
                // adding, which misquotes a room rather than crashing, and is
                // therefore the more dangerous failure of the two.
                price: Number(h.base_price),
                weekendSurchargePercent: Number(h.weekend_surcharge_percent ?? 0),
                // Postgres returns NUMERIC as a string, so coerce rather than
                // letting "500" reach the arithmetic as a string.
                extraAdultPercent: h.extra_adult_percent != null ? Number(h.extra_adult_percent) : undefined,
                childFreeUnderAge: h.child_free_under_age != null ? Number(h.child_free_under_age) : undefined,
                childPercent: h.child_percent != null ? Number(h.child_percent) : undefined,
                adultFromAge: h.adult_from_age != null ? Number(h.adult_from_age) : undefined,
                rating: Number(h.rating),
                // Admin-uploaded photography. Carried through the merge so
                // `imagesForHotel` can prefer it over the bundled glob; absent
                // on an API that predates the feature, which just means the
                // bundled images keep being used.
                images: Array.isArray(h.images) ? h.images : undefined,
              }
            }))
            listeners.forEach(l => l())
          }
        })
        .catch(e => {
          console.error('Failed to fetch hotels', e)
          // Clear the in-flight promise so a later mount can retry. Leaving it
          // set pinned the whole session to static data after one flaky load.
          fetchPromise = null
        })
    }

    const listener = () => {
      if (cachedHotels) setHotels(cachedHotels)
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  return hotels
}

export const UPCOMING_HOTELS: UpcomingHotel[] = [
  { name: 'Rishikesh', location: 'Rishikesh, Uttarakhand', image: '/images/upcoming/rishikesh.webp', badge: 'COMING SOON' },
  { name: 'Agra', location: 'Agra, Uttar Pradesh', image: '/images/upcoming/agra.webp', badge: 'COMING SOON' },
  { name: 'Chandigarh', location: 'Chandigarh, Punjab', image: '/images/upcoming/chandigarh.webp', badge: 'COMING SOON' },
  { name: 'Dehradun', location: 'Dehradun, Uttarakhand', image: '/images/upcoming/dehradun.webp', badge: 'COMING SOON' },
  { name: 'Faridabad', location: 'Faridabad, Haryana', image: '/images/upcoming/faridabad.webp', badge: 'COMING SOON' },
  { name: 'Gurgaon', location: 'Gurgaon, Haryana', image: '/images/upcoming/gurgaon.webp', badge: 'COMING SOON' },
  // Manesar was dropped at the client's request (July 2026): with it the
  // Destinations grid ran to nine tiles and wrapped onto a second row.
  // DestinationsGrid renders the two live cities plus every entry here that
  // is not already live (New Delhi is), so this list must stay at seven for
  // the grid to hold one line.
  { name: 'New Delhi', location: 'New Delhi', image: '/images/upcoming/delhi.webp', badge: 'COMING SOON' },
]

export const CITIES: City[] = ['Noida', 'New Delhi']
export const CITY_FILTERS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi']

// Banquet venues — §4/§6.4. Capacities are representative venue specs.
export const BANQUETS: BanquetVenue[] = [
  { slug: 'banquets-at-hotel-amby-inn', name: 'Banquets at Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', capacity: 350, hallArea: '4,200 sq ft', catering: 'Veg & Non-veg', parking: 'Valet available' },
  { slug: 'banquets-at-hotel-cladis', name: 'Banquets at Hotel Cladis', area: 'Sector 15', city: 'Noida', capacity: 500, hallArea: '6,000 sq ft', catering: 'Veg & Non-veg', parking: 'On-site parking' },
  { slug: 'banquets-at-hotel-downtown-eok', name: 'Banquets at Hotel Downtown EOK', area: 'East of Kailash', city: 'New Delhi', capacity: 300, hallArea: '3,600 sq ft', catering: 'Veg & Non-veg', parking: 'Valet available' },
  { slug: 'banquets-at-hotel-downtown-sector-51', name: 'Banquets at Hotel Downtown Sector 51', area: 'Sector 51', city: 'Noida', capacity: 450, hallArea: '5,200 sq ft', catering: 'Veg & Non-veg', parking: 'On-site parking' },
]

// ₹1,899 / night  (Indian comma grouping)
export const inr = (n: number): string => '₹' + Number(n).toLocaleString('en-IN')
export const priceNight = (n: number): string => `${inr(n)} / night`
export const stars = (r: number): string => `★ ${r.toFixed(1)}`
