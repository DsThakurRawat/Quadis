// Shared domain types (§5 single source of truth). The backend API will reuse
// these same shapes, so treat them as the contract between UI and future server.

export type City = 'Noida' | 'New Delhi'

export type MealPlan = 'Room Only' | 'With Breakfast' | 'All Meals Included'

export interface RoomMealOption {
  plan: MealPlan
  priceOffset: number // INR added per night
}

export interface HotelRoom {
  id: string // e.g. 'deluxe-room', 'superior-room', 'royal-suite'
  name: string
  description: string
  size: string // e.g. '240 sq ft'
  bed: string // e.g. 'King Bed'
  maxGuests: number
  basePriceOffset: number // INR added to base hotel price per night
  mealOptions: RoomMealOption[]
}

export interface Hotel {
  slug: string
  name: string
  area: string
  city: City
  address: string
  price: number // INR per night
  rating: number // 0–5
  rooms?: HotelRoom[]
}

export interface BanquetVenue {
  slug: string
  name: string
  area: string
  city: City
  capacity: number // max guests
  hallArea: string
  catering: string
  parking: string
}

/* ---------- Form payloads (submitted to the backend later) ---------- */

export type ContactType = 'General' | 'Booking' | 'Banquet' | 'Corporate' | 'Feedback'

export interface ContactPayload {
  name: string
  email: string
  phone: string
  type: ContactType
  message: string
}

export interface EnquiryPayload {
  name: string
  phone: string
  email: string
  date: string
  guests: string
  message: string
}
/** @deprecated alias — use EnquiryPayload */
export type BanquetEnquiryPayload = EnquiryPayload

export interface CorporateRFPPayload {
  company: string
  person: string
  email: string
  phone: string
  city: string
  rooms: string
  message: string
}

export interface BookingQuery {
  hotelSlug: string
  checkin: string
  checkout: string
  rooms: number
  guests: number
  roomType?: string
  mealPlan?: MealPlan
}
/** @deprecated alias — use BookingQuery */
export type BookingRequest = BookingQuery

export interface LoginPayload {
  id: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  fullName: string
  username: string
  email: string
  phone: string
  password: string
  referral: string
  terms: boolean
}

/* ---------- UI helpers ---------- */

export type CityFilter = 'All' | City | 'Upcoming'

/** Generic map of field-name → error message for a form's values. */
export type FormErrors<T> = Partial<Record<keyof T, string>>
