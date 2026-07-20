# quadis-readme-3
Change order + chatbot plan for the Quadis build. Read alongside `Quadis-Frontend-Spec.md` (source of truth for tokens/pages). Applies on top of your current build.

---

## 1. Hero fixes (current build drifts from design — match preview 1:1)
1. **Add hero image layer** — full-bleed photo slot + scrim `linear-gradient(rgba(20,19,16,.35), rgba(20,19,16,.65))`. Flat dark background is wrong. Until photos arrive, the slot is a placeholder (solid `--bg-warm`).
2. **Hero height** — `height: 100vh; max-height: 720px`. Currently too tall; text floats.
3. **H1 fits 2 lines** — "Refined stays, made effortless" must not wrap to 3. Container ~900px; H1 96–104px / line-height 0.96 / Marcellus.
4. **Alignment** — hero content in the 1440px container, 56px side padding, vertically centered.
5. **Add booking bar** — white card overlapping hero bottom −52px: Destination · Check-in · Check-out · Rooms (1–5) · Guests (1–12) · gold search. Grid `1.4fr 1fr 1fr .8fr .8fr auto`, gap 16px, radius 8px, shadow `0 24px 48px rgba(20,19,16,.18)`.
6. **Scroll cue** — labeled (thin line + `SCROLL` overline) or removed; bare line looks broken.
7. **Nav container** — logo/links/auth buttons align to the same 1440px edges as page content.

## 2. Stack
- **TypeScript strict everywhere** — frontend, backend, chatbot. No plain JS.
- Shared `types.ts`: `Hotel`, `BanquetVenue`, `BookingQuery`, `ContactPayload`, `EnquiryPayload`, `CorporateRFPPayload`. Backend and chatbot tools reuse these — do not redefine shapes.

## 3. Images — policy + delivery promise
- Everything in repo `Reference-images/` is a **screenshot of the old site** — layout/content reference ONLY. Never serve these files. Remove any already placed.
- **We (client) will provide real photos later.** Build every image slot as a neutral placeholder now: solid `--bg-warm`, venue name centered, correct `aspect-ratio` reserved — zero layout shift when photos land.
- Photos will arrive in EXACTLY this structure; code maps over folders, no renaming, no code edits:
```
public/images/home/hero.jpg            2400px, landscape
public/images/about/story.jpg          1600px
public/images/auth.jpg                 1920px (login/register bg)
public/images/hotels/<slug>/hero.jpg   1920px  + 01–04.jpg 1200px
public/images/banquets/<slug>/hero.jpg 1600px  + 01–03.jpg
public/images/restaurant/hero.jpg      + 01–04.jpg 1200px
```
- Slugs exactly as spec §5. `hero.jpg` = lead shot; numbered files = gallery order.

## 4. Customer-support chatbot (GenAI, agentic)

### Placement
- Chat bubble **bottom-right** (primary support entry), 56px, 24px from edges, `--bg-dark` with gold icon.
- WhatsApp bubble moves **bottom-left**. On mobile (<768px) only the chat bubble shows; WhatsApp lives inside chat as "Talk to a human."
- Neither may overlap page CTAs; z-index above content, below modals.

### Widget UI (build now, frontend-only)
- 380px panel (full-screen sheet on mobile), radius 8px, shadow as booking bar.
- Dark header (`--bg-dark`): wordmark + "Quadis Assist" + online dot; cream body (`--bg-cream`); tokens/type per spec §2 — it must look native to the site.
- Message bubbles: guest = white card w/ `--border-card`; bot = `--bg-warm`. Quick-reply chips styled as filter pills.
- Persistent footer link: **"Talk to a human on WhatsApp"** → `wa.me/919217373532` with conversation context prefilled.

### Phase 1 (ship with frontend, no backend)
Menu-driven flows, no AI: `Book a room · Banquet enquiry · Corporate rates · Existing booking help · Talk to a human`.
Each flow = 2–3 taps → action: deep-link `/hotels?city=…`, prefilled enquiry form, or WhatsApp handoff with context ("Banquet enquiry — Cladis, 200 guests, 12 Nov"). Pure frontend state.

### Phase 2 (backend lands): agentic GenAI
- **Language: TypeScript** (Node). Same language as frontend; `types.ts` shapes become tool schemas; SDK tool-calling + streaming are first-class. Python not needed at this scale.
- Architecture — keep it exactly this simple:
  1. System prompt: all 10 properties' data, policies (check-in/out, cancellation, parking, GST invoicing), premium tone rules.
  2. Tools: `searchHotels(query)`, `getBooking(id, phone)`, `createEnquiry(payload)`, `handoffWhatsApp(context)` — all typed from `types.ts`, calling the same API as the site.
  3. Guardrails: **never invent prices/availability** — always fetch via tool or hand off. Off-topic/low-confidence → WhatsApp handoff. Refuse non-Quadis topics.
- Streaming responses into the Phase-1 widget (UI unchanged — only the response source swaps).
- Hindi + English toggle in widget header.
- Log every conversation; review monthly to improve FAQ grounding.
- Bot never blocks booking — booking bar and phone remain the primary paths.

## 5. Acceptance
- [ ] Hero matches design preview 1:1 (image layer, ≤720px height, 2-line H1, centered, booking bar overlap).
- [ ] Strict TS compiles, zero `any` on data shapes; single shared `types.ts`.
- [ ] No `Reference-images/` files served; all slots are aspect-ratio-reserved placeholders.
- [ ] Chat widget: bottom-right, native styling, Phase-1 flows working, WhatsApp handoff with prefilled context, full-screen on mobile.
- [ ] WhatsApp bubble bottom-left desktop / hidden on mobile.
