import type { MealPlan } from '../types'

/**
 * Single source of truth for what a stay costs.
 *
 * The frontend mirrors this in src/lib/pricing.ts so the quoted price and the
 * charged price agree. If you change the rule here, change it there too.
 */

export interface RoomMealOffsets {
  breakfast_offset: number
  all_meals_offset: number
}

/* ---------- Occupancy ---------- */

/**
 * Every rate on this site is quoted for two adults sharing a room. A third
 * adult is an extra bed, not a free upgrade.
 *
 * The rule, in the client's own words (WhatsApp, 26 Jul 2026):
 *   "Double occupancy room ka 40% increase hoga triple mein"
 *   "And agar teesra person adult hain only then"
 *   "If it's child then no"
 *
 * So: a third ADULT adds 40% of that night's room rate. A child adds nothing.
 * It is a percentage rather than a flat sum, so it tracks the room rate and the
 * weekend surcharge automatically — a triple on a surcharged Friday costs 40%
 * more than that Friday's double, not 40% more than a weekday double.
 *
 * The live figures are per property, set from the admin panel and stored on
 * `properties` (`extra_adult_percent`, `child_free_under_age`). These constants
 * are only the fallbacks for a record that predates those columns.
 */
export const DEFAULT_EXTRA_ADULT_PERCENT = 40

/** Adults included in the advertised nightly rate, per room. */
export const STANDARD_OCCUPANCY_PER_ROOM = 2

/**
 * Fallback age below which a guest counts as a child and is never charged.
 *
 * 18, because the client's rule is "if it's child then no" — children do not
 * trigger the increase at any age. Admin-settable per property, so a hotel that
 * wants to charge for, say, 12-and-over can lower it.
 */
export const DEFAULT_CHILD_FREE_UNDER_AGE = 18

/** The occupancy policy in force for one property. */
export interface OccupancyPolicy {
  /** Percentage of the nightly room rate added per extra adult. */
  extraAdultPercent: number
  childFreeUnderAge: number
}

/** Reads the policy off a property row, falling back for older records. */
export function policyFor(property: {
  extra_adult_percent?: number | string | null
  child_free_under_age?: number | string | null
} | null | undefined): OccupancyPolicy {
  const percent = Number(property?.extra_adult_percent)
  const age = Number(property?.child_free_under_age)
  return {
    extraAdultPercent:
      Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_EXTRA_ADULT_PERCENT,
    childFreeUnderAge: Number.isFinite(age) && age >= 0 ? age : DEFAULT_CHILD_FREE_UNDER_AGE,
  }
}

export interface OccupancyInput {
  adults: number
  /**
   * One entry per child. Ages at or above the property's childFreeUnderAge are
   * charged as adults; younger children are free.
   */
  childAges?: number[]
  roomsCount: number
  /** Defaults to the group-wide fallback when a property has no policy set. */
  childFreeUnderAge?: number
}

/** Children old enough to need their own bed, and therefore their own charge. */
export function chargeableChildren(
  childAges: number[] | undefined,
  childFreeUnderAge: number = DEFAULT_CHILD_FREE_UNDER_AGE
): number {
  if (!Array.isArray(childAges)) return 0
  return childAges.filter((age) => Number(age) >= childFreeUnderAge).length
}

/**
 * Heads that must be paid for beyond what the room rate already covers.
 *
 * Counts across the whole booking rather than per room: three adults in two
 * rooms are within the four included places and pay no extra, which is what a
 * guest booking two rooms expects.
 */
export function extraAdultsFor(input: OccupancyInput): number {
  const paying =
    (Number(input.adults) || 0) + chargeableChildren(input.childAges, input.childFreeUnderAge)
  const included = STANDARD_OCCUPANCY_PER_ROOM * (Number(input.roomsCount) || 1)
  return Math.max(0, paying - included)
}

/* ---------- Nightly rate ---------- */

/** Fri and Sat nights carry the property's weekend surcharge. */
export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 5 || day === 6
}

export function mealOffsetFor(plan: MealPlan | undefined, room: Partial<RoomMealOffsets>): number {
  if (plan === 'With Breakfast') return Number(room.breakfast_offset) || 0
  if (plan === 'All Meals Included') return Number(room.all_meals_offset) || 0
  return 0
}

