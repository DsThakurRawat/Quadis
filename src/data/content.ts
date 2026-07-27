import { useState, useEffect } from 'react'
import { getApiUrl } from '../config/api'

/**
 * Admin-editable site copy.
 *
 * Every editable string keeps its shipped default in DEFAULT_CONTENT below.
 * Components call `useContent()` and read through `t(key)`, which returns the
 * admin's override when one exists and the default otherwise.
 *
 * That ordering matters: the API being down, unmigrated, or simply never
 * written to must render exactly the site as shipped. Editable copy should
 * never be able to blank a headline.
 *
 * To make a new string editable: add it here with its current text, then swap
 * the literal in the component for `t('its.key')`. Nothing else is needed —
 * the admin panel lists whatever is in this map.
 */

export interface ContentField {
  /** Grouping shown as a heading in the admin panel. */
  section: string
  /** Human label in the admin panel. */
  label: string
  /** The text the site ships with, used whenever there is no override. */
  value: string
  /** Renders as a textarea rather than a single-line input. */
  multiline?: boolean
}

export const DEFAULT_CONTENT: Record<string, ContentField> = {
  // 'home.hero.overline' and 'home.hero.title' were removed in July 2026: the
  // client took the copy off the hero video, leaving only the search bar. A key
  // with nothing reading it renders an admin field that silently does nothing,
  // so it comes out of the map rather than staying as dead weight. Any override
  // already stored against these keys is simply ignored.
  'home.stayPromise.title': {
    section: 'Home — stay promise',
    label: 'Section heading',
    value: 'Rest easy. Sleep deep. Wake refreshed.',
  },
  'corporate.intro.title': {
    section: 'Corporate booking',
    label: 'Section heading',
    value: 'Dependable stays for your teams',
  },
  'corporate.intro.body': {
    section: 'Corporate booking',
    label: 'Intro paragraph',
    multiline: true,
    value:
      'Quadis partners with businesses across Delhi NCR to make corporate travel effortless. Our properties sit in prime business districts, with fast Wi-Fi, GST invoicing and flexible terms designed around how teams actually travel.',
  },
  'contact.intro': {
    section: 'Contact',
    label: 'Intro paragraph',
    multiline: true,
    value: 'Tell us what you need and our team will come back to you shortly.',
  },
  'footer.tagline': {
    section: 'Footer',
    label: 'Tagline',
    value: 'Refined stays, elegant banquets and warm, attentive dining across Delhi NCR.',
  },
  'policy.checkIn': {
    section: 'Policies',
    label: 'Check-in time',
    value: '2:00 PM',
  },
  'policy.checkOut': {
    section: 'Policies',
    label: 'Check-out time',
    value: '11:00 AM',
  },
  'policy.cancellation': {
    section: 'Policies',
    label: 'Cancellation policy',
    multiline: true,
    value: 'Free cancellation up to 24 hours before check-in. Contact the property directly to cancel.',
  },
}

export type ContentMap = Record<string, string>

/** Module-level cache so every component shares one fetch. */
let cached: ContentMap | null = null
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function load(): void {
  if (cached || inFlight) return
  inFlight = fetch(getApiUrl('content'))
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      cached = json?.success && json.data && typeof json.data === 'object' ? json.data : {}
      listeners.forEach((l) => l())
    })
    .catch(() => {
      // Editable copy is an enhancement. A failure here means the shipped
      // defaults stand — never a blank section.
      cached = {}
    })
    .finally(() => {
      inFlight = null
    })
}

/** Invalidates the cache after an admin save, so the site picks edits up. */
export function refreshContent(): void {
  cached = null
  inFlight = null
  load()
}

export interface UseContent {
  /** Resolved text for a key: the admin override, else the shipped default. */
  t: (key: keyof typeof DEFAULT_CONTENT | string) => string
  overrides: ContentMap
}

export function useContent(): UseContent {
  const [overrides, setOverrides] = useState<ContentMap>(cached ?? {})

  useEffect(() => {
    if (cached) {
      setOverrides(cached)
      return
    }
    load()
    const listener = () => { if (cached) setOverrides(cached) }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const t = (key: string): string => {
    const override = overrides[key]
    if (typeof override === 'string' && override.trim() !== '') return override
    return DEFAULT_CONTENT[key]?.value ?? ''
  }

  return { t, overrides }
}
