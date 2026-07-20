# Quadis Hotels — Frontend Build Spec v2

**Audience:** coding agents building the frontend. Every value here is exact — do not improvise tokens, spacing, or copy tone. Backend comes later: build all data-driven UI against the JSON shapes in §5 so wiring an API is a drop-in.

**Stack:** TypeScript (strict mode) — no plain JS files. Type every data shape from §5 (`Hotel`, `BanquetVenue`, form payloads) in a shared `types.ts`; these same types will be reused by the backend API later.

**Vision (read first):** Quadis is repositioning from *budget* to **premium-but-approachable**. Warm, confident, calm. The site must feel like a considered boutique group — never a discount OTA. Modern and extremely user-friendly: fast, obvious navigation, zero clutter, mobile-first.

**Reference:** current live site `quadishotels.com` — screenshots in `Reference-images/`. Copy its **page structure and real content**, NOT its visual style. The visual system below replaces the old look entirely.

---

## 1. Hard rules (the vision, enforced)

DO:
- Dark `#1b1a17` sections and cream `#f6f1e8` sections only — max 2 background colors per page.
- Photography does the luxury work: full-bleed images with a dark scrim (`linear-gradient(rgba(20,19,16,.35), rgba(20,19,16,.65))`) and light text on top.
- Generous whitespace: section vertical padding 96–120px desktop / 64px mobile.
- One gold accent used sparingly — labels, hover states, stars, active pills. Gold is seasoning, not paint.

DON'T:
- No emoji, no colorful gradients, no glassmorphism, no neon, no rounded-corner-everything (max radius 8px).
- No teal/blue headings, no script fonts beyond Cormorant italic, no stock-photo clichés (handshakes, generic beaches for auth pages — use own property photos).
- Never use the words "budget", "cheap", "affordable prices" in UI copy. Premium-but-honest: "considered comfort", "refined stays in Delhi NCR", "warm, attentive service".
- No layout shift: reserve image space with `aspect-ratio`; lazy-load below-the-fold images.

---

## 2. Design tokens

### Color (CSS custom properties)
```css
--bg-cream:      #f6f1e8;  /* page background */
--bg-warm:       #efe7d6;  /* alternate warm band */
--bg-dark:       #1b1a17;  /* nav, dark sections */
--bg-darkest:    #141310;  /* footer */
--text-primary:  #211f1b;  /* headings on light */
--text-body:     #2b2721;  /* body on light */
--text-muted:    #7a7261;  /* captions, meta */
--text-muted-2:  #5a5346;  /* secondary body */
--text-on-dark:  #f4efe4;  /* headings on dark */
--text-on-dark-2:#cbc3b2;  /* body on dark */
--gold:          #c8a24a;  /* hover fills, stars, active states */
--gold-deep:     #a07d3d;  /* overline labels on light */
--gold-deepest:  #8a6d2f;  /* small labels, borders on gold */
--border-card:   #ece3d3;
--border-card-2: #e6dcca;
--input-bg:      #fbf8f1;
--input-border:  #e2d8c6;
```
`--gold` is the single retheme knob. Approved alternates only: `#a8734a` (terracotta), `#7a8a5c` (olive), `#4a6a7a` (slate blue).

### Type
Load via Google Fonts: **Marcellus** (400), **Cormorant Garamond** (500, 600 italic), **Manrope** (300–800).

| Style | Font | Size / LH | Notes |
|---|---|---|---|
| Hero H1 | Marcellus | 96–104px / 0.96 | light pages: `--text-primary`; on photo: `--text-on-dark` |
| Section H2 | Marcellus | 44–56px / 1.05 | |
| Card title / H3 | Marcellus | 22–28px / 1.2 | |
| Script accent | Cormorant Garamond italic 500 | 40–56px | e.g. "A Way of Being" |
| Body | Manrope 400 | 16–17px / 1.7 | |
| Overline label | Manrope 600 | 11–13px, tracking .16em–.32em, uppercase, `--gold-deep` | precedes every H2 |
| Button label | Manrope 600 | 13–14px, tracking .08em, uppercase | |
| Meta / caption | Manrope 500 | 13–14px, `--text-muted` | |

Mobile: H1 44–52px, H2 32–36px. Body never below 15px.

### Spacing & grid
- Content max-width **1440px**, centered; side padding 56px desktop / 24px mobile.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 120.
- All sibling groups use flex/grid + `gap` (cards 28–32px, form fields 20px). No margin-chains.
- Breakpoints: ≥1200 desktop (3-col grids), 768–1199 tablet (2-col), <768 mobile (1-col, nav collapses to hamburger drawer).

---

## 3. Global chrome (identical on every page)

