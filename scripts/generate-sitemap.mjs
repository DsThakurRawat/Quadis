/**
 * Emits public/sitemap.xml and public/robots.txt.
 *
 * Slugs are read out of src/data/hotels.ts rather than restated here, so adding
 * a tenth property cannot leave it unlisted. The file is parsed as text on
 * purpose: importing it would pull in React and src/config/api.ts, which reads
 * `import.meta.env` at module scope and throws outside Vite.
 *
 * Runs as the `prebuild` step, so `npm run build` always ships a current map.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
/*
 * www, not the bare apex. The client's live site is canonical on
 * https://www.quadishotels.com — the apex 301s to it on both HTTP and HTTPS —
 * and we cut over onto that same domain. Emitting apex URLs would point every
 * entry in the sitemap at a redirect, and split signals between two hostnames
 * for the URLs that already rank. Verified off the live host 30 Jul 2026; see
 * AGENTS.md 3a.
 */
const ORIGIN = 'https://www.quadishotels.com'

const hotelsSrc = readFileSync(join(root, 'src/data/hotels.ts'), 'utf8')

/** Every `slug: '...'` inside the named export's array literal. */
function slugsFrom(exportName) {
  const start = hotelsSrc.indexOf(`export const ${exportName}`)
  if (start === -1) throw new Error(`generate-sitemap: ${exportName} not found in hotels.ts`)
  const end = hotelsSrc.indexOf('\n]', start)
  if (end === -1) throw new Error(`generate-sitemap: could not find the end of ${exportName}`)
  const block = hotelsSrc.slice(start, end)
  return [...block.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
}

const hotelSlugs = slugsFrom('STATIC_HOTELS')
const banquetSlugs = slugsFrom('BANQUETS')

// A silently empty sitemap is worse than a failed build — it tells Google the
// site has no hotel pages at all.
if (!hotelSlugs.length) throw new Error('generate-sitemap: no hotel slugs found')
if (!banquetSlugs.length) throw new Error('generate-sitemap: no banquet slugs found')

/**
 * Static routes worth indexing, with crawl priority. /login, /register,
 * /account and /admin are deliberately absent — they carry `noindex` from the
 * Seo component and have nothing a searcher wants.
 */
const STATIC_ROUTES = [
  ['/', '1.0'],
  ['/hotels', '0.9'],
  ['/banquets', '0.8'],
  ['/restaurant', '0.7'],
  ['/restaurant/outdoor-catering-service', '0.6'],
  ['/corporate-hotel-booking', '0.7'],
  ['/about-us', '0.5'],
  ['/gallery', '0.5'],
  ['/virtual-tour', '0.5'],
  ['/contact', '0.6'],
  /*
   * The policy pages carry low priority but must be listed. Razorpay requires
   * them reachable before it approves a merchant account, and the client's
   * existing site has /privacy-policy and /terms-and-conditions indexed today —
   * we move onto the same domain, so dropping them from the sitemap would
   * retire two URLs that already rank.
   */
  ['/privacy-policy', '0.3'],
  ['/terms-and-conditions', '0.3'],
  ['/cancellation-policy', '0.3'],
]

const urls = [
  ...STATIC_ROUTES,
  // The hotel pages are the ones guests search for by name and area, so they
  // rank alongside /hotels rather than below it.
  ...hotelSlugs.map((s) => [`/hotels/${s}`, '0.9']),
  ...banquetSlugs.map((s) => [`/banquets/${s}`, '0.7']),
]

// Date only, no clock: a timestamp that changes on every build tells crawlers
// each page was edited when only the deploy moved.
const lastmod = new Date().toISOString().slice(0, 10)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ([path, priority]) =>
      `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

# Nothing a searcher wants, and /admin must never be indexed.
Disallow: /admin
Disallow: /account
Disallow: /login
Disallow: /register

Sitemap: ${ORIGIN}/sitemap.xml
`

writeFileSync(join(root, 'public/sitemap.xml'), sitemap)
writeFileSync(join(root, 'public/robots.txt'), robots)

console.log(
  `🗺️  sitemap.xml: ${urls.length} URLs ` +
  `(${STATIC_ROUTES.length} static, ${hotelSlugs.length} hotels, ${banquetSlugs.length} banquets)`
)
