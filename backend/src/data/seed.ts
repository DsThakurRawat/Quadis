import { PropertyRecord, RoomTypeRecord } from '../types'

export const seedProperties: PropertyRecord[] = [
  { id: 'prop-2', slug: 'hotel-quadis-sector-51-noida', lat: 28.5833, lng: 77.3712, name: 'Hotel Quadis Sector 51', city: 'Noida', address: 'H-22, Hoshiarpur Village, Sector 51, Noida, Uttar Pradesh 201301', map_link: 'https://share.google/X3cBuD2gbz27Jf5Ct', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1599, rating: 4.6, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-3', slug: 'hotel-quadis-central-sector-27-noida', lat: 28.5778, lng: 77.3243, name: 'Hotel Quadis Central', city: 'Noida', address: 'D-192, E Block, Pocket E, Sector 27, Noida, Uttar Pradesh 201301', map_link: 'https://share.google/VGqI5StPFPeLyZIMO', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1799, rating: 4.5, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-4', slug: 'hotel-downtown-sector-15-noida', lat: 28.5847, lng: 77.3129, name: 'Hotel Downtown Sector 15 Noida', city: 'Noida', address: 'Metro pillar no. 33, Opposite, New Ashok Nagar Rd, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', map_link: 'https://share.google/oTnXw9glnDyZei1tL', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1599, rating: 4.4, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-5', slug: 'hotel-cladis-sector-15-noida', lat: 28.5855, lng: 77.311, name: 'Hotel Cladis Sector 15 Noida', city: 'Noida', address: 'New Ashok Nagar Rd, opposite metro pillar no. 36, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', map_link: 'https://share.google/nHWsuom2pwTNGRgfY', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1499, rating: 4.4, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-6', slug: 'hotel-cladis-sector-19-noida', lat: 28.583, lng: 77.321, name: 'Hotel Cladis Sector 19 Noida', city: 'Noida', address: 'A-369, A Block, Pocket A, Sector 19, Noida, Uttar Pradesh 201301', map_link: 'https://share.google/2YthY0ZjkrW3jnT3n', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1399, rating: 4.3, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-7', slug: 'hotel-downtown-sector-51-noida', lat: 28.5815, lng: 77.375, name: 'Hotel Downtown Sector 51 Noida', city: 'Noida', address: 'House No : C-155, Sector 51, Noida, Uttar Pradesh 201304', map_link: 'https://share.google/Mwl1FiCVC8ucqXrd', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1699, rating: 4.5, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-8', slug: 'hotel-downtown-east-of-kailash', lat: 28.555, lng: 77.245, name: 'Hotel Downtown EOK', city: 'New Delhi', address: 'B-14, B Block, East of Kailash, New Delhi, Delhi 110065', map_link: 'https://share.google/3RsBzxkp8xV1e0AuY', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1999, rating: 4.6, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-9', slug: 'hotel-amby-inn-lajpat-nagar-ii', lat: 28.57, lng: 77.24, name: 'Hotel Amby Inn', city: 'New Delhi', address: 'M13, Vinoba Puri, Block M, Lajpat Nagar II, Lajpat Nagar, New Delhi, Delhi 110024', map_link: 'https://share.google/pSTT03I5OWszpSj5c', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1899, rating: 4.5, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
  { id: 'prop-10', slug: 'hotel-amar-in', lat: 28.571, lng: 77.2415, name: 'Hotel Amar Inn', city: 'New Delhi', address: 'K-102, Road, near Central Market, Block K, Lajpat Nagar II, Jal Vihar, New Delhi, Delhi 110024', map_link: 'https://share.google/IQLx35cfOmLf93S2o', phone: '+91 92173 73532', whatsapp: '+91 92173 73532', email: 'stay@quadishotels.com', base_price: 1799, rating: 4.4, is_active: true, weekend_surcharge_percent: 0, tier: 'central', tier_label: 'Quadis Central' },
]

type RoomTemplate = Omit<RoomTypeRecord, 'id' | 'property_id'>

const DELUXE: RoomTemplate = {
  slug: 'deluxe-room',
  name: 'Deluxe Room',
  description: 'Calm, refined comfort designed for effortless rest. Features plush bedding and executive workspace.',
  size_sqft: '240 sq ft',
  bed_type: 'King / Twin Beds',
  max_guests: 2,
  price_offset: 0,
  breakfast_offset: 300,
  all_meals_offset: 800,
  total_units: 5,
  available_units: 5,
  is_available: true,
}

const SUPERIOR: RoomTemplate = {
  slug: 'superior-room',
  name: 'Superior Room with Balcony',
  description: 'Elevated space with private outdoor seating and expansive city views.',
  size_sqft: '310 sq ft',
  bed_type: 'King Bed + Balcony',
  max_guests: 3,
  price_offset: 400,
  breakfast_offset: 350,
  all_meals_offset: 900,
  total_units: 3,
  available_units: 3,
  is_available: true,
}

const ROYAL: RoomTemplate = {
  slug: 'royal-suite',
  name: 'Royal Suite',
  description: 'Our most luxurious sanctuary featuring separate master bedroom, private lounge and dining area.',
  size_sqft: '450 sq ft',
  bed_type: 'Master Suite + Living Room',
  max_guests: 4,
  price_offset: 1200,
  breakfast_offset: 450,
  all_meals_offset: 1200,
  total_units: 2,
  available_units: 2,
  is_available: true,
}

const SUPER_DELUXE: RoomTemplate = {
  slug: 'super-deluxe',
  name: 'Super Deluxe',
  description: 'A larger, more considered room with an upgraded seating area, high-speed Wi-Fi and evening turndown.',
  size_sqft: '290 sq ft',
  bed_type: 'King Bed',
  max_guests: 3,
  price_offset: 400,
  breakfast_offset: 350,
  all_meals_offset: 900,
  total_units: 4,
  available_units: 4,
  is_available: true,
}

const SUPER_DELUXE_BALCONY: RoomTemplate = {
  slug: 'super-deluxe-balcony',
  name: 'Super Deluxe with Balcony',
  description: 'The Super Deluxe with a private balcony — outdoor seating and open city views.',
  size_sqft: '330 sq ft',
  bed_type: 'King Bed + Balcony',
  max_guests: 3,
  price_offset: 650,
  breakfast_offset: 350,
  all_meals_offset: 900,
  total_units: 3,
  available_units: 3,
  is_available: true,
}

/**
 * Room categories differ by property (client brief, July 2026). Must stay in
 * step with ROOMS_BY_SLUG in the frontend's src/data/hotels.ts — a category the
 * site offers but the API has not seeded cannot be booked.
 */
const ROOMS_BY_SLUG: Record<string, RoomTemplate[]> = {
  'hotel-quadis-sector-51-noida': [DELUXE, SUPER_DELUXE, SUPER_DELUXE_BALCONY],
  'hotel-downtown-sector-51-noida': [DELUXE, SUPER_DELUXE, SUPER_DELUXE_BALCONY],
  'hotel-downtown-sector-15-noida': [DELUXE, SUPERIOR],
}

const DEFAULT_ROOMS: RoomTemplate[] = [DELUXE, SUPERIOR, ROYAL]

export const seedRoomTypes: RoomTypeRecord[] = seedProperties.flatMap((prop) =>
  (ROOMS_BY_SLUG[prop.slug] ?? DEFAULT_ROOMS).map((t) => ({
    ...t,
    id: `room-${prop.id}-${t.slug}`,
    property_id: prop.id,
  }))
)
