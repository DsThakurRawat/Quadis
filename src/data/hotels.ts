import type { Hotel, BanquetVenue, City, HotelRoom, UpcomingHotel, CityFilter, TierFilter } from '../types.ts'

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
 * Room categories differ by property (client brief, July 2026). Only the
 * properties whose categories were confirmed are listed here; the rest fall
 * back to DEFAULT_ROOMS until their real categories are supplied.
 */
const SUPER_DELUXE: HotelRoom = {
  id: 'super-deluxe',
  name: 'Super Deluxe',
  description: 'A larger, more considered room with an upgraded seating area, high-speed Wi-Fi and evening turndown.',
  size: '290 sq ft',
  bed: 'King Bed',
  maxGuests: 3,
  basePriceOffset: 400,
  mealOptions: MEALS_UPGRADED,
}
const SUPER_DELUXE_BALCONY: HotelRoom = {
  id: 'super-deluxe-balcony',
  name: 'Super Deluxe with Balcony',
  description: 'The Super Deluxe with a private balcony — outdoor seating and open city views.',
  size: '330 sq ft',
  bed: 'King Bed + Balcony',
  maxGuests: 3,
  basePriceOffset: 650,
  mealOptions: MEALS_UPGRADED,
}
const DELUXE: HotelRoom = { ...DEFAULT_ROOMS[0]!, mealOptions: MEALS_STANDARD }
const SUPERIOR: HotelRoom = DEFAULT_ROOMS[1]!

const ROOMS_BY_SLUG: Record<string, HotelRoom[]> = {
  'hotel-quadis-sector-51-noida': [DELUXE, SUPER_DELUXE, SUPER_DELUXE_BALCONY],
  'hotel-downtown-sector-51-noida': [DELUXE, SUPER_DELUXE, SUPER_DELUXE_BALCONY],
  'hotel-downtown-sector-15-noida': [DELUXE, SUPERIOR],
}

export const getHotelRooms = (hotel: Hotel): HotelRoom[] =>
  hotel.rooms ?? ROOMS_BY_SLUG[hotel.slug] ?? DEFAULT_ROOMS

import { getApiUrl } from '../config/api'

import { useState, useEffect } from 'react'

export const STATIC_HOTELS: Hotel[] = [
  { slug: 'hotel-quadis-sector-51-noida', coords: { lat: 28.5833, lng: 77.3712 }, transit: { metro: { name: 'Sector 52 Metro', value: '5 min walk' }, airport: { name: 'IGI Airport T3', value: '32 km · 55 min' }, rail: { name: 'New Delhi Railway Station', value: '24 km' }, landmark: { name: 'Sector 51 Market', note: 'dining & retail' } }, name: 'Hotel Quadis Sector 51', area: 'Sector 51', city: 'Noida', address: 'H-22, Hoshiarpur Village, Sector 51, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.6, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-quadis-central-sector-27-noida', coords: { lat: 28.5778, lng: 77.3243 }, transit: { metro: { name: 'Sector 18 Metro', value: '10 min walk' }, airport: { name: 'IGI Airport T3', value: '28 km · 45 min' }, rail: { name: 'Nizamuddin Railway Station', value: '15 km' }, landmark: { name: 'Atta Market', note: 'dining & retail' } }, name: 'Hotel Quadis Central', area: 'Sector 27', city: 'Noida', address: 'D-192, E Block, Pocket E, Sector 27, Noida, Uttar Pradesh 201301', price: 1799, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-sector-15-noida', coords: { lat: 28.5847, lng: 77.3129 }, transit: { metro: { name: 'Sector 15 Metro', value: '2 min walk' }, airport: { name: 'IGI Airport T3', value: '26 km · 40 min' }, rail: { name: 'Nizamuddin Railway Station', value: '13 km' }, landmark: { name: 'Sector 15 Indian Oil', note: 'Metro Pillar 33' } }, name: 'Hotel Downtown Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'Metro pillar no. 33, Opposite, New Ashok Nagar Rd, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-cladis-sector-15-noida', coords: { lat: 28.5855, lng: 77.311 }, transit: { metro: { name: 'Sector 15 Metro', value: '4 min walk' }, airport: { name: 'IGI Airport T3', value: '26 km · 40 min' }, rail: { name: 'Nizamuddin Railway Station', value: '13 km' }, landmark: { name: 'Naya Bans Village', note: 'neighbourhood' } }, name: 'Hotel Cladis Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'New Ashok Nagar Rd, opposite metro pillar no. 36, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1499, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-cladis-sector-19-noida', coords: { lat: 28.583, lng: 77.321 }, transit: { metro: { name: 'Sector 16 Metro', value: '8 min walk' }, airport: { name: 'IGI Airport T3', value: '27 km · 45 min' }, rail: { name: 'Nizamuddin Railway Station', value: '14 km' }, landmark: { name: 'Indo Gulf Hospital', note: 'landmark' } }, name: 'Hotel Cladis Sector 19 Noida', area: 'Sector 19', city: 'Noida', address: 'A-369, A Block, Pocket A, Sector 19, Noida, Uttar Pradesh 201301', price: 1399, rating: 4.3, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-sector-51-noida', coords: { lat: 28.5815, lng: 77.375 }, transit: { metro: { name: 'Sector 52 Metro', value: '10 min walk' }, airport: { name: 'IGI Airport T3', value: '33 km · 55 min' }, rail: { name: 'New Delhi Railway Station', value: '25 km' }, landmark: { name: 'Kendriya Vihar', note: 'neighbourhood' } }, name: 'Hotel Downtown Sector 51 Noida', area: 'Sector 51', city: 'Noida', address: 'House No : C-155, Sector 51, Noida, Uttar Pradesh 201304', price: 1699, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-east-of-kailash', coords: { lat: 28.555, lng: 77.245 }, transit: { metro: { name: 'Kailash Colony Metro', value: '5 min walk' }, airport: { name: 'IGI Airport T3', value: '18 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '4 km' }, landmark: { name: 'ISKCON Temple', note: 'landmark' } }, name: 'Hotel Downtown EOK', area: 'East of Kailash', city: 'New Delhi', address: 'B-14, B Block, East of Kailash, New Delhi, Delhi 110065', price: 1999, rating: 4.6, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-amby-inn-lajpat-nagar-ii', coords: { lat: 28.57, lng: 77.24 }, transit: { metro: { name: 'Lajpat Nagar Metro', value: '3 min walk' }, airport: { name: 'IGI Airport T3', value: '19 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '5 km' }, landmark: { name: 'Central Market', note: 'dining & retail' } }, name: 'Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'M13, Vinoba Puri, Block M, Lajpat Nagar II, Lajpat Nagar, New Delhi, Delhi 110024', price: 1899, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-amar-in', coords: { lat: 28.571, lng: 77.2415 }, transit: { metro: { name: 'Lajpat Nagar Metro', value: '4 min walk' }, airport: { name: 'IGI Airport T3', value: '19 km · 35 min' }, rail: { name: 'Nizamuddin Railway Station', value: '5 km' }, landmark: { name: 'Jal Vihar', note: 'neighbourhood' } }, name: 'Hotel Amar Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'K-102, Road, near Central Market, Block K, Lajpat Nagar II, Jal Vihar, New Delhi, Delhi 110024', price: 1799, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
]

