/**
 * Mirror of backend/src/lib/pricing.ts.
 *
 * The backend is authoritative for what a guest is charged; this exists so the
 * price we quote on the page is the same number. If you change the rule in one
 * file, change it in the other.
 */

/* ---------- Occupancy ---------- */

/**
 * Every rate on this site is quoted for two adults sharing a room. A third
 * adult is an extra bed, not a free upgrade.
 *
 * The rule, per the client (27 Jul 2026): a third person adds 30% of that
 * night's room rate; a CHILD adds nothing. Percentage rather than flat, so it
 * tracks the room rate and the weekend surcharge automatically. See the fuller
 * note in backend/src/lib/pricing.ts — the client has stated this three ways
 * and the child half is still unconfirmed.
 *
 * The live figures are per property and set by the hotel from the admin panel;
 * they arrive on the hotel record as `extraAdultPercent` and `childFreeUnderAge`.
 * These constants are only the fallbacks used before the API responds, or for a
 * property whose record predates those fields — so the quote degrades to the
 * group default rather than to zero.
 */
export const DEFAULT_EXTRA_ADULT_PERCENT = 30

/** Adults included in the advertised nightly rate, per room. */
export const STANDARD_OCCUPANCY_PER_ROOM = 2

/**
 * Age bands, per the client on 27 Jul 2026:
 *
 *   "for extra adult 30%, 0-7 years waalo ka free rahega stay,
 *    baki 8-12 years ka 20%"
 *
 * So three bands, not the single free/charged threshold this file used to have:
 *
 *   0-7    free
 *   8-12   20% of the nightly room rate
 *   13+    charged as an adult, currently 30%
 *
 * ASSUMPTION, NOT CONFIRMED: the client specified 0-7 and 8-12 and stopped. 13
 * to 17 is read as adult, because "baki 8-12 ka 20%" implies the concession
 * ends at 12. If they meant under-18s to stay on 20%, raise DEFAULT_ADULT_FROM_AGE.
 * Flagged in docs/client-comms/.
 */
export const DEFAULT_CHILD_FREE_UNDER_AGE = 8
export const DEFAULT_CHILD_PERCENT = 20
export const DEFAULT_ADULT_FROM_AGE = 13

/** The occupancy policy in force for one property. */
export interface OccupancyPolicy {
  /** Percentage of the nightly room rate added per extra adult. */
  extraAdultPercent: number
  /** Below this age a guest is free. */
  childFreeUnderAge: number
  /** Percentage added per child in the concession band. */
  childPercent: number
  /** At this age and above, a guest is charged as an adult. */
  adultFromAge: number
}

/**
 * Reads the policy off a hotel record. The frontend holds camelCase fields
 * mapped from the API in data/hotels.ts; the backend's mirror of this function
 * takes the raw snake_case row.
 */
export function policyFor(hotel: {
  extraAdultPercent?: number | undefined
  childFreeUnderAge?: number | undefined
  childPercent?: number | undefined
  adultFromAge?: number | undefined
} | null | undefined): OccupancyPolicy {
  const num = (v: unknown, fallback: number): number => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    extraAdultPercent: num(hotel?.extraAdultPercent, DEFAULT_EXTRA_ADULT_PERCENT),
    childFreeUnderAge: num(hotel?.childFreeUnderAge, DEFAULT_CHILD_FREE_UNDER_AGE),
    childPercent: num(hotel?.childPercent, DEFAULT_CHILD_PERCENT),
    adultFromAge: num(hotel?.adultFromAge, DEFAULT_ADULT_FROM_AGE),
  }
}

export interface OccupancyInput {
  adults: number
  /** One entry per child, their age at check-in. */
  childAges?: number[]
  roomsCount: number
  childFreeUnderAge?: number
  adultFromAge?: number
}

/** Heads beyond the included occupancy, split by the rate each is charged at. */
export interface ChargeableGuests {
  /** Charged at extraAdultPercent. */
  extraAdults: number
  /** Charged at childPercent. */
  extraChildren: number
}

/**
 * Who has to be paid for, and at which rate.
 *
 * Two adults per room are included. Guests under childFreeUnderAge are free and
 * never consume an included place — a toddler sharing the bed does not push a
 * paying guest into a surcharge.
 *
 * The included places are filled with the most expensive heads first, so any
 * excess is drawn from the cheaper band. Two adults and a ten-year-old in one
 * room therefore pay the child rate on the child, not the adult rate: the
 * adults take the two included places. Doing it the other way round would
 * quietly overcharge every family.
 *
 * Counted across the whole booking rather than per room, so three adults in two
 * rooms sit inside the four included places and pay nothing extra.
 */
export function chargeableGuestsFor(input: OccupancyInput): ChargeableGuests {
  const freeUnder = Number.isFinite(Number(input.childFreeUnderAge))
    ? Number(input.childFreeUnderAge) : DEFAULT_CHILD_FREE_UNDER_AGE
  const adultFrom = Number.isFinite(Number(input.adultFromAge))
    ? Number(input.adultFromAge) : DEFAULT_ADULT_FROM_AGE

  const ages = Array.isArray(input.childAges) ? input.childAges.map(Number) : []
  const childBand = ages.filter((a) => a >= freeUnder && a < adultFrom).length
  const adultLike = (Number(input.adults) || 0) + ages.filter((a) => a >= adultFrom).length

  const included = STANDARD_OCCUPANCY_PER_ROOM * (Number(input.roomsCount) || 1)
  const extraAdults = Math.max(0, adultLike - included)
  const includedLeft = Math.max(0, included - adultLike)

  return { extraAdults, extraChildren: Math.max(0, childBand - includedLeft) }
}

