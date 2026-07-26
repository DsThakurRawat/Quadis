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
 * The rule, per the client: a third ADULT adds 40% of that night's room rate;
 * a CHILD adds nothing. Percentage rather than flat, so it tracks the room rate
 * and the weekend surcharge automatically.
 *
 * The live figures are per property and set by the hotel from the admin panel;
 * they arrive on the hotel record as `extraAdultPercent` and `childFreeUnderAge`.
 * These constants are only the fallbacks used before the API responds, or for a
 * property whose record predates those fields — so the quote degrades to the
 * group default rather than to zero.
 */
export const DEFAULT_EXTRA_ADULT_PERCENT = 40

/** Adults included in the advertised nightly rate, per room. */
export const STANDARD_OCCUPANCY_PER_ROOM = 2

/**
 * Fallback age below which a guest is a child and is never charged. 18, because
 * the client's rule is that a child never triggers the uplift at any age.
 */
export const DEFAULT_CHILD_FREE_UNDER_AGE = 18

export interface OccupancyPolicy {
  /** Percentage of the nightly room rate added per extra adult. */
  extraAdultPercent: number
  childFreeUnderAge: number
}

/** Resolves a hotel's occupancy policy, falling back to the group defaults. */
export function policyFor(hotel: {
  extraAdultPercent?: number | undefined
  childFreeUnderAge?: number | undefined
} | null | undefined): OccupancyPolicy {
  const percent = Number(hotel?.extraAdultPercent)
  const age = Number(hotel?.childFreeUnderAge)
  return {
    extraAdultPercent:
      Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_EXTRA_ADULT_PERCENT,
    childFreeUnderAge: Number.isFinite(age) && age >= 0 ? age : DEFAULT_CHILD_FREE_UNDER_AGE,
  }
}

export interface OccupancyInput {
  adults: number
  childAges?: number[]
  roomsCount: number
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

/** Heads that must be paid for beyond what the room rate already covers. */
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
  /** Adults beyond the two included per room, from extraAdultsFor(). */
  extraAdults?: number
  /** The property's admin-set percentage uplift per extra adult. */
  extraAdultPercent?: number
}

export interface StayPricingBreakdown {
  nights: number
  roomTotal: number
  extraAdultTotal: number
  extraAdults: number
  /** The percentage applied, so the UI can label the line it shows. */
  extraAdultPercent: number
  /** Rupees per extra adult per night, averaged over the stay. Derived. */
  extraAdultChargePerNight: number
  total: number
}

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
   * Rounded per night, exactly as the backend does — 40% of ₹1,599 is ₹639.60
   * and a hotel quotes ₹640. Must stay identical to backend/src/lib/pricing.ts
   * or the quoted and charged totals drift apart by paise.
   */
  const upliftPerAdult = (rate: number) => Math.round(rate * (extraAdultPercent / 100))

  // Uplift accrues per night against that night's rate, so a weekend-surcharged
  // night carries a proportionally larger triple-occupancy charge.
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

  // Matches the backend's floor exactly — a zero-night range is never free.
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
