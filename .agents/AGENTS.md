# AGENTS.md

Shared contract for every agent and person working on Quadis Hotels. Read it
before starting. Update it as you go.

Replaces the separate per-agent context files. Two of those existed, they
disagreed about what was done, and the disagreement caused real damage — see
§7.

**Everything here is something someone checked, not something someone intended.**
If you write a claim into this file, verify it first.

---

## 1. Claim board — write here BEFORE you start

Say who you are and what you are touching. Two collisions have already happened
because nobody did.

| Agent | Working on | Files / resources | Since | Status |
|---|---|---|---|---|
| _(free)_ | | | | |

Rules:
- Claim before the first edit, not after the last one.
- Claim the **resource**, not the intention. "`public/images/**` + anything
  referencing an image path" beats "image optimisation".
- Clear your row when you stop, even if unfinished — say what you left half-done.
- If a row is occupied and you need those files, say so here rather than editing
  around them.

---

## 2. Rules that are not negotiable

1. **Never commit or upload `client-assets/`.** It holds the client's live
   GoDaddy and Razorpay passwords in plaintext. The `client-assets/` line in
   `.gitignore` is the only thing preventing that. Do not narrow it.
2. **Never touch DNS.** The domain is registered at GoDaddy but its nameservers
   are at theserverindia, so the zone — including the Google MX records — is
   served by the old web host. Repointing without recreating those records takes
   the client's email down. See `docs/dns-cutover.md`.
3. **Do not change occupancy pricing without a written client answer.** It
   decides what guests are billed. Current rule, from 27 Jul: extra adult 30%,
   under-8 free, 8–12 at 20%, 13+ as adult.
4. **Do not build further into booking, payments or the admin panel.** Two
   things are unanswered and either one can discard that work:
   - Whether "Book Now" stays on our site or redirects to the client's PMS. If
     it redirects, CheckoutModal, RazorpayService, InvoiceService and the
     soft-hold engine are all unused.
   - **The client already has a working hotel management system** at
     `adminweb.quadishotels.com` — hotels, bookings, coupons, occupancy, users,
     SEO fields, image upload — holding their real inventory. See §5. We may be
     rebuilding what they already have.
5. **`Ready` is not `working`.** Finish every deploy with a browser check. §6.

---

## 3. Live state

| Thing | Value |
|---|---|
| AWS account / region | `093650262440` / `us-east-1` |
| Site (live) | **`https://djqj43186y3yh.cloudfront.net`** — HTTPS, `/api/*` proxied, deep links fixed |
| CloudFront distribution | `E1ZV1EQ1QRKH08` — invalidate `/index.html` and `/` after a frontend upload |
| Deployed version | Frontend `4fa8b1c`, 28 Jul (bundle `index-DvPrWQGR.js`). Backend `co3-84a3e86` — unchanged since, no backend code in `b44ad78`/`4fa8b1c` |
| EB app / environment | `quadis-backend` / `quadis-backend-live` |
| API origin | `http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com` (HTTP; reach it through CloudFront) |
| RDS | `quadis-db-live`, Postgres 18.3 — seeded: 9 properties, 20 room types, 197 keys |
| **EB instance SG** | **`sg-07e7ba582065ed9e8`** — see the trap below |
| RDS SG | `sg-03e1c65d4487ac04a` — 5432 open only to the instance SG |
| Frontend bucket | `quadis-hotels-test-co3` |
| Photo bucket | `quadis-hotel-images` |
| Frontend build flag | `VITE_API_URL=https://djqj43186y3yh.cloudfront.net/api` |

> **Security-group trap.** `describe-configuration-settings` returns *two*
> values for `SecurityGroups`. The obvious one, `sg-0f03fb094dfbada9c`, is the
> **load balancer**. Granting RDS access to it instead of the instance group
> cuts the application off from its own database — health checks keep passing
> while every data call hangs for forty seconds. This has happened once already.
> Resolve it from the instance:
> ```
> aws ec2 describe-instances --instance-ids \
>   $(aws elasticbeanstalk describe-environment-resources \
>       --environment-name quadis-backend-live \
>       --query 'EnvironmentResources.Instances[].Id' --output text) \
>   --query 'Reservations[].Instances[].SecurityGroups[].[GroupId,GroupName]'
> ```

---

## 4. Task board

### Open

- [ ] **Stop CloudFront masking API errors.** The SPA deep-link fallback rewrites
      any `/api/*` 4xx/5xx into `index.html`, so every backend error reaches the
      frontend as `Unexpected token '<'`. That is what made incident 5 cost an
      afternoon instead of a minute. Exclude the `/api/*` behaviour from the
      custom error response.
