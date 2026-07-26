> **STATUS: COMPLETE — kept for reference, do not re-run.**
>
> Verified against tree `e815846` on 26 Jul 2026: Parts A, B, C and D of this spec
> are implemented. Confirmed shipped include `HOTEL_DISPLAY_ORDER`,
> `TierExpansion`, `ExperiencesByQuadis`, the `FeaturedIn`/`OffersForYou` split,
> the `<Logo>` component and SVG marks, webhook signature verification, base32
> booking codes, `whatsapp-staff` authorisation, the admin-gated and capped
> enquiry payment link, invoice ownership checks, the real Razorpay wiring in
> `CheckoutModal`, the `useHotels` retry, `nearby >= 1`, and derived counts.
>
> Still blocked on the client, as this document already notes: real testimonials
> (A13) and press-coverage URLs (A17).
>
> **The current work is Change Order #3 — see `docs/change-order-3.md`.** It is a
> different list (mobile, payment gateway, occupancy, adults/children, admin
> editability, registration) and this file does not cover it.

# Quadis — Change Order #2 (Claude Code execution spec)

Source: client PDF "Website Changes" (8 pages, 15 numbered items) + WhatsApp notes,
26 Jul 2026. Target repo `DsThakurRawat/Quadis@main`, tree `51800d97e6a5`.

Companion doc: `Quadis-Audit-2.md` (security + correctness findings). **Part C of this
file is blocking for public launch and is not optional.**

---

## Ground rules for every task below

1. **No hex outside `src/styles/tokens.css`.** The file says so in its header comment.
   If you need a new colour, add a token; don't inline it.
2. **There is no Tailwind in this project.** `package.json` has no `tailwindcss`, and
   `vite.config.ts` has no PostCSS. Class names like `grid-cols-2`, `py-12`, `gap-6`,
   `text-xs`, `mt-8` currently appear in JSX and **resolve to nothing**. Task A6 exists
   because of exactly this. When you touch a file, replace any Tailwind-shaped class with
   a real one defined in `pages.css` / `components.css`.
3. `tsconfig.json` sets `noUnusedLocals` and `noUnusedParameters`. Remove imports you
   orphan or the build fails.
4. Run `npm run typecheck` before declaring a task done. `npm run build` runs `tsc` first.
5. Styles live in four files by role: `tokens.css` (variables only), `global.css`
   (resets, type, layout primitives), `chrome.css` (header, footer, booking bar, hero),
   `components.css` (reusable components), `pages.css` (page-specific sections).
6. **Do not invent content.** Where a task needs copy, photography, or a testimonial that
   the client has not supplied, stop and list it under "Blocked on client" rather than
   writing placeholder text. Several items below are already marked that way.

---

# Part A — Client change order

## A1. Official logo — BLOCKED ON ASSET

**Client:** "Replace this logo with our official logo."

No logo file was supplied with the brief. The site currently renders a text wordmark in
four places, plus an inline-SVG favicon:

| File | What is there now |
|---|---|
| `src/components/Header.tsx` | `.wordmark` — `QUADIS™` / `HOTELS` in two spans |
| `src/components/Footer.tsx` | `.wordmark.wordmark--footer`, same markup |
| `src/pages/Login.tsx` | `.wordmark.wordmark--auth` |
| `src/pages/Register.tsx` | `.wordmark.wordmark--auth` |
| `index.html` | favicon: inline SVG, a gold `Q` on `#1b1a17` |

**When the asset arrives:** add `public/logo/quadis-wordmark.svg` (light) and
`quadis-wordmark-dark.svg` if the mark needs to invert on the dark header/footer.
Build one `<Logo variant="header" | "footer" | "auth" />` component in
`src/components/ui.tsx` and swap all four call sites, so the next logo change is one file.
Keep the existing `.wordmark*` CSS until the swap is proven, then delete it.

Ask the client for: SVG (not PNG), light and dark variants, and clear-space rules.

## A2. Hero video is too dark

**Client:** "Remove this content, and also the transparency of the video."
**WhatsApp:** *"Isme jo video ki transparency ki baat ki hai maine, vo blackness dikh rahi
hai video mein uski baat kar rahi hoon"* — the complaint is the **black wash over the
video**, not the video itself.

**Cause.** `src/pages/Home.tsx` renders `<section className="home-hero scrim">`.
`components.css:134` gives `.scrim::before` a full-bleed overlay painted with `--scrim`,
which `tokens.css` defines as
`linear-gradient(rgba(20,19,16,.35), rgba(20,19,16,.65))` — up to 65% black at the bottom.

**Fix.** Add a lighter hero-specific scrim; leave the global `--scrim` alone (photo heroes
on `/about`, `/hotels`, `/banquets` rely on it for text contrast).

`tokens.css`, next to `--scrim`:

```css
--scrim-hero: linear-gradient(rgba(20,19,16,.10), rgba(20,19,16,.40));
```

`components.css`, after the existing `.scrim::before` rule:

```css
.home-hero.scrim::before { background: var(--scrim-hero); }
```

Legibility is already protected: `pages.css:4-5` puts a text-shadow on
`.home-hero__content` and its overline. Verify anyway — see acceptance.