/** Children old enough to be charged at all — the 8-12 band plus any 13+. */
export function chargeableChildren(
  childAges: number[] | undefined,
  childFreeUnderAge: number = DEFAULT_CHILD_FREE_UNDER_AGE
): number {
  if (!Array.isArray(childAges)) return 0
  return childAges.filter((age) => Number(age) >= childFreeUnderAge).length
}

/**
 * Kept for callers that only need a single count. Prefer chargeableGuestsFor —
 * this collapses two different rates into one number and will under-quote a
 * booking that includes a child in the concession band.
 */
export function extraAdultsFor(input: OccupancyInput): number {
  return chargeableGuestsFor(input).extraAdults
}

/* ---------- Nightly rate ---------- */

/** Fri and Sat nights carry the property's weekend surcharge. */
export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 5 || day === 6
}

/** How many Fri/Sat nights fall inside the stay. */
export function countWeekendNights(checkIn: string, checkOut: string): number {
  const end = new Date(checkOut)
  const cursor = new Date(checkIn)
  let count = 0
  while (cursor < end) {
    if (isWeekendNight(cursor)) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
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
  /**
   * Children in the concession band (8-12 by default), from
   * chargeableGuestsFor(). Each adds childPercent of that night's room rate.
   */
  extraChildren?: number
  /** The property's admin-set percentage uplift per extra adult. */
  extraAdultPercent?: number
  /** The property's admin-set percentage uplift per concession-band child. */
  childPercent?: number
}

export interface StayPricingBreakdown {
  nights: number
  /** Room charge for the whole stay, all rooms, weekend surcharge included. */
  roomTotal: number
  /** Extra-adult charge for the whole stay. */
  extraAdultTotal: number
  extraAdults: number
  /** Concession-band child charge for the whole stay. */
  extraChildTotal: number
  extraChildren: number
  /** The percentages applied, so callers can display and store them. */
  extraAdultPercent: number
  childPercent: number
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
 * 30% above the surcharged Friday double, not 30% above a weekday rate.
 *
 * It is charged per extra adult and NOT multiplied by room count — one extra
 * person occupies one extra bed, however many rooms the booking spans.
 */
export function computeStayBreakdown(input: StayPricingInput): StayPricingBreakdown {
  const nightly =
    (Number(input.basePrice) || 0) + (Number(input.roomOffset) || 0) + (Number(input.mealOffset) || 0)
  const surcharge = Number(input.weekendSurchargePercent) || 0

  const extraAdults = Math.max(0, Number(input.extraAdults) || 0)
  const extraChildren = Math.max(0, Number(input.extraChildren) || 0)
  const rooms = Number(input.roomsCount) || 1

  const pct = (v: unknown, fallback: number): number => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  const extraAdultPercent = pct(input.extraAdultPercent, DEFAULT_EXTRA_ADULT_PERCENT)
  const childPercent = pct(input.childPercent, DEFAULT_CHILD_PERCENT)

  const end = new Date(input.checkOut)
  const cursor = new Date(input.checkIn)

  /**
   * The uplift for one extra adult on a night at `rate`, in whole rupees.
   *
   * Rounded per night rather than at the end: 30% of ₹1,799 is ₹539.70, and a
   * hotel quotes ₹640. Leaving it unrounded surfaced totals like "₹2,238.6" in
   * the guest's summary, which reads as a bug rather than a price.
   */
  const upliftPerAdult = (rate: number) => Math.round(rate * (extraAdultPercent / 100))
  const upliftPerChild = (rate: number) => Math.round(rate * (childPercent / 100))

  let roomTotal = 0
  let extraAdultTotal = 0
  let extraChildTotal = 0
  let nights = 0
  while (cursor < end) {
    const rate = isWeekendNight(cursor) ? nightly * (1 + surcharge / 100) : nightly
    roomTotal += rate
    extraAdultTotal += upliftPerAdult(rate) * extraAdults
    extraChildTotal += upliftPerChild(rate) * extraChildren
    nights += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Never bill a zero-night stay as free. Callers reject checkout <= check-in
  // before reaching here, so this is a floor rather than a real code path.
  if (nights === 0) {
    roomTotal = nightly
    extraAdultTotal = upliftPerAdult(nightly) * extraAdults
    extraChildTotal = upliftPerChild(nightly) * extraChildren
    nights = 1
  }

  const round = (n: number) => Math.round(n * 100) / 100
  const roomCharge = round(roomTotal * rooms)
  const extraCharge = round(extraAdultTotal)
  const childCharge = round(extraChildTotal)

  return {
    nights,
    roomTotal: roomCharge,
    extraAdultTotal: extraCharge,
    extraAdults,
    extraChildTotal: childCharge,
    extraChildren,
    extraAdultPercent,
    childPercent,
    extraAdultChargePerNight: extraAdults > 0 ? round(extraCharge / (extraAdults * nights)) : 0,
    total: round(roomCharge + extraCharge + childCharge),
  }
}

export function computeStayTotal(input: StayPricingInput): number {
  return computeStayBreakdown(input).total
}