- [ ] **Set `trust proxy`.** `express-rate-limit` throws
      `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on every request. Behind the load
      balancer every visitor shares one key, so the 100-req/15-min limit is
      global, not per-user — the site can rate-limit itself under light traffic.
- [ ] **Guest phone numbers land in access logs.** `GET /:code/invoice` takes
      `?phone=`, so every invoice download writes a real mobile number into
      nginx `access.log` in plaintext. Move it to a header or POST body.
- [ ] **`CORS_ORIGIN` must be updated at DNS cutover.** It is now
      `https://djqj43186y3yh.cloudfront.net`. The day `quadishotels.com` goes
      live it needs that origin too, or checkout breaks again — same failure as
      incident 5, on the day it is least welcome.
- [ ] **Confirm the 13–17 band with the client.** They gave 0–7 free and 8–12 at
      20% and stopped. Code reads 13+ as adult. Worth ₹600/night on a ₹2,000
      room. One constant — `DEFAULT_ADULT_FROM_AGE` — in both pricing mirrors.

### Done and verified — do not redo

Numeric parsing (API returns `1500` unquoted) · RDS closed to the internet · TLS
certificate verification live (`rejectUnauthorized: true` + RDS CA) · 27
hardcoded image paths repointed to `.webp` · HTTPS + deep links via CloudFront ·
orphan CloudFront deleted, one distribution left · cancellation policy page ·
three stale buckets deleted · photo upload working end to end · child age bands
implemented, 108 tests green.

**28 Jul** — 8 commits pushed to `origin/main` (head `84a3e86`). Both halves of
`8577e4b` deployed as `co3-84a3e86`: backend on EB (Ready/Green/Ok), frontend
rebuilt and synced, CloudFront invalidated. Verified live, not just green — the
API returns `child_free_under_age:8`, `child_percent:20`, `adult_from_age:13`,
all unquoted, so `migrate.ts` applied the three-band schema and the
`WHERE child_free_under_age = 18` update ran. **Live pricing changed at this
point** — it is the first real billing change to reach production, and the
13-17 band in it is still unconfirmed.

**28 Jul — the booking flow was walked in a real browser, first time ever.**
Search → property → room → age bands → hold → payment → invoice. Found and
fixed incident 5 (CORS). Verified after the fix: hold created from the browser
(`QD-MWW6N6N5`), all three age bands price correctly on screen (6 free, 10 at
₹600, 15 at ₹900 on a ₹3,000 room), GST back-computes correctly (₹3,482.14 +
12% = ₹3,900), images lazy-load, console clean throughout, invoice endpoint
returns a valid 1-page PDF. Payment stops with "Online payment is not enabled
on this environment" — correct degradation for `rzp_test_simulated`, not a
fault, and it is blocked on the client sending live keys.

**28 Jul — corporate banner corrected and deployed (`4fa8b1c`).** The client
flagged the wrong banner on the Corporate page; she was right. Fixed via a new
`corporateBannerImage` rather than repointing `corporateStayImage`, which also
feeds the home Offerings card. Verified live, not just built: the hero serves
`corporate-hotel-booking-banner-fv5WBSdE.webp`, the home card still serves
`corporate-and-long-stays-BiiR7QBY.webp` (read off the live DOM), console clean,
`base_price` still unquoted.

**Still unprocessed from the same 28 Jul batch:** `Banquet Halls.zip` holds 12
photos across the three real venues, and `public/images/banquets/` still has
only `hero.webp`. `banquetImages(slug)` looks for `banquets/<slug>/`, misses,
and falls back to hash-picked *dining* photos — so all three banquet venue cards
currently show restaurant interiors. Slugs are `banquets-at-hotel-amby-inn`,
`banquets-at-hotel-downtown-eok`, `banquets-at-hotel-downtown-sector-51`.

Also `tiers/tier-quadis-select.webp` is 395×276 beside siblings at 1200px. Not a
conversion fault — the client's own source file is that size. Needs a bigger one
from them.

Only one file under `client-assets/` is tracked: `property-data.md`
(lat/lng, copy decisions, photo categorisation). Checked at push time — it holds
no credentials. The briefs and passwords are untracked, as §2.1 requires.

### Known, not urgent

**`dist` is 48 MB because every image ships twice** — 22 MB in `dist/images`
(Vite copies `public/` verbatim) and 21 MB in `dist/assets` (the same files
hashed by `import.meta.glob('/public/images/**')`).

Worth halving, but **not** by dropping the glob for API-only image resolution.
That removes the offline fallback, so an API outage or a missing row renders
pages with no images at all — and this API has gone down twice in one afternoon.
Keep the glob as the fallback and let uploads override it, which is what
`imagesForHotel()` already does.

---

## 5. Blocked on the client

Messages are drafted in `docs/client-comms/`. Send
`message-existing-admin-panel.txt` first — it is the one that can invalidate
work already done.

### They already have an admin panel — discovered 27 Jul

`adminweb.quadishotels.com` is a live hotel management system on their existing
host: Dashboard, Hotels, Booking, Settings, Pages, Menu, Coupon, Add Occupancy,
Users. It holds their real inventory — Quadis Central 17 rooms, Downtown Sector
15 28 rooms, matching the rate sheet. It already has SEO meta fields, image
upload, occupancy pricing and a booking module: four things built here in the
last two days.