export interface StayPricingInput {
  basePrice: number
  roomOffset: number
  mealOffset: number
  weekendSurchargePercent: number
  checkIn: string
  checkOut: string
  roomsCount: number
  /**
   * Adults beyond the two included per room, from extraAdultsFor(). Each adds
   * extraAdultPercent of that night's room rate, for every night of the stay.
   */
  extraAdults?: number
  /** The property's admin-set percentage uplift per extra adult. */
  extraAdultPercent?: number
}

export interface StayPricingBreakdown {
  nights: number
  /** Room charge for the whole stay, all rooms, weekend surcharge included. */
  roomTotal: number
  /** Extra-adult charge for the whole stay. */
  extraAdultTotal: number
  extraAdults: number
  /** The percentage applied, so callers can display and store it. */
  extraAdultPercent: number
  /**
   * Rupees per extra adult per night, averaged over the stay. Derived, not an
   * input — stored on the booking so an invoice can show a figure, and averaged
   * because a stay spanning a weekend surcharge has more than one nightly rate.
   */
  extraAdultChargePerNight: number
  total: number
}

/**
 * Prices each night individually so weekend nights can carry the surcharge,
 * multiplies by room count, then adds the extra-adult uplift. Returns whole
 * paise-accurate rupees.
 *
 * The uplift is a percentage of *that night's* room rate, accumulated inside the
 * same loop. That matters when a stay straddles a weekend: a Friday triple is
 * 40% above the surcharged Friday double, not 40% above a weekday rate.
 *
 * It is charged per extra adult and NOT multiplied by room count — one extra
 * person occupies one extra bed, however many rooms the booking spans.
 */
export function computeStayBreakdown(input: StayPricingInput): StayPricingBreakdown {
  const nightly =
    (Number(input.basePrice) || 0) + (Number(input.roomOffset) || 0) + (Number(input.mealOffset) || 0)
  const surcharge = Number(input.weekendSurchargePercent) || 0

  const extraAdults = Math.max(0, Number(input.extraAdults) || 0)
  const rooms = Number(input.roomsCount) || 1

  const rawPercent = Number(input.extraAdultPercent)
  const extraAdultPercent =
    Number.isFinite(rawPercent) && rawPercent >= 0 ? rawPercent : DEFAULT_EXTRA_ADULT_PERCENT

  const end = new Date(input.checkOut)
  const cursor = new Date(input.checkIn)

  /**
   * The uplift for one extra adult on a night at `rate`, in whole rupees.
   *
   * Rounded per night rather than at the end: 40% of ₹1,599 is ₹639.60, and a
   * hotel quotes ₹640. Leaving it unrounded surfaced totals like "₹2,238.6" in
   * the guest's summary, which reads as a bug rather than a price.
   */
  const upliftPerAdult = (rate: number) => Math.round(rate * (extraAdultPercent / 100))

  let roomTotal = 0
  let extraAdultTotal = 0
  let nights = 0
  while (cursor < end) {
    const rate = isWeekendNight(cursor) ? nightly * (1 + surcharge / 100) : nightly
    roomTotal += rate
    extraAdultTotal += upliftPerAdult(rate) * extraAdults
    nights += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Never bill a zero-night stay as free. Callers reject checkout <= check-in
  // before reaching here, so this is a floor rather than a real code path.
  if (nights === 0) {
    roomTotal = nightly
    extraAdultTotal = upliftPerAdult(nightly) * extraAdults
    nights = 1
  }

  const round = (n: number) => Math.round(n * 100) / 100
  const roomCharge = round(roomTotal * rooms)
  const extraCharge = round(extraAdultTotal)

  return {
    nights,
    roomTotal: roomCharge,
    extraAdultTotal: extraCharge,
    extraAdults,
    extraAdultPercent,
    extraAdultChargePerNight: extraAdults > 0 ? round(extraCharge / (extraAdults * nights)) : 0,
    total: round(roomCharge + extraCharge),
  }
}

export function computeStayTotal(input: StayPricingInput): number {
  return computeStayBreakdown(input).total
}