export const HOTELS: Hotel[] = STATIC_HOTELS

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
            // authoritative for operational data (price, surcharge, tier), but
            // editorial content — transit facts, hand-written area labels — only
            // lives here. Replacing outright silently blanked the "Getting here"
            // panel the moment the API responded.
            const staticBySlug = new Map(STATIC_HOTELS.map((s) => [s.slug, s]))

            cachedHotels = json.data.map((h: any): Hotel => {
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
                price: h.base_price,
                weekendSurchargePercent: h.weekend_surcharge_percent,
                rating: h.rating,
                tier: h.tier || 'central',
                tierLabel: h.tier_label || 'Quadis Central',
              }
            })
            listeners.forEach(l => l())
          }
        })
        .catch(e => console.error('Failed to fetch hotels', e))
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
  { name: 'Rishikesh', location: 'Rishikesh, Uttarakhand', image: '/images/upcoming/rishikesh.png', badge: 'COMING SOON' },
  { name: 'Agra', location: 'Agra, Uttar Pradesh', image: '/images/upcoming/agra.png', badge: 'COMING SOON' },
  { name: 'Chandigarh', location: 'Chandigarh, Punjab', image: '/images/upcoming/chandigarh.jpg', badge: 'COMING SOON' },
  { name: 'Dehradun', location: 'Dehradun, Uttarakhand', image: '/images/upcoming/dehradun.jpg', badge: 'COMING SOON' },
  { name: 'Faridabad', location: 'Faridabad, Haryana', image: '/images/upcoming/faridabad.png', badge: 'COMING SOON' },
  { name: 'Gurgaon', location: 'Gurgaon, Haryana', image: '/images/upcoming/gurgaon.jpg', badge: 'COMING SOON' },
  { name: 'Manesar', location: 'Manesar, Haryana', image: '/images/upcoming/manesar.png', badge: 'COMING SOON' },
  { name: 'New Delhi', location: 'New Delhi', image: '/images/upcoming/delhi.jpg', badge: 'COMING SOON' },
]

export const CITIES: City[] = ['Noida', 'New Delhi']
export const CITY_FILTERS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi']
export const TIER_FILTERS: readonly TierFilter[] = ['All Tiers', 'central', 'select', 'experience']

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