Verified: resolves to `115.124.108.190` (same server as the site), HTTPS 200,
titled "Hotel QuaDis". `booking.quadishotels.com` sits on the same IP.

Almost certainly the "Booking System connected with admin panel" from their
first reply, and possibly what the revenue manager meant by PMS.

**If it stays, rates and availability are maintained in two places** — which is
the double-source problem that causes double bookings, and the same one the PMS
question is about. It has to be one system or the other, and the client has to
say which.

Open: is it live and taking bookings · who built it and is it supported · is
there data to migrate (bookings, coupons, users) · does the new site replace it
or run alongside.

The 13–17 age band · the theserverindia hosting login · live Razorpay keys
(still `rzp_test_simulated`, so no real payment can be taken) · photo storage
choice, Cloudinary or S3 — `ImageStore` is an interface precisely so this stays
open, do not hard-wire a vendor · AWS cost confirmation · **the PMS decision in
§2.4, which decides the most.**

---

## 6. How to verify anything here

Both serious incidents on this project passed every automated check while
production was down. Neither was catchable without a real database and a real
browser.

```bash
# 1. Numbers must be unquoted.
curl -s https://djqj43186y3yh.cloudfront.net/api/properties \
  | grep -o '"base_price":[^,]*' | head -2
#    want "base_price":1500        NOT "base_price":"1500.00"

# 2. Then open a browser. Cards must render, console must be clean,
#    prices must read ₹3,000 / night.
```

`curl` cannot see a React crash, and CORS failures only happen in a browser —
requests without an `Origin` header pass regardless.

---

## 7. Incidents — read these before assuming a green check means anything

1. **TLS refusal.** RDS Postgres 16+ forces SSL; node-postgres connects
   plaintext. The app crash-looped. `psql` connected fine with the identical
   URL, because psql negotiates TLS by default — so every manual check passed
   and the error named `pg_hba.conf`, which reads like a firewall problem.
2. **NUMERIC as string.** Postgres returns `NUMERIC` as text.
   `rating.toFixed(1)` threw, React unmounted, every page rendered blank. Worse
   quietly: `price + offset` concatenated, so a ₹1,500 room with a ₹1,000
   upgrade quoted `"15001000"`. Local dev, CI and 102 tests all passed.
3. **Wrong security group.** A handoff named the load balancer group instead of
   the instance group. The agent applied it faithfully and the database went
   unreachable — 40-second hangs, health checks still green.
4. **Image rename without a reference sweep.** `public/images` was converted to
   WebP and the originals deleted, but only `src/data/images.ts` was updated.
   27 paths across 9 other files kept pointing at `.png` and `.jpg` and 404'd
   live, including the whole Destinations grid. Typecheck, build and tests all
   passed — the paths are strings.

5. **CORS blocked every write, and only in a browser.** `CORS_ORIGIN` on EB was
   still the pre-CloudFront S3 website URL, so the CloudFront origin was not on
   the allowlist. Reads were unaffected and the site looked completely healthy —
   because browsers omit `Origin` on same-origin GETs but **send it on every
   non-GET**, even same-origin. So `POST /api/bookings/initiate` carried an
   `Origin` the allowlist rejected, the cors middleware threw, and Express's
   default handler returned its HTML error page. The frontend called
   `res.json()` on that and surfaced `Unexpected token '<'`, which reads like a
   routing bug and is not one. `curl` sends no `Origin`, so the same POST
   returned 201 from both the origin and CloudFront. Booking had never once
   worked from a browser; the only end-to-end test on record was a curl POST.
   Found 28 Jul by walking the flow in a real browser — §6 predicted exactly
   this and named the reason.

The pattern: **the automated suite cannot see the failures this project
actually has.** Three of the five above were invisible to it. Assume a sixth
exists.

---

## 8. Where the numbers came from

Rates, room categories and inventory are the client's rate sheet of 27 Jul 2026,
in `client-assets/briefs/`. Read `client-assets/briefs/INDEX.md` before changing
any of them — it records which of three conflicting sources the code follows and
why. Totals reconcile exactly: 125 Noida + 72 Delhi = 197 keys.

---

## 9. Conventions

- Comments explain **why**, not what. If a line looks odd, the comment says what
  broke without it.
- No hex outside `src/styles/tokens.css`. There is no Tailwind — class names
  like `py-12` resolve to nothing.
- `tsconfig` sets `noUnusedLocals`; orphaned imports fail the build.
- `npm run typecheck` and `cd backend && npm test` before declaring anything done.
- `src/lib/pricing.ts` mirrors `backend/src/lib/pricing.ts`. Change one, change
  the other — the quote a guest sees and the amount they are charged come from
  these two files and must agree.
- Do not zip `node_modules` for a Beanstalk deploy. `sharp` ships
  platform-specific binaries and must be built on Amazon Linux.