### Header / nav
- Sticky, `--bg-dark` at 92% opacity + `backdrop-filter: blur(12px)`; height 76px.
- Left: QUADIS™ HOTELS wordmark (Marcellus, letterspaced "HOTELS" below in 10px).
- Center links (Manrope 500, 14px, `--text-on-dark-2`; hover → `--gold`): Home · About · Hotels ▾ · Banquet ▾ · Corporate Booking · Restaurant ▾ · Contact.
- Right: `Register` (ghost: 1px `--text-on-dark-2` border) and `Login` (solid `--gold`, dark text). 
- Dropdowns: dark panel `#232119`, 8px radius, 12px shadow; items are property/venue names; keyboard + hover accessible; click → that detail page.
- Active page link: gold underline offset 6px.

### Footer (`--bg-darkest`)
4 columns (stack on mobile), 96px top padding:
1. Wordmark + blurb: "Quadis Services Private Limited is one of the leading hospitality brands in Delhi NCR, offering premium hotel stays, elegant banquet halls, and quality restaurant services."
2. **HOTELS** → links: Hotel Amar Inn · Hotel Amby Inn · Hotel Downtown · Hotel Cladis · Hotel Quadis
3. **IMPORTANT LINKS** → Privacy & Policy · Contact Us · Terms & Conditions · Career · Blog
4. **CONNECT WITH US** → tel `+91 92173 73532` · mail `info@quadishotels.com` · `H-22, LT SH Jagpal Singh, Sector-51, Noida, Gautam Buddha Nagar, UP 201307`

Social row (Facebook, X, Instagram, LinkedIn — 20px line icons, `--text-on-dark-2`, hover gold) then `© 2017–2026 Quadis Services Private Limited. All Rights Reserved.`

### Floating WhatsApp button
56px circle, bottom-right 24px, WhatsApp green `#25d366`, links to `https://wa.me/919217373532`. Every page.

---

## 4. Shared components (build once, reuse)

**Button** — primary: `--bg-dark` bg, `--text-on-dark` label; hover `--gold` bg + dark label, 160ms ease. Ghost: transparent, 1px current-color border; hover gold border/text. Radius 4px; padding 14px 28px. Focus: 2px gold outline offset 2px.

**Card** — white bg, 1px `--border-card`, radius 8px, image top (`aspect-ratio: 4/3`, `object-fit: cover`), body padding 24px. Hover: `translateY(-3px)` + `0 12px 32px rgba(33,31,27,.10)`, 200ms.

**Hotel card** — image (city chip top-left: dark pill, 12px text) → name (Marcellus 22px) → address line (13px `--text-muted`, location icon) → footer row: `₹1,899 / night` (price Marcellus 20px) left, `★ 4.7` gold right → full-width ghost button `VIEW & BOOK`.

**Section header** — centered: overline label → H2; on cream pages H2 flanked by 1px × 64px rules in `--border-card-2` with 24px gap.

**Input** — label above (Manrope 600, 13px), field: `--input-bg` bg, 1px `--input-border`, radius 5px, padding 14px 16px, 15px text. Focus: border `--gold`, ring `rgba(200,162,74,.25)` 3px. Error: border `#b0563c` + 13px message below. Selects and date inputs styled identically.

**Filter pills** — row of pills (padding 10px 22px, radius 999px, 1px `--border-card-2`, 13px uppercase). Active: `--gold` bg, `--bg-dark` text, no border. Animate grid on change (150ms fade/slide).

**Booking bar** — white card, radius 8px, shadow `0 24px 48px rgba(20,19,16,.18)`, overlaps hero by −52px, internal grid `1.4fr 1fr 1fr .8fr .8fr auto` gap 16px, padding 20px 24px: Destination (select: All / Noida / New Delhi / per-hotel) · Check-in · Check-out (dates, check-out ≥ check-in) · Rooms (stepper 1–5) · Guests (stepper 1–12) · gold search button (56px square, magnifier icon). Mobile: stacks 2-col, button full-width. Submit → `/hotels?city=&checkin=&checkout=&rooms=&guests=` (client-side filter until backend lands).

**Testimonial card** — photo bg with dark scrim, inner 1px `--text-on-dark` border inset 16px; Cormorant italic "Guest" + Marcellus "TESTIMONIAL", quote 18px, name Manrope 700, 5 gold stars. Carousel: arrow buttons (48px dark circles), 6s auto-advance, pause on hover.

---

## 5. Data (single source of truth — seed as JSON, render everything from it)

