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

export type QuadisTier = 'central' | 'select' | 'experience'

/**
 * A real place, not a search string. When present, maps and directions point at
 * exact coordinates instead of whatever Google's geocoder guesses from the
 * address text. `placeId` makes a directions link resolve to the business
 * listing rather than a dropped pin.
 */
export interface HotelCoords {
  lat: number
  lng: number
  placeId?: string
}

/**
 * One row of the "Getting here" panel: the place on the left, how far on the
 * right — "Sector 52 Metro · Blue Line" … "9 min walk".
 */
export interface TransitFact {
  name: string
  /** Muted qualifier after the name, e.g. 'Blue Line' or 'dining & retail'. */
  note?: string
  /** Distance and/or time. Omitted when only proximity is known. */
  value?: string
}

/**
 * The four facts an NCR guest actually needs, which a map cannot convey.
 * Every field is optional — a fact we haven't verified is simply not shown.
 * Never invent these; a wrong walk time is worse than a missing one.
 */
export interface HotelTransit {
  metro?: TransitFact
  airport?: TransitFact
  rail?: TransitFact
  landmark?: TransitFact
}

export interface Hotel {
  slug: string
  name: string
  area: string
  city: City
  address: string
  coords?: HotelCoords
  transit?: HotelTransit
  price: number // INR per night
  weekendSurchargePercent?: number
  rating: number // 0–5
  tier: QuadisTier
  tierLabel: 'Quadis Central' | 'Quadis Select' | 'Quadis Experience'
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

export interface UpcomingHotel {
  name: string
  location: string
  image?: string
  badge?: string
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

export type CityFilter = 'All' | City
export type TierFilter = 'All Tiers' | QuadisTier

/** Generic map of field-name → error message for a form's values. */
export type FormErrors<T> = Partial<Record<keyof T, string>>

/* ---------- Database & API Record Interfaces ---------- */

export interface PropertyRecord {
  id: string
  slug: string
  name: string
  city: City
  address: string
  map_link?: string
  phone: string
  whatsapp: string
  email: string
  base_price: number
  rating: number
  is_active: boolean
  weekend_surcharge_percent: number
  tier: QuadisTier
  tier_label: 'Quadis Central' | 'Quadis Select' | 'Quadis Experience'
}

export interface RoomTypeRecord {
  id: string
  property_id: string
  slug: string
  name: string
  description: string
  size_sqft: string
  bed_type: string
  max_guests: number
  price_offset: number
  total_units: number
  available_units: number
}

export interface BookingRecord {
  id: string
  booking_code: string
  property_id: string
  room_type_id: string
  guest_name: string
  guest_phone: string
  guest_email?: string
  company_name?: string
  gstin?: string
  check_in: string
  check_out: string
  rooms_count: number
  guests_count: number
  total_amount: number
  payment_mode: 'INSTANT_FULL_PAYMENT' | 'TOKEN_DEPOSIT' | 'ENQUIRY_PAYMENT_LINK'
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_payment_link_id?: string
  booking_status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
  created_at: Date | string
}

export interface EnquiryRecord {
  id: string
  enquiry_type: 'ROOM_HOLD' | 'BANQUET' | 'CORPORATE_RFP' | 'GENERAL'
  property_id?: string
  guest_name: string
  guest_phone: string
  guest_email?: string
  event_date?: string
  guest_count?: number
  message?: string
  status: 'NEW' | 'CONTACTED' | 'LINK_SENT' | 'CONVERTED' | 'CLOSED'
  razorpay_payment_link_id?: string
  created_at: Date | string
}

export interface ChatLogRecord {
  id: string
  session_id: string
  user_message: string
  bot_response: string
  tools_invoked?: string[]
  handoff_triggered: boolean
  created_at: Date | string
}