**Acceptance:** the video reads as full-colour footage, not a dark plate. The h1 and
overline still measure ≥ 4.5:1 against the brightest frame of the video behind them
(sample the poster `/images/home/hero.jpg` at the text's bounding box).

### "Remove this content" — RESOLVED

The annotation brackets the paragraph under the headline. Delete
`<p className="lead home-hero__sub">…</p>` from `Home.tsx`, then remove the now-unused
`spellOut` and `PROPERTY_COUNT` imports (`noUnusedLocals` fails the build otherwise).
Keep the overline and the h1. `.home-hero__sub` in `chrome.css:13` becomes dead — delete it.

### Bonus bug visible in the client's screenshot

Their capture shows the headline reading **"Comfort you can book in"** — the word
**"seconds."** is cut off. Cause: `Home.tsx` forces `height: '100vh'` inline while `.h1` is
`clamp(44px, 8vw, 104px)` and `.home-hero__title` is capped at `16ch`, so at their viewport
the headline wraps to four lines and the last one overflows the fixed hero.

Removing the inline `100vh` (already required by A3) plus deleting the sub-paragraph gives
the headline room. Verify "seconds." is visible at 1280×720, 1440×900 and 1920×1080 — this
is the site's first impression and it is currently broken.

## A3. Booking bar must sit over the video

**Client:** "Move the search section a little higher and display it over the bottom part of
the video, just like the previous layout."

**Current.** `Home.tsx` closes `</section>` and then renders the bar as a *sibling*:

```tsx
<div className="container" style={{ position: 'relative', zIndex: 10 }}>
  <BookingBar overlap={true} />
</div>
```

`chrome.css:136` pulls it up by only `-52px` (`-32px` under 768px). With a card that tall,
the bar clears the video almost entirely and sits on the cream band below it.

`Home.tsx` also overrides the hero height inline — `style={{ minHeight: '100vh', height:
'100vh' }}` — which defeats `chrome.css:9`'s `clamp(560px, 72vh, 660px)` and pushes
everything further down.

**Fix.**

1. Delete the inline `minHeight`/`height` override on the `home-hero` section so the token
   height applies again.
2. Deepen the overlap in `chrome.css`:

   ```css
   .bbar--overlap { margin-top: -112px; position: relative; z-index: 5; }
   @media (max-width: 900px) { .bbar--overlap { margin-top: -72px; } }
   @media (max-width: 640px) { .bbar--overlap { margin-top: -40px; } }
   ```

3. Give the bar the highlight shadow the client asks for in the "Highlighted" note
   (see A16): `.bbar { box-shadow: var(--shadow-lg); }`

**Acceptance:** at 1440×900 the booking bar overlaps the bottom of the video by roughly
half its own height, with video visible above and below the overlap. At 375px it still
clears the h1 and nothing is clipped. No horizontal scrollbar at any width.

## A4. Card badge shows the tier, not the hotel — and the list order is wrong

**Client:** "Replace the 'Quadis Central' text shown on the right side of each image with
the correct hotel name." Plus an explicit ordering.

### A4a — the badge

`src/components/ui.tsx`, `HotelCard`:

```tsx
{hotel.tier && <span className={`hcard__tier hcard__tier--${hotel.tier}`}>{hotel.tierLabel}</span>}
```

Every one of the 9 properties has `tier: 'central'`, so every card reads "Quadis Central".

Replace with the property name:

```tsx
<span className="hcard__tier">{hotel.name}</span>
```

Then in `components.css` drop the three now-dead modifiers at lines 94–96
(`.hcard__tier--central` / `--select` / `--experience`) and let `.hcard__tier` (line 87)
carry the styling on its own. Widen it if names wrap — `Hotel Downtown Sector 15 Noida` is
the longest at 30 characters; allow two lines rather than truncating.

Note this duplicates the `<h3 className="h3 hcard__name">` directly below the image. That
is what the client asked for; flag it to them on review, and if they'd rather not repeat
the name, the badge should be removed entirely rather than reverted to the tier.

### A4b — display order

Requested sequence, mapped to slugs:

```ts
// src/data/hotels.ts
export const HOTEL_DISPLAY_ORDER: readonly string[] = [
  'hotel-amar-in',                        // Hotel Amar Inn
  'hotel-downtown-east-of-kailash',       // Hotel Downtown EOK
  'hotel-downtown-sector-51-noida',       // Hotel Downtown Sec 51
  'hotel-downtown-sector-15-noida',       // Hotel Downtown Sec 15
  'hotel-quadis-central-sector-27-noida', // Hotel Quadis Central
  'hotel-cladis-sector-19-noida',         // Hotel Cladis Sector 19
  'hotel-cladis-sector-15-noida',         // Hotel Cladis Sector 15
  'hotel-quadis-sector-51-noida',         // Hotel Quadis 51
  'hotel-amby-inn-lajpat-nagar-ii',       // Hotel Amby Inn
]

const orderOf = (slug: string): number => {
  const i = HOTEL_DISPLAY_ORDER.indexOf(slug)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

/** Client-specified card order (Change Order #2, item 4). */
export const inDisplayOrder = (list: Hotel[]): Hotel[] =>
  [...list].sort((a, b) => orderOf(a.slug) - orderOf(b.slug))
```

**Apply it in two places, or the order will flicker.** `useHotels()` starts from
`STATIC_HOTELS` and then replaces that with the API response, which arrives in
`seedProperties` order — a different order. Sort both:

- `export const STATIC_HOTELS: Hotel[] = inDisplayOrder([ …existing array… ])`
  (or reorder the literal by hand — either is fine, sorting is safer)
- in `useHotels()`, wrap the mapped API result: `cachedHotels = inDisplayOrder(mapped)`

**Acceptance:** `/` and `/hotels` both show the nine cards in the order above, and the
order does not change when the API response lands. The Header's Hotels dropdown
(`Header.tsx`, `HOTEL_MENU`) follows the same order automatically since it maps `hotels`.

## A5. "sleep" / "showers" in the brown theme colour

**Client:** "'Sleep' 'showers' text color to our brown theme color."

`src/pages/Home.tsx`, stay-promise block — two spans currently `className="script gold-text"`.

The section is `bg-dark text-on-dark` (`--bg-dark #1b1a17`), so the brown has to survive a
near-black background. Measured against `#1b1a17`:

- `--gold-deep` `#a07d3d` → **4.58:1** — passes AA for normal text, comfortable here
- `--gold-deepest` `#8a6d2f` → 3.59:1 — large-text only, and these run ~56px so it is legal,
  but it is visibly muddy on dark

**Use `--gold-deep`.** Add to `global.css` next to the other type helpers:

```css
.brown-text { color: var(--gold-deep); }
.bg-dark .brown-text, .bg-darkest .brown-text { color: var(--gold-deep); }
```

and change the two spans to `className="script brown-text"`.

Do **not** change `.gold-text` itself — `HappyClientsSection` uses it for the
"Trusted by 5,000+" figure and the client did not ask for that to move.

**Acceptance:** both words render `#a07d3d`; the rest of the headline stays
`--text-on-dark`. If the client wants a deeper brown than this, the section background has
to lighten too — raise it with them rather than shipping 3:1 text.

## A6. "Our Offerings" — cards are full-width because the grid classes don't exist

**Client:** "The current images are too large and make the layout look unbalanced on desktop."

**Cause, confirmed.** `src/components/OurOfferings.tsx`:

```tsx
<Reveal className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
```

None of `grid`, `grid-cols-1`, `md:grid-cols-2`, `gap-6`, `mt-8` are defined anywhere in
`src/styles/`. The `<Reveal>` renders a plain `<div>`, so the four `.offering-card`
elements stack as full-width blocks. Each card's `.offering-card__media` is
`aspect-ratio: 16/9` (`pages.css:275`), so on a 1440px viewport every image renders roughly
1328×747. That is the "too large".

The same file also carries `py-12`, `text-xs`, `font-semibold`, `mt-4` and `gold-accent` —
all equally undefined. Sweep them all.

**Fix.** Give it a real grid, and switch to a horizontal card on desktop so the imagery is
proportionate.

`OurOfferings.tsx`:

```tsx
<section className="section bg-cream">
  <div className="container">
    <SectionHeader overline="WHAT WE PROVIDE" title="Our Offerings" />
    <Reveal className="offerings-grid">
```

and inside the card, replace `<span className="overline gold-accent text-xs font-semibold">`
with `<span className="overline offering-card__eyebrow">` and `<div className="mt-4">` with
`<div className="offering-card__actions">`.

`pages.css`, replacing/extending the `.offering-card` block at 273–281:

```css
.offerings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-5);
  margin-top: var(--s-6);
}
@media (min-width: 900px) {
  .offerings-grid { grid-template-columns: repeat(2, 1fr); }
  /* Media beside copy, so the image can't dominate the row. */
  .offering-card { flex-direction: row; align-items: stretch; }
  .offering-card__media { flex: 0 0 42%; aspect-ratio: auto; }
  .offering-card__body { padding: var(--s-5); }
}
.offering-card__eyebrow { display: block; margin-bottom: var(--s-1); }
.offering-card__actions { margin-top: var(--s-4); }
```

**Also fix while you are here:** `OFFERINGS[2]` ("Corporate & Long Stays") uses
`/images/home/hero.jpg`, which is the same file the other three fall back to. Point it at a
distinct corporate image from `corporateImages` in `src/data/images.ts`.

**Acceptance:** at ≥900px, two cards per row, image occupying ~42% of each card's width and
matching the card's height. At <900px, single column with the image above the copy. No
undefined class names remain in the file.

## A7. Add "Experiences by Quadis" + Upcoming Hotels to the Home page

**Client:** "This section is not included on the current website. Please add it to the page."

The reference screenshot shows **two** stacked sections. Both belong on `/`.

> ⚠️ The reference is a capture of a **different brand's site** — the cards read "OPO Hotel
> Rishikesh", "OPO Hotels Agra" etc. Copy the *layout*, never the OPO name or its copy.

### A7a — "Experiences by Quadis" (new component)

A dark band with overline `WE OFFER`, flanked title **Experiences by Quadis**, and three
cards, each a photo + heading + two lines of copy + a `KNOW MORE` button:

| Card | Links to | Image source |
|---|---|---|
| Hotels by Quadis | `/hotels` | `galleryFacade[0]` |
| Banquets by Quadis | `/banquets` | `banquetHero[0]` |
| Restaurant by Quadis | `/restaurant` | `restaurantImages()[0]` |

Build `src/components/ExperiencesByQuadis.tsx` on the existing dark-section pattern
(`section bg-dark text-on-dark` + `SectionHeader onDark` + `Reveal`). Reuse `.offering-card`
styling where it fits rather than inventing a third card component.

**The Hotels card copy must use `spellOut(PROPERTY_COUNT)`** — the reference says "Ten
considered properties" and there are nine.

This overlaps `OurOfferings` (four cards: Stays / Banquets / Corporate / Dining). Running
both is redundant — flag to the client that **A7a arguably replaces A6** and get a decision
before building both. If they want both, A7a goes below `OurOfferings`.

### A7b — mount the existing Upcoming Hotels section on Home

`src/components/UpcomingHotels.tsx` already exists, renders `UPCOMING_HOTELS` (Rishikesh,
Agra, Chandigarh, Dehradun, Faridabad, Gurgaon, Manesar, New Delhi) and is currently mounted
**only on `/hotels`**. Add `<UpcomingHotels />` to `Home.tsx` right after
`<ExperiencesByQuadis />`.

The reference shows four cards per row with a `COMING SOON` badge; `.upcoming-grid` already
does this. No new CSS beyond the A16 shadow pass.

**Acceptance:** both sections render on `/`; no "OPO" string anywhere; property count comes
from `PROPERTY_COUNT`; upcoming cards match the ones already on `/hotels`.

## A8. Destination images are wrong

**Client:** "The current images are showing hotels from Bangalore and Noida. Please update
them to display the right images."

`src/components/DestinationsGrid.tsx` holds its own hardcoded list. Two problems match the
complaint exactly:

```ts
{ name: 'Bengaluru', image: '/images/home/hero.jpg', status: 'coming_soon' },
```

Quadis has no Bengaluru property, and the image is a **hotel interior photo standing in for
a city**. Same class of error for Noida (`/images/upcoming/noida.png`) if that file is a
property shot rather than a cityscape — verify the file.

Worse, this list contradicts `UPCOMING_HOTELS` in `src/data/hotels.ts`, and both render on
`/hotels`:

| City | DestinationsGrid | UPCOMING_HOTELS |
|---|---|---|
| Gurgaon | `active` | COMING SOON |
| Manesar | `active` | COMING SOON |
| Faridabad | `active` | COMING SOON |
| New Delhi | `active` | COMING SOON |

Quadis operates in **Noida and New Delhi only**. Gurgaon, Manesar and Faridabad are not
active.

**Fix.** Delete the local `DESTINATIONS` array. Derive the grid from real data:

- *active* = `[...new Set(STATIC_HOTELS.map(h => h.city))]` → Noida, New Delhi
- *coming soon* = `UPCOMING_HOTELS`

Drop Bengaluru entirely. Every remaining tile needs a **city** image, not a room photo —
`/public/images/upcoming/` already holds `rishikesh.png`, `agra.png`, `chandigarh.jpg`,
`dehradun.jpg`, `faridabad.png`, `gurgaon.jpg`, `manesar.png`, `delhi.jpg`. Confirm each is
a cityscape and ask the client for a Noida one if `noida.png` is a property shot.

**Acceptance:** one source of truth for cities; no city marked both active and coming-soon;
no hotel interior used as a city tile; Bengaluru gone.

## A9. Partner logos scroll right-to-left, infinite

**Client:** "Please add a continuous scrolling animation so the logos move smoothly from
right to left in an infinite loop."

Target: `src/components/HappyClientsSection.tsx`, the `.happy-clients-logos` grid
(`pages.css:389-391`) rendering all 15 `PARTNER_LOGOS`.

Replace the grid with a marquee. Duplicate the list once and translate by exactly -50% so
the seam is invisible:

```tsx
<Reveal className="logo-marquee">
  <div className="logo-marquee__track">
    {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((client, i) => (
      <div key={`${client.name}-${i}`} className="happy-client-logo-card" aria-hidden={i >= PARTNER_LOGOS.length}>
        <img className="logo-mark" src={client.src} alt={i >= PARTNER_LOGOS.length ? '' : client.name} loading="lazy" />
      </div>
    ))}
  </div>
</Reveal>
```

`pages.css`:

```css
.logo-marquee { overflow: hidden; margin-top: var(--s-6); -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.logo-marquee__track { display: flex; gap: var(--s-4); width: max-content; animation: logo-scroll 48s linear infinite; }
.logo-marquee:hover .logo-marquee__track { animation-play-state: paused; }
.logo-marquee .happy-client-logo-card { flex: 0 0 180px; }
@keyframes logo-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .logo-marquee__track { animation: none; flex-wrap: wrap; width: 100%; justify-content: center; }
}
```

The duplicate half is `aria-hidden` with empty `alt` so screen readers hear 15 clients, not 30.

**Acceptance:** smooth right-to-left loop with no visible jump at the wrap; pauses on
hover; falls back to a static wrapped grid under reduced-motion; no horizontal page scroll.

## A10. Business CTA banner — drop the blue treatment

**Client:** "Replace this design with old design" → then a screenshot captioned "Replace
with this design."

**Target: `src/components/BusinessCtaBanner.tsx` + `components.css:1237-1310`.**

The paired screenshots make the delta explicit:

| | Current (rejected) | Wanted |
|---|---|---|
| Section background | pale blue | `--bg-warm` cream |
| Card background | pale blue tint | `--surface` white |
| Icon | small blue check / shield, no container | gold-tinted **circle** behind the glyph |
| Button | solid **blue** | solid near-black (`--text-primary`) |
| Card 1 heading | "Be a Quadis franchisee" | "Be a Quadis Hotel Franchisee" |
| Card 2 heading | "Get corporate deals" | "Get Corporate Deals" |

**There is blue in this component and blue does not exist in `tokens.css`.** Find it in the
`.biz-card-modern*` rules (1249–1310) and remove every blue value — do not swap one
hardcoded hex for another.

```css
/* components.css — replace the .biz-card-modern* block wholesale */
.biz-card-modern {
  background: var(--surface);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--s-5);
  box-shadow: var(--shadow-sm);
  transition: box-shadow .2s ease, transform .2s ease;
}
.biz-card-modern:hover { box-shadow: var(--shadow-card); transform: translateY(-3px); }
.biz-card-modern__header { display: flex; align-items: center; gap: var(--s-3); margin-bottom: var(--s-3); }
.biz-card-modern__icon-wrap {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--warning-bg); color: var(--gold-deep);
}
.biz-card-modern__title { margin: 0; font-size: 22px; color: var(--text-primary); }
.biz-card-modern__text { color: var(--text-muted-2); font-size: 14.5px; line-height: 1.6; }
.biz-card-modern__btn {
  margin-top: var(--s-4);
  background: var(--text-primary); color: var(--text-on-dark);
  border: none; border-radius: var(--radius-sm);
  padding: 12px 20px;
  font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
}
.biz-card-modern__btn:hover { background: var(--bg-dark); }
```

Set the section to `className="section bg-warm"` (it is `bg-white` today) and update the two
headings to the capitalisation above.

**Acceptance:** no blue anywhere in the section; buttons near-black; icons in gold circles;
the band reads as part of the cream-and-gold palette.

## A10b. Destination tiles — dotted borders become a real frame

**Client:** "Please replace these dots with a more attractive border."

**Confirmed target:** `.dest-stamp__frame` (`components.css:1180`). The screenshot shows all
eight "Destinations For You" tiles ringed in a **green dotted** border — off-palette, and
green appears nowhere in `tokens.css`.

```css
.dest-stamp__frame {
  border: 1px solid var(--border-card-2);
  border-radius: var(--radius-sm);
  padding: 4px;                 /* inner mat, so the photo floats inside the frame */
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.dest-stamp:hover .dest-stamp__frame {
  border-color: var(--gold-deep);
  box-shadow: var(--shadow-card);
  transform: translateY(-3px);
}
```

Delete the green/dotted declarations in the current rule (1180) and its hover (1190). Check
`.dest-stamp__badge` (1218) still reads against the new frame.

**Acceptance:** no dotted borders, no green; tiles use the same hairline-plus-shadow language
as the hotel cards.

## A11. CONTACT buttons in the "Beyond hospitality" cards

**Client:** "Use attractive 'contact' button."

**Not the header nav.** The annotation points at the *Beyond hospitality* section on Home —
the two Future Vision cards (Quadis Homes / Quadis Aviation), each with a small `CONTACT`
button bottom-right that renders as bare text crammed inside a thin box.

**Cause.** `src/pages/Home.tsx`, both cards:

```tsx
<Link to="/contact" className="btn btn--ghost btn--sm" style={{ padding: 0 }}>Contact</Link>
```

The inline `padding: 0` strips the ghost button's padding, collapsing the border onto the
label. That is the whole bug.

**Fix.** Drop the inline style and use a real button:

```tsx
<Link to="/contact" className="btn btn--primary btn--sm">CONTACT US</Link>
```

`.btn--sm` is referenced here and in `Account.tsx` but did not turn up in a style grep —
confirm it exists in `components.css`, and add it if not:

```css
.btn--sm { padding: 9px 18px; font-size: 12px; letter-spacing: .08em; }
```

While in this block: the card footer is `justify-content: space-between` with an "In
development" chip on the left. Keep that, but match the chip and button heights so the row
does not sit ragged.

**Part B replaces the imagery in this same section** — do both edits in one pass.

**Acceptance:** a properly padded solid button, ≥44px tall, aligned with the chip beside it.

## A12. Move "Offers for You" below "Guest Experience"

**Client:** "Please add the 'Offers for You' section after the 'Guest Experience' section."

Right now `src/components/FeaturedInAndOffers.tsx` renders **both** "Featured In" and
"Offers for You" as one component, mounted at Home position 10 — well *above*
`HappyClientsSection`, which is where the "Guest Experience" banner lives.

**Fix.** Split the file:

- `src/components/FeaturedIn.tsx` — the press block (see also A17)
- `src/components/OffersForYou.tsx` — the `OFFERS` array, copy-code state and grid

Then in `Home.tsx`: keep `<FeaturedIn />` where the combined component was, and mount
`<OffersForYou />` immediately after `<HappyClientsSection />`.

**Fix the copy while the file is open.** `OFFERS[2]` says *"Valid across all 10
properties"*. There are 9. Use the derived constant:

```tsx
import { PROPERTY_COUNT } from '../data/site.ts'
validity: `Valid across all ${PROPERTY_COUNT} properties`,
```

**Acceptance:** Home order is … Featured In … → Guest Experience → Offers for You → …;
the copy-code buttons still work; no "10 properties" string survives.

## A13. Testimonial slider — arrows and more entries

**Client:** "Add previous and next arrows to the testimonial slider, and increase the number
of testimonials."

Two relevant pieces exist:

- `src/components/HappyClientsSection.tsx` — `VERIFIED_GUEST_REVIEWS`, three reviews in a
  **static 3-column grid** (`pages.css:406-407`). No arrows. This is what the client sees.
- `src/components/Testimonials.tsx` — **dead code, imported nowhere.** It already has
  working prev/next arrows, 6-second autoplay, and pause-on-hover. Three *invented*
  testimonials.

**Fix.** Lift the slider mechanics out of `Testimonials.tsx` and apply them to the real
reviews in `HappyClientsSection`: index state, `go(±1)`, autoplay with pause-on-hover,
`IconArrowLeft` / `IconArrowRight` from `icons.tsx`. Show 3 cards per view on desktop and 1
on mobile, paging by one. Then **delete `Testimonials.tsx`** — leaving fabricated
testimonials in the tree invites someone to mount them.

**BLOCKED ON CLIENT for the content half.** "Increase the number of testimonials" needs
real reviews. The three in `HappyClientsSection` read as genuine (named guests, named
properties). Ask for 6–9 more from Google Business or the booking channels, each with
guest name, property, rating and date. **Do not write new ones.**

**Acceptance:** arrows page the reviews both directions and wrap; autoplay pauses on hover
and on focus; keyboard-reachable; reduced-motion disables autoplay.

## A14. Add the three-tier expansion section

**Client:** *"in future wil be expanding in three categories"* — Quadis Central (normal
standard hotels), Quadis Select (premium corporate or family stays with additional
facilities), Quadis Experience (resorts / luxury experience hotels for leisure travellers).
*"Designing is tarike se kardo"* — design it properly.

**This resolves an open audit finding.** `Quadis-Audit-2.md` §3.2 flagged that all 9
properties are `tier: 'central'` while `/hotels` offers Select and Experience filters that
always return zero and render raw enum strings as pill labels. The brief now makes the
intent explicit: **the tiers are a future roadmap, not current inventory.** So:

1. **Build `src/components/TierExpansion.tsx`** — a section headed "In future we will be
   expanding into three categories", with three cards:

   | Tier | Description (client's words) |
   |---|---|
   | Quadis Central | Normal standard hotels |
   | Quadis Select | Premium corporate stays or family stays with additional facilities |
   | Quadis Experience | Resorts or luxury experience hotels for leisure travellers |

   The client's reference for this section is a three-card layout with a **photo** on each
   card, a small-caps heading and a short paragraph — not plain text cards. Follow that:
   photo, tier name in the display font, one line of description. Three columns ≥900px, one
   below. The reference is again an OPO capture — take the layout, not the branding.

   Photography: use `galleryFacade` for Central, `corporateImages` for Select, and
   `galleryRoyal` for Experience until the client supplies dedicated shots.

   Mount it on `Home.tsx` after `OurOfferings`, before `DestinationsGrid`.

2. **Remove the tier filter from `src/pages/HotelsList.tsx`.** Delete the second
   `<FilterPills options={TIER_FILTERS}>`, the `tierFilter` state, the `tier` query-param
   handling and the tier branch of the `filtered` memo. Keep the city filter.
   Delete `TIER_FILTERS` and the `TierFilter` type once nothing imports them.

3. **Replace the `tier-explainer-row`** at the top of `HotelsList` with `<TierExpansion />`,
   so the same words appear in one component in both places.

4. **Data cleanup.** With A4a removing the tier badge and the filter gone, `tier` and
   `tierLabel` are unused on the frontend. Leave the DB columns (they cost nothing and the
   roadmap is real), but drop `tier`/`tierLabel` from the `Hotel` interface in
   `src/types.ts` and from all 9 records in `STATIC_HOTELS`, and stop mapping them in
   `useHotels()`. Also remove `hotel.tierLabel` from `HotelDetail.tsx` (it renders as the
   overline above the property name).

**Acceptance:** no UI anywhere presents a tier as a current, filterable attribute; the
three categories appear once as a clearly-labelled future roadmap; `npm run typecheck`
passes with the type removed.

## A15. Social icons — wrong glyphs, placeholder links

**Client:** "Change the icons and link it."

`src/components/Footer.tsx` links to bare domains — `facebook.com`, `x.com`,
`instagram.com`, `linkedin.com` — and there is no YouTube link at all.

**Real URLs:**

```
Facebook   https://www.facebook.com/quadisgroupofhotelss
X          https://x.com/quadis_hotels
Instagram  https://www.instagram.com/quadis_groupofhotels/
LinkedIn   https://www.linkedin.com/company/quadis-group-of-hotels
YouTube    https://www.youtube.com/@QuadisGroupofHotels
```

**Two icon bugs to fix in `src/components/icons.tsx`:**

1. **`IconX` is not the X logo.** Line 23 is `<path d="M4 4l16 16M20 4 4 20" />` — two
   crossed strokes, i.e. a close/× glyph. It is used *both* as the modal close button
   (`Gallery`, `GalleryPage`, `QuadisAssistChat`) and as the X social icon. Add a separate
   `IconXSocial` with the real mark and leave `IconX` as the close glyph:

   ```tsx
   export const IconXSocial = (p: P) => (
     <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="20" height="20" {...p}>
       <path d="M17.53 3h3.02l-6.6 7.54L21.75 21h-5.9l-4.62-6.04L5.94 21H2.92l7.06-8.07L2.25 3h6.05l4.18 5.52L17.53 3Zm-1.06 16.2h1.67L7.6 4.71H5.81l10.66 14.49Z" />
     </svg>
   )
   ```

2. **No `IconYoutube`.** Add:

   ```tsx
   export const IconYoutube = (p: P) => (
     <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="20" height="20" {...p}>
       <path d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.51 2.51 0 0 0 2.42 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .42 4.81 2.51 2.51 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z" />
     </svg>
   )
   ```

Keep `target="_blank" rel="noopener noreferrer"` and the `aria-label` on each anchor.
The existing icons are 1.6-stroke outlines while these two are filled — for a consistent
row, either convert all five to filled brand marks (recommended; brand marks should not be
restyled) or keep outlines throughout. Do not mix.

**Acceptance:** five icons, five correct destinations, all opening in a new tab; the X icon
is the X logo, not a close cross; consistent fill/stroke treatment across the row.

## A16. Shadow pass on search bar, images and boxes

**Client:** *"In the search bar, images and boxes add the shadow to highlight it."* The
brief illustrates two swatches labelled **Glow** and **Drop** — a soft ambient halo and a
conventional offset shadow.

Map them onto the existing tokens rather than inventing values:

- **Drop** → `--shadow-sm` / `--shadow-card` / `--shadow-lg` (already warm-tinted, already
  in the palette). Use for cards and the search bar.
- **Glow** → add one token for the gold halo on interactive focus/hover:

  ```css
  /* tokens.css */
  --glow-gold: 0 0 0 1px rgba(200,162,74,.35), 0 8px 28px rgba(200,162,74,.18);
  ```

  Use sparingly — the search bar on focus-within, and the active hotel card on hover. A
  glow on everything reads as a template.

Use the existing elevation tokens — do not invent shadows.

| Target | Rule |
|---|---|
| `.bbar` (booking bar) | `box-shadow: var(--shadow-lg);` |
| `.hcard` (hotel cards) | `box-shadow: var(--shadow-sm);` at rest, `var(--shadow-card)` on hover |
| `.offering-card` | already has `--shadow-card` on hover; add `var(--shadow-sm)` at rest |
| `.dest-stamp__frame` | `box-shadow: var(--shadow-sm);` |
| `.upcoming-card` | `box-shadow: var(--shadow-sm);` |
| `.press-logo-card`, `.happy-client-logo-card` | already have `--shadow-sm` — leave |

Keep transitions on `box-shadow` at `.2s ease` to match `.offering-card`.

**Acceptance:** cards lift off the cream background without the page looking heavy; no new
hex values; hover states still distinguishable from rest states.

## A17. Press logos — outstanding from Audit #1, not yet addressed

Not in the client's numbered list, but it sits in the section A12 splits apart, so fix it in
the same pass. Full reasoning in `Quadis-Audit-2.md` §4.

`src/data/logos.ts` asserts coverage by Condé Nast Traveller, Outlook Traveller, Lifestyle
Asia, Pinkvilla, The Economic Times, Mint and "Convoy" under the heading **"Featured In"**.
The `Logo` interface has no `href`, so not one links to an article. Seven third-party
trademarks making an unverifiable claim.

```ts
export interface Logo {
  name: string
  src: string
  /** Live URL of the coverage. Entries without one are not rendered. */
  href?: string
  /** ISO date of publication, shown under the mark. */
  date?: string
}
```

Render only entries that have `href`. Present them greyscale so six brand palettes stop
fighting the cream-and-gold (`filter: grayscale(1); opacity: .7`, full colour on hover) and
change `pages.css:349` from fixed 4/7 columns to
`grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` — seven logos into four
columns currently leaves a ragged trailing row of three.

**BLOCKED ON CLIENT:** article URLs and dates. If none exist, delete the section. Two real
citations beat seven unverifiable logos, and a masthead used without coverage is a
trademark problem, not a design one.

---

# Part B — New brand assets

The client supplied two renders via WhatsApp, captioned "Quadis Homes - Home Page" and
"Quadis Aviation".

**Staged in this project at:**

```
repo-assets/public/images/about/quadis-homes.png
repo-assets/public/images/about/quadis-airlines.png
```

Copy both to `public/images/about/` in the repo at those exact filenames.

**Why those names.** `src/data/images.ts` resolves About's artwork by filename, not index:

```ts
export const aboutAirlines: string = aboutNamed('quadis-airlines', galleryFacade)
export const aboutHomes: string = aboutNamed('quadis-homes', galleryRoyal)
```

Naming them this way makes `About.tsx` pick them up with no code change. They are also
already listed in `SECTION_ARTWORK`, so they will correctly stay out of the
"Moments of Calm & Comfort" gallery.

**Then update `Home.tsx`'s Future Vision cards**, which currently point at generic photos:

- `/images/home/12.jpg` → `/images/about/quadis-homes.png`
- `/images/home/13.jpg` → `/images/about/quadis-airlines.png`

**Fix the product name while you are there.** One page currently uses three names for two
products: the Home cards say "Quadis Homes" and "Quadis **Aviation**", the Ecosystem
paragraph directly below says "Quadis **Airlines**", and `About.tsx` says "Quadis
Airlines™". The client's own render has **QUADIS AIRLINES** painted on the fuselage.

**Canonical: "Quadis Airlines".** Change `Home.tsx`'s "Quadis Aviation" card to "Quadis
Airlines" and leave the rest.

While editing that block: the two Future Vision cards on Home restate About's Chapter 4
almost verbatim. Consider cutting them from Home and letting the Ecosystem band link to
`/about-us` — see Part D.

---

# Part C — Blocking before any public launch

Full detail in `Quadis-Audit-2.md`. These are not styling issues and must not be deferred
behind the change order.

1. **`backend/src/routes/webhooks.ts` accepts unsigned webhooks.**
   `if (!isSimulatedHeader && signature)` — omit the header and verification is skipped.
   A plain POST confirms any booking and fires receipts. Require the signature; 401 when
   absent; gate the `'simulated'` bypass on `NODE_ENV !== 'production'`.
2. **`GET /api/enquiries` is public** — every lead's name, phone, email, message.
   Add `requireAdmin` to `GET /`, `GET /:id`, `PATCH /:id/status`.
3. **`GET /api/bookings/:code/invoice` has no auth** and codes are `QD-` + 4 digits.
   9,000 requests harvests every guest's GSTIN. Require phone match or session.
4. **Booking codes collide** (~110 bookings). Use `crypto.randomBytes` base32, retry on
   unique violation.
5. **`whatsapp-staff` authorises on a missing field** — `const isAuthorized = !from || …`.
6. **`enquiry-payment-link` trusts a client-supplied `amount`.** Read it from the record.
7. **`ADMIN_PIN: "998877"` is committed in `render.yaml`** and printed in the
   `AdminDashboard` placeholder. `ADMIN_PASSWORD`/`SESSION_SECRET` are unset, and
   `DATABASE_URL: in-memory` loses every booking on restart.
8. **`CheckoutModal` never takes payment.** Step 2 is `setTimeout(2000)` then a local
   `setState` to CONFIRMED. The guest sees "Confirmed & Paid" and a booking code; the
   server has a `PENDING_PAYMENT` hold that expires 15 minutes later. Wire it to
   `create-order` → Razorpay checkout → poll `GET /api/bookings/:code`. Point the invoice
   button at the real pdfkit endpoint instead of `window.print()` (which prints blank —
   `global.css` sets `#root { display: none }` and the invoice wrapper is inside `#root`).
   Remove the "Simulate payment failure" button from the guest build.

---

# Part D — Cheap fixes worth folding into this pass

Small, unambiguous, and in files you are already touching.

- **"10 properties" appears in five files; there are nine.** `QuadisAssistChat.tsx`,
  `AIService.ts`, `FeaturedInAndOffers.tsx`, `AdminDashboard.tsx`, `About.tsx` ("ten
  sought-after properties"). Use `PROPERTY_COUNT` / `spellOut(PROPERTY_COUNT)`.
- **Eight dead links:** `Home.tsx` "Know more." → `#promise` (no such anchor);
  `Login.tsx` "Forgot password?" → `/login`; `Register.tsx` Terms and Privacy → `#`;
  `Restaurant.tsx` "VIEW MENU" → `/restaurant` (the page itself, and no menu exists).
- **`Register.tsx` collects `username` and `referral`**, validates username as required,
  and sends neither to the API. Either wire them or remove the fields.
- **`HotelDetail.tsx` contradicts itself** — after the modal says "Confirmed & Paid", the
  page shows "Request received — our team will confirm availability shortly."
- **Nearby stays crosses cities.** `same.length >= 3 ? same : allHotels` — New Delhi has 3
  properties, so any Delhi hotel has 2 siblings, falls through, and lists Noida hotels
  25km away as "Nearby stays". Change to `>= 1`.
- **`VirtualTour.tsx` hardcodes "all 128 photos"** (use `GALLERY_COUNT`) and prices the
  customizer from `basePriceNight ?? 3800` — no Quadis room costs ₹3,800; the real range is
  ₹1,399–₹1,999.
- **`react-router` 8.3.0 and `react-router-dom` 7.18.1 both installed**, mismatched majors,
  only `react-router-dom` imported. Remove `react-router`.
- **A failed hotel fetch never retries** — `useHotels` never clears `fetchPromise` in
  `.catch`, so one flaky load pins the page to static data for its lifetime.

---

# Needs the client before work can finish

1. **Official logo** — SVG, light + dark variants (A1).
2. **Replacement hero video** — client is sending one. Current file is
   `/public/videos/Quadis.mp4`; drop the new one at the same path and no code changes are
   needed. The A2 scrim fix should land regardless, since the darkness is the overlay, not
   the footage.
3. **A6 vs A7a decision** — "Experiences by Quadis" (3 cards) substantially duplicates
   "Our Offerings" (4 cards). Confirm whether A7a *replaces* A6 or sits alongside it.
4. **6–9 real guest testimonials** with name, property, rating, date (A13).
5. **Press coverage URLs and dates**, or approval to delete "Featured In" (A17).
6. **Confirm brown** — `--gold-deep #a07d3d` on the dark stay-promise band (A5).
7. **A Noida cityscape image** — the current `upcoming/noida.png` tile is a building, which
   is half of what item 8 is complaining about (A8).
8. **Badge duplication check** — A4a puts the hotel name in the card badge, directly above
   the same name as the card heading. Confirm they want it repeated rather than the badge
   removed.