```json
[
 {"slug":"hotel-cladis-sector-51-noida","name":"Hotel Cladis Sector 51","area":"Sector 51","city":"Noida","address":"H-22, Sector 51, near Cloud9 Hospital, Noida","price":1899,"rating":4.7},
 {"slug":"hotel-quadis-sector-51-noida","name":"Hotel Quadis 51","area":"Sector 51","city":"Noida","address":"Hoshiarpur Village, Sector 51, Noida 201301","price":1599,"rating":4.6},
 {"slug":"hotel-quadis-central-sector-27-noida","name":"Hotel Quadis Central","area":"Sector 27","city":"Noida","address":"D-192, E Block, Pocket E, Sector 27, Noida","price":1799,"rating":4.5},
 {"slug":"hotel-downtown-sector-15-noida","name":"Hotel Downtown Sec 15","area":"Sector 15","city":"Noida","address":"Metro pillar 33, Naya Bans, Sector 15, Noida","price":1599,"rating":4.4},
 {"slug":"hotel-cladis-sector-15-noida","name":"Hotel Cladis Sector 15","area":"Sector 15","city":"Noida","address":"New Ashok Nagar Rd, Naya Bans, Sector 15, Noida","price":1499,"rating":4.4},
 {"slug":"hotel-cladis-sector-19-noida","name":"Hotel Cladis Sector 19","area":"Sector 19","city":"Noida","address":"A-369, Naya Bans Village, Sector 19, Noida","price":1399,"rating":4.3},
 {"slug":"hotel-downtown-sector-51-noida","name":"Hotel Downtown Sec 51","area":"Sector 51","city":"Noida","address":"Sector 51, Noida 201301","price":1699,"rating":4.5},
 {"slug":"hotel-downtown-east-of-kailash","name":"Hotel Downtown EOK","area":"East of Kailash","city":"New Delhi","address":"B-14, B Block, East of Kailash, New Delhi 110065","price":1999,"rating":4.6},
 {"slug":"hotel-amby-inn-lajpat-nagar-ii","name":"Hotel Amby Inn","area":"Lajpat Nagar","city":"New Delhi","address":"M-13, Vinoba Puri, Lajpat Nagar, New Delhi 110024","price":1899,"rating":4.5},
 {"slug":"hotel-amar-in","name":"Hotel Amar Inn","area":"Lajpat Nagar","city":"New Delhi","address":"K-102, near Central Market, Lajpat Nagar, New Delhi","price":1799,"rating":4.4}
]
```
**Images:** EVERYTHING in `https://github.com/DsThakurRawat/Quadis` → `Reference-images/` is a screenshot of the current site — reference for layout/content ONLY. **Never place any of these files on the website.** Real photography will be provided separately; until then, build every image slot as a neutral placeholder (solid `--bg-warm` block with the hotel/venue name centered, correct `aspect-ratio` reserved) so real photos drop in with zero layout change. Expected asset structure when photos arrive: `public/images/hotels/<slug>/`, `public/images/banquets/<slug>/`, `public/images/restaurant/`.

- Reference screenshots per hotel: `Reference-images/Hotels/<slug>/`. Banquet venues: `banquets-at-hotel-amby-inn`, `banquets-at-hotel-cladis`, `banquets-at-hotel-downtown-eok`, `banquets-at-hotel-downtown-sector-51` in `Reference-images/Banquet/<slug>/`. Restaurant incl. `Reference-images/Restaurant/outdoor-catering-service/`.
- Price renders as `₹1,899 / night` (Indian comma format); rating as `★ 4.7`.

---

## 6. Pages (routes + section order)

### 6.1 Home `/`
1. **Hero** (100vh max 720px): full-bleed property photo + scrim; overline `QUADIS HOTELS · DELHI NCR`; H1 (2 lines max); sub-line 18px; scroll cue.
2. **Booking bar** overlapping −52px (§4).
3. **Stats strip** (cream): 4-up — `10 Properties · 2 Cities · 8+ Years · 4.5★ Average` (numbers Marcellus 48px, labels overline style).
4. **Intro statement** (cream): script accent "A Way of Being" + 2-sentence positioning paragraph, max-width 720px centered.
5. **Hotels** (warm `--bg-warm`): section header `OUR PROPERTIES / Best Hotels in Delhi NCR` → filter pills `All · Noida · New Delhi` → 3-col hotel-card grid (all 10).
6. **Experiences** (dark): header `WE OFFER`; 3 cards — Hotels / Banquets / Restaurant by Quadis: photo, 3-line blurb, `KNOW MORE` → section pages.
7. **Testimonial** (cream): testimonial carousel (§4) + `CLIENTS REVIEW` header right.
8. **Partners** (dark): `WE WORK WITH` — grayscale logo row (Blackcomb Springs, Hitachi, Polycab, Aditya Birla Grasim), opacity .7, hover 1.
9. **CTA band** (cream): H2 `Ready to book your stay?` + primary button `BOOK A RESERVATION` → `/hotels`.
10. Footer.

