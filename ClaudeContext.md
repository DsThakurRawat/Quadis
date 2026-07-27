# Claude Context — read this first

The directing document for anyone, human or agent, working on Quadis Hotels.
Start here, then follow the links.

Every fact below was verified against the live account, not assumed. Where a
previous summary claims something this file contradicts, this file is what was
actually measured.

---

## 1. What this project is

Nine hotels across Noida and New Delhi. React + Vite frontend, Node/Express +
PostgreSQL backend, deployed on AWS. The client is Quadis Services Private
Limited; the site is not live yet — `quadishotels.com` still points at their old
host.

| Where | What |
|---|---|
| `src/` | Frontend. Vite, React Router, no Tailwind — styles live in `src/styles/*.css` |
| `backend/` | Express API, Postgres, Jest. `npm test` must stay green |
| `docs/` | Working documentation. `HANDOFF-aws-deploy.md` is the deployment source of truth |
| `docs/client-comms/` | Messages to send the client. **`questions-round-3.txt` is the live one** |
| `client-assets/` | What the client sent. **Gitignored — contains plaintext credentials** |

---

## 2. Rules that are not negotiable

1. **Never commit or upload `client-assets/`.** It holds the client's live
   GoDaddy and Razorpay passwords in plaintext. The `client-assets/` line in
   `.gitignore` is the only thing preventing that. Do not narrow it.
2. **Never touch DNS.** The domain is registered at GoDaddy but its nameservers
   are at theserverindia, so the zone — including the Google MX records — is
   served by the old web host. Repointing without recreating those records takes
   the client's email down. See `docs/dns-cutover.md`.
3. **Do not change the third-person occupancy charge.** The client has stated it
   three different ways. The code uses 30% with children free. It decides what
   guests are billed; it changes only on a written answer.
4. **Do not build further into booking or payments.** Whether "Book Now" stays
   on our site or redirects to the client's PMS is unanswered. If it redirects,
   CheckoutModal, RazorpayService, InvoiceService and the soft-hold engine are
   all discarded.
5. **`Ready` is not `working`.** Always finish with a browser check. See §5.

---

## 3. Live infrastructure

| Thing | Value |
|---|---|
| AWS account / region | `093650262440` / `us-east-1` |
| EB app / environment | `quadis-backend` / `quadis-backend-live` |
| API | `http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com` (HTTP only) |
| RDS | `quadis-db-live`, Postgres 18.3 — seeded: 9 properties, 20 room types, 197 keys |
| **EB instance SG** | **`sg-07e7ba582065ed9e8`** |
| RDS SG | `sg-03e1c65d4487ac04a` — 5432 open only to the instance SG |
| Frontend bucket | `quadis-hotels-test-co3` |
| Photo bucket | `quadis-hotel-images` — uploads verified working |
| CloudFront | `d3v9wiun4hyfqn.cloudfront.net` and `djqj43186y3yh.cloudfront.net` — **two exist, see §4** |

> **The security group trap.** `describe-configuration-settings` returns *two*
> values for `SecurityGroups`. The one that looks obvious,
> `sg-0f03fb094dfbada9c`, is the **load balancer**. Granting RDS access to it
> instead of the instance group silently cuts the application off from its
> database — health checks keep passing while every data call hangs for 40
> seconds. This has already happened once. Resolve the instance group from the
> instance itself:
> ```
> aws ec2 describe-instances --instance-ids \
>   $(aws elasticbeanstalk describe-environment-resources \
>       --environment-name quadis-backend-live \
>       --query 'EnvironmentResources.Instances[].Id' --output text) \
>   --query 'Reservations[].Instances[].SecurityGroups[].[GroupId,GroupName]'
> ```

---

## 4. Known broken, right now

**13 hardcoded image paths return 404 on the live site.**

The image optimisation converted `public/images/**` to WebP and deleted the
originals, and updated the references in `src/data/images.ts` — but four other
files name image paths as literal strings and were missed:

- `src/components/DestinationsGrid.tsx` — the entire **Destinations For You**
  grid, which is a section the client specifically asked us to fix
- `src/components/DealsSection.tsx` — all four **Exclusive Savings** cards
- `src/pages/About.tsx`, `src/data/virtualTourData.ts` — hero fallbacks

Verified live: `/images/upcoming/noida.png` → **404**,
`/images/upcoming/noida.webp` → **200**. Every broken path has a `.webp`
sibling, so the fix is mechanical.

This class of bug does not appear in a typecheck, a build, or the test suite.
It is a runtime 404. To find them all:

```bash
grep -rhoE "'/images/[^']*\.(png|jpg|jpeg)'" src/ --include=*.ts --include=*.tsx \
  | tr -d "'" | sort -u | while read p; do
    [ -f "public${p}" ] || echo "BROKEN $p"
  done
```

**Two CloudFront distributions exist.** Only one should. Establish which is
wired correctly before deleting either.

---

## 5. How to verify anything here

The two worst incidents on this project both passed every automated check while
production was down. Neither was catchable without a real database and a real
browser.

- **TLS refusal.** RDS Postgres 16+ forces SSL; node-postgres connects plaintext.
  The app crash-looped. `psql` connected fine with the identical URL, because
  psql negotiates TLS by default — so every manual check passed.
- **NUMERIC as string.** Postgres returns `NUMERIC` as text. `rating.toFixed(1)`
  threw, React unmounted, every page rendered blank. Worse quietly:
  `price + offset` concatenated, so a ₹1,500 room with a ₹1,000 upgrade quoted
  `"15001000"`. Local dev, CI and 102 tests all passed.

So, in order:

```bash
# 1. Numbers must be unquoted.
curl -s "$API/api/properties" | grep -o '"base_price":[^,]*' | head -2
#    want "base_price":1500        NOT "base_price":"1500.00"

# 2. Then open a browser. Cards must render, console must be clean,
#    prices must read ₹3,000 / night.
```

`curl` cannot see a React crash, and CORS failures only occur in a browser —
requests without an `Origin` header pass regardless.

---

## 6. Where the numbers came from

Rates, room categories and inventory are the client's rate sheet of 27 Jul 2026,
in `client-assets/briefs/`. Read `client-assets/briefs/INDEX.md` before changing
any of them — it records which of three conflicting sources the code follows and
why.

Two figures are assumptions the client has not confirmed: whether a **child**
triggers the third-person charge (currently free), and the four rates where
their two documents disagreed (currently the rate sheet).

Totals reconcile exactly: 125 Noida + 72 Delhi = 197 keys.

---

## 7. What is blocked, and on whom

**On the client** — the child-charge rule, the theserverindia hosting login,
live Razorpay keys (still `rzp_test_simulated`), photo storage choice
(Cloudinary vs S3), AWS cost confirmation, and the PMS decision in §2.4.
Messages are drafted and waiting in `docs/client-comms/questions-round-3.txt`
and `message-photo-storage.txt`.

**On us** — the 13 broken paths in §4, the duplicate CloudFront distribution,
and an end-to-end booking walked in a browser against the live database.

---

## 8. Conventions

- Comments explain **why**, not what. If a line looks odd, the comment says what
  broke without it.
- No hex outside `src/styles/tokens.css`. There is no Tailwind — class names
  like `py-12` resolve to nothing.
- `tsconfig` sets `noUnusedLocals`; orphaned imports fail the build.
- Run `npm run typecheck` and `backend/ npm test` before declaring anything done.
- Photo storage goes through the `ImageStore` interface. Do not hard-wire a
  vendor — the client has not chosen one.
