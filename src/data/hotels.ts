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

export const getHotelRooms = (hotel: Hotel): HotelRoom[] => hotel.rooms ?? DEFAULT_ROOMS

import { getApiUrl } from '../config/api'

import { useState, useEffect } from 'react'

export const STATIC_HOTELS: Hotel[] = [
  { slug: 'hotel-quadis-sector-51-noida', coords: { lat: 28.5833, lng: 77.3712 }, transit: { metro: 'Sector 52 Station — 5 min walk', airport: 'IGI Airport — 32 km / 55 min', rail: 'New Delhi Rly — 24 km', landmark: 'Sector 51 Market' }, name: 'Hotel Quadis Sector 51', area: 'Sector 51', city: 'Noida', address: 'H-22, Hoshiarpur Village, Sector 51, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.6, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-quadis-central-sector-27-noida', coords: { lat: 28.5778, lng: 77.3243 }, transit: { metro: 'Sector 18 Station — 10 min walk', airport: 'IGI Airport — 28 km / 45 min', rail: 'Nizamuddin Rly — 15 km', landmark: 'Atta Market' }, name: 'Hotel Quadis Central', area: 'Sector 27', city: 'Noida', address: 'D-192, E Block, Pocket E, Sector 27, Noida, Uttar Pradesh 201301', price: 1799, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-sector-15-noida', coords: { lat: 28.5847, lng: 77.3129 }, transit: { metro: 'Sector 15 Station — 2 min walk', airport: 'IGI Airport — 26 km / 40 min', rail: 'Nizamuddin Rly — 13 km', landmark: 'Sector 15 Indian Oil / Metro Pillar 33' }, name: 'Hotel Downtown Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'Metro pillar no. 33, Opposite, New Ashok Nagar Rd, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-cladis-sector-15-noida', coords: { lat: 28.5855, lng: 77.311 }, transit: { metro: 'Sector 15 Station — 4 min walk', airport: 'IGI Airport — 26 km / 40 min', rail: 'Nizamuddin Rly — 13 km', landmark: 'Naya Bans Village' }, name: 'Hotel Cladis Sector 15 Noida', area: 'Sector 15', city: 'Noida', address: 'New Ashok Nagar Rd, opposite metro pillar no. 36, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1499, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-cladis-sector-19-noida', coords: { lat: 28.583, lng: 77.321 }, transit: { metro: 'Sector 16 Station — 8 min walk', airport: 'IGI Airport — 27 km / 45 min', rail: 'Nizamuddin Rly — 14 km', landmark: 'Indo Gulf Hospital' }, name: 'Hotel Cladis Sector 19 Noida', area: 'Sector 19', city: 'Noida', address: 'A-369, A Block, Pocket A, Sector 19, Noida, Uttar Pradesh 201301', price: 1399, rating: 4.3, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-sector-51-noida', coords: { lat: 28.5815, lng: 77.375 }, transit: { metro: 'Sector 52 Station — 10 min walk', airport: 'IGI Airport — 33 km / 55 min', rail: 'New Delhi Rly — 25 km', landmark: 'Kendriya Vihar' }, name: 'Hotel Downtown Sector 51 Noida', area: 'Sector 51', city: 'Noida', address: 'House No : C-155, Sector 51, Noida, Uttar Pradesh 201304', price: 1699, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-downtown-east-of-kailash', coords: { lat: 28.555, lng: 77.245 }, transit: { metro: 'Kailash Colony — 5 min walk', airport: 'IGI Airport — 18 km / 35 min', rail: 'Nizamuddin Rly — 4 km', landmark: 'ISKCON Temple' }, name: 'Hotel Downtown EOK', area: 'East of Kailash', city: 'New Delhi', address: 'B-14, B Block, East of Kailash, New Delhi, Delhi 110065', price: 1999, rating: 4.6, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-amby-inn-lajpat-nagar-ii', coords: { lat: 28.57, lng: 77.24 }, transit: { metro: 'Lajpat Nagar Station — 3 min walk', airport: 'IGI Airport — 19 km / 35 min', rail: 'Nizamuddin Rly — 5 km', landmark: 'Central Market' }, name: 'Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'M13, Vinoba Puri, Block M, Lajpat Nagar II, Lajpat Nagar, New Delhi, Delhi 110024', price: 1899, rating: 4.5, tier: 'central', tierLabel: 'Quadis Central' },
  { slug: 'hotel-amar-in', coords: { lat: 28.571, lng: 77.2415 }, transit: { metro: 'Lajpat Nagar Station — 4 min walk', airport: 'IGI Airport — 19 km / 35 min', rail: 'Nizamuddin Rly — 5 km', landmark: 'Jal Vihar' }, name: 'Hotel Amar Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'K-102, Road, near Central Market, Block K, Lajpat Nagar II, Jal Vihar, New Delhi, Delhi 110024', price: 1799, rating: 4.4, tier: 'central', tierLabel: 'Quadis Central' },
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
            cachedHotels = json.data.map((h: any) => ({
              slug: h.slug,
              name: h.name,
              area: h.name.includes('Sector') ? `Sector ${h.name.split('Sector ')[1]}` : h.name.split(' ').slice(-2).join(' '),
              city: h.city as City,
              address: h.address,
              coords: h.lat != null && h.lng != null
                ? { lat: Number(h.lat), lng: Number(h.lng), placeId: h.place_id ?? undefined }
                : undefined,
              price: h.base_price,
              weekendSurchargePercent: h.weekend_surcharge_percent,
              rating: h.rating,
              tier: h.tier || 'central',
              tierLabel: h.tier_label || 'Quadis Central'
            }))
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