### 6.2 About `/about-us`
Hero band (guest-room photo, scrim, centered `ABOUT US`, 320px) → header `QUADIS HOTELS GROUP / Comfort, made effortless` → story: founded 2017, single venture → group of hotels, banquet halls, dining across Delhi NCR (rewrite in premium tone, keep facts) → centered night-façade photo → values 3-up: Warm Service · Prime Locations · Consistent Quality → stats strip → CTA band.

### 6.3 Hotels `/hotels` and `/hotels/<slug>`
- **Listing:** compact hero (240px, `OUR HOTELS`) → filter pills (honor `?city=` param) → 3-col grid of all 10 → CTA band.
- **Detail:** gallery (1 large + 4 thumb grid, lightbox) → title row (name, address + map link, `★ rating` · `₹price / night`) → sticky right booking card (dates, rooms, guests, `BOOK NOW`, price/night + total) → amenities icon grid (Wi-Fi, AC, breakfast, parking, 24h desk…) → about-this-hotel paragraph → location map embed → 3 nearby-hotel cards.

### 6.4 Banquet `/banquets` and `/banquets/<slug>`
- Listing: hero (banquet photo, `BANQUETS BY QUADIS`) → intro line → 2-col venue cards (photo, name, capacity `Up to N guests`, area, `EXPLORE VENUE`).
- Detail: gallery → capacity/specs row (guests, hall area, catering: veg/non-veg, parking) → occasions chips (Weddings · Receptions · Corporate · Birthdays) → enquiry form (Name, Phone, Email, Event date, Guests, Message → `SEND ENQUIRY`).

### 6.5 Corporate Booking `/corporate-hotel-booking`
Hero (lobby/business photo, `CORPORATE HOTEL BOOKING`) → overline `Your Reliable Partner for Corporate Accommodation` + H2 + 2-col (copy left, lobby photo right; keep current site's facts: business-district locations, Wi-Fi, GST invoicing, flexible terms) → benefits 3-up (Negotiated Rates · Priority Availability · Single Invoice) → RFP form (Company, Contact person, Email, Phone, City, Rooms/month, Message → `REQUEST CORPORATE RATES`).

### 6.6 Restaurant `/restaurant` and `/restaurant/outdoor-catering-service`
Hero (dining photo, `DINING BY QUADIS`) → intro → offering cards: In-house Restaurant · Outdoor Catering Service → detail: gallery, cuisine highlights, hours, enquiry CTA (WhatsApp deep-link).

### 6.7 Contact `/contactus`
Header `CONTACT US / We'd love to hear from you` → 2-col: form left (Name, Email, Phone, Select Type: General / Booking / Banquet / Corporate / Feedback, Message, `SUBMIT`) · right Google-map embed (HQ Sector-51 Noida) + phone/email/address block. Success state: inline confirmation panel (no alert()).

### 6.8 Login `/login` · Register `/register`
Full-viewport **own-property photo** background (never generic stock) + scrim; centered 460px card, radius 8px: dark header band (wordmark + "Welcome back! Please login to continue" / "Create your account in seconds") + cream body.
- Login: Email/Username · Password (eye toggle) · Remember me + Forgot password? row · `LOGIN TO ACCOUNT` · "New to Quadis? **Create an account**".
- Register: Full name + Username (2-col) · Email · Phone (+91 prefix) · Password (min 6, eye toggle) · Referral ID (optional) · Terms/Privacy checkbox (required) · `CREATE FREE ACCOUNT` · "Already have an account? **Sign in**".
- Client-side validation per §4 input states; disable submit while pending.

---

## 7. Motion, a11y, quality bar

- Motion: fade-up 12px on section entry (IntersectionObserver, once, 400ms ease-out); card hovers 200ms; honor `prefers-reduced-motion`.
- A11y: semantic landmarks; one H1 per page; visible focus states everywhere; nav dropdowns keyboard-operable; alt text = hotel/venue name + subject; contrast ≥ 4.5:1 (verify gold-on-dark labels ≥ 3:1 for large text, else use `--text-on-dark`).
- Hit targets ≥ 44px on mobile. Lighthouse targets: Performance ≥ 90, A11y ≥ 95. Images: WebP, `srcset`, lazy-load below fold.

## 8. Acceptance checklist (per page)
- [ ] Tokens only — no hex values outside §2.
- [ ] Nav, footer, WhatsApp button present and identical.
- [ ] Overline + serif H2 pattern on every section header.
- [ ] Max 2 section background colors per page.
- [ ] All hotel/venue data rendered from §5 JSON, not hard-coded in markup.
- [ ] Booking bar / filters / forms work client-side with the exact states in §4.
- [ ] No "budget"-era copy; tone per §1.
- [ ] Responsive at 1440 / 1024 / 768 / 390 with no horizontal scroll or layout shift.
