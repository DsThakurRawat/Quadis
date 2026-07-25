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
}

/**
 * Prices each night individually so weekend nights can carry the surcharge,
 * then multiplies by room count. Returns whole paise-accurate rupees.
 */
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

  // Mirrors the previous `Math.max(1, nights)` guard: never bill a zero-night stay.
  if (nights === 0) total = nightly

  return Math.round(total * (Number(input.roomsCount) || 1) * 100) / 100
}
