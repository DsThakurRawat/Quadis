/**
 * Mirror of backend/src/lib/pricing.ts.
 *
 * The backend is authoritative for what a guest is charged; this exists so the
 * price we quote on the page is the same number. If you change the rule in one
 * file, change it in the other.
 */

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
}

export function computeStayTotal(input: StayPricingInput): number {
  const nightly =
    (Number(input.basePrice) || 0) + (Number(input.roomOffset) || 0) + (Number(input.mealOffset) || 0)
  const surcharge = Number(input.weekendSurchargePercent) || 0

  const end = new Date(input.checkOut)
  const cursor = new Date(input.checkIn)

  let total = 0
  let nights = 0
  while (cursor < end) {
    total += isWeekendNight(cursor) ? nightly * (1 + surcharge / 100) : nightly
    nights += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  if (nights === 0) return 0

  return Math.round(total * (Number(input.roomsCount) || 1) * 100) / 100
}
