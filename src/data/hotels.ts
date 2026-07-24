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

export const getHotelRooms = (hotel: Hotel): HotelRoom[] => hotel.rooms ?? DEFAULT_ROOMS

// §5 — single source of truth. Every hotel UI renders from this array.
// Backend drop-in: replace this export with a fetch() of the same shape.
export const HOTELS: Hotel[] = [
  { slug: 'hotel-cladis-sector-51-noida', name: 'Hotel Cladis Sector 51', area: 'Sector 51', city: 'Noida', address: 'H-22, Sector 51, near Cloud9 Hospital, Noida', price: 1899, rating: 4.7 },
  { slug: 'hotel-quadis-sector-51-noida', name: 'Hotel Quadis Sector 51', area: 'Sector 51', city: 'Noida', address: 'H-22, Hoshiarpur Village, Sector 51, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.6 },
  { slug: 'hotel-quadis-central-sector-27-noida', name: 'Hotel Quadis Central', area: 'Sector 27', city: 'Noida', address: 'D-192, E Block, Pocket E, Sector 27, Noida, Uttar Pradesh 201301', price: 1799, rating: 4.5 },
  { slug: 'hotel-downtown-sector-15-noida', name: 'Hotel Downtown Sector 15', area: 'Sector 15', city: 'Noida', address: 'Metro pillar no. 33, Opposite, New Ashok Nagar Rd, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1599, rating: 4.4 },
  { slug: 'hotel-cladis-sector-15-noida', name: 'Hotel Cladis Sector 15', area: 'Sector 15', city: 'Noida', address: 'New Ashok Nagar Rd, opposite metro pillar no. 36, Naya Bans, Naya Bans Village, Sector 15, Noida, Uttar Pradesh 201301', price: 1499, rating: 4.4 },
  { slug: 'hotel-cladis-sector-19-noida', name: 'Hotel Cladis Sector 19', area: 'Sector 19', city: 'Noida', address: 'A-369, A Block, Pocket A, Sector 19, Noida, Uttar Pradesh 201301', price: 1399, rating: 4.3 },
  { slug: 'hotel-downtown-sector-51-noida', name: 'Hotel Downtown Sector 51', area: 'Sector 51', city: 'Noida', address: 'House No : C-158, Sector 51, Noida, Uttar Pradesh 201304', price: 1699, rating: 4.5 },
  { slug: 'hotel-downtown-east-of-kailash', name: 'Hotel Downtown-EOK', area: 'East of Kailash', city: 'New Delhi', address: 'B-14, B Block, East of Kailash, New Delhi, Delhi 110065', price: 1999, rating: 4.6 },
  { slug: 'hotel-amby-inn-lajpat-nagar-ii', name: 'Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'M13, Vinoba Puri, Block M, Lajpat Nagar II, Lajpat Nagar, New Delhi, Delhi 110024', price: 1899, rating: 4.5 },
  { slug: 'hotel-amar-in', name: 'Hotel Amar Inn', area: 'Lajpat Nagar', city: 'New Delhi', address: 'K-102, Road, near Central Market, Block K, Lajpat Nagar II, Jal Vihar, New Delhi, Delhi 110024', price: 1799, rating: 4.4 },
]

export const UPCOMING_HOTELS: UpcomingHotel[] = [
  { name: 'OPO Hotel Rishikesh', location: 'Rishikesh, Uttarakhand', image: '/images/upcoming/rishikesh.png', badge: 'COMING SOON' },
  { name: 'OPO Hotels Agra', location: 'Agra, Uttar Pradesh', image: '/images/upcoming/agra.png', badge: 'COMING SOON' },
  { name: 'OPO Hotels Chandigarh', location: 'Chandigarh, Punjab', image: '/images/upcoming/chandigarh.jpg', badge: 'COMING SOON' },
  { name: 'OPO Hotels Dehradun', location: 'Dehradun, Uttarakhand', image: '/images/upcoming/dehradun.jpg', badge: 'COMING SOON' },
  { name: 'OPO Hotels Faridabad', location: 'Faridabad, Haryana', image: '/images/upcoming/faridabad.png', badge: 'COMING SOON' },
  { name: 'OPO Hotels Gurgaon', location: 'Gurgaon, Haryana', image: '/images/upcoming/gurgaon.jpg', badge: 'COMING SOON' },
  { name: 'OPO Hotels Manesar', location: 'Manesar, Haryana', image: '/images/upcoming/manesar.png', badge: 'COMING SOON' },
  { name: 'OPO Hotels Delhi', location: 'New Delhi', image: '/images/upcoming/delhi.jpg', badge: 'COMING SOON' },
]

export const CITIES: City[] = ['Noida', 'New Delhi']
export const CITY_FILTERS: readonly CityFilter[] = ['All', 'Noida', 'New Delhi', 'Upcoming']

// Banquet venues — §4/§6.4. Capacities are representative venue specs.
export const BANQUETS: BanquetVenue[] = [
  { slug: 'banquets-at-hotel-amby-inn', name: 'Banquets at Hotel Amby Inn', area: 'Lajpat Nagar', city: 'New Delhi', capacity: 350, hallArea: '4,200 sq ft', catering: 'Veg & Non-veg', parking: 'Valet available' },
  { slug: 'banquets-at-hotel-cladis', name: 'Banquets at Hotel Cladis', area: 'Sector 51', city: 'Noida', capacity: 500, hallArea: '6,000 sq ft', catering: 'Veg & Non-veg', parking: 'On-site parking' },
  { slug: 'banquets-at-hotel-downtown-eok', name: 'Banquets at Hotel Downtown EOK', area: 'East of Kailash', city: 'New Delhi', capacity: 300, hallArea: '3,600 sq ft', catering: 'Veg & Non-veg', parking: 'Valet available' },
  { slug: 'banquets-at-hotel-downtown-sector-51', name: 'Banquets at Hotel Downtown Sector 51', area: 'Sector 51', city: 'Noida', capacity: 450, hallArea: '5,200 sq ft', catering: 'Veg & Non-veg', parking: 'On-site parking' },
]

// ₹1,899 / night  (Indian comma grouping)
export const inr = (n: number): string => '₹' + Number(n).toLocaleString('en-IN')
export const priceNight = (n: number): string => `${inr(n)} / night`
export const stars = (r: number): string => `★ ${r.toFixed(1)}`
