import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Per-route page metadata.
 *
 * Every route used to inherit the single <title> in index.html, so a crawler
 * saw seventeen URLs all announcing themselves as "Quadis Hotels — Refined
 * Stays in Delhi NCR". For a group whose guests arrive by searching "hotel in
 * sector 51 noida", that is the difference between nine findable properties and
 * one.
 *
 * Written against the DOM directly rather than pulling in react-helmet: this is
 * a client-rendered SPA either way, so a helper library would add a dependency
 * without adding capability.
 *
 * NOTE — the honest limitation: this sets tags after React mounts. Google
 * executes JS and will see them; several other crawlers and most social-preview
 * scrapers do not. Real per-route metadata in the initial HTML needs
 * prerendering or SSR, which is a bigger change. Recorded in docs/.
 */
export const SITE_NAME = 'Quadis Hotels'
export const SITE_ORIGIN = 'https://quadishotels.com'

export interface SeoProps {
  title: string
  description: string
  /** Absolute or root-relative image for link previews. */
  image?: string
  /** Keeps a page out of search results — account pages, auth, 404. */
  noIndex?: boolean
  /** Overrides the canonical path when a route has query or param variants. */
  canonicalPath?: string
}

/** Sets, or creates then sets, a <meta> tag keyed by name or property. */
function setMeta(keyAttr: 'name' | 'property', key: string, value: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(keyAttr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export default function Seo({ title, description, image, noIndex, canonicalPath }: SeoProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    // Titles carry the brand once, at the end, so the distinctive words come
    // first — search results and browser tabs both truncate from the right.
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
    document.title = fullTitle

    const canonical = `${SITE_ORIGIN}${canonicalPath ?? pathname}`
    const previewImage = image
      ? image.startsWith('http') ? image : `${SITE_ORIGIN}${image}`
      : `${SITE_ORIGIN}/images/home/hero.jpg`

    setMeta('name', 'description', description)
    setLink('canonical', canonical)

    // noindex must be written on every route, not only the private ones —
    // otherwise the tag set on /account survives the client-side navigation to
    // /hotels and quietly delists a page we want indexed.
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')

    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', previewImage)
    setMeta('property', 'og:site_name', SITE_NAME)

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', previewImage)
  }, [title, description, image, noIndex, canonicalPath, pathname])

  return null
}
