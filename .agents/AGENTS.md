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

- [ ] **Push** — commits sit unpushed on `main`.
- [ ] **Deploy `8577e4b`** — child age-band pricing. Live backend is
      `co3-cabcbc3`, which predates it.
- [ ] **Walk a booking in a browser** — search, room, hold, pay, invoice. The
      only end-to-end test so far was a `curl` POST, which proves the pricing
      maths but cannot see a React crash or a CORS failure. Those are the two
      things that have actually broken this site.
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

The pattern: **the automated suite cannot see the failures this project
actually has.** Assume a third exists.

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
