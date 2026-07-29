# Migrating to the client's AWS account

Written 29 Jul 2026 so this can be picked up cold. Everything below was read off
the live account, not assumed.

**No credentials in this file, or anywhere in this repo.** Access keys live in
`~/.aws/credentials` only. Account IDs are not secret; keys are.

---

## Where things run today

The builder's account. Free Tier — the July bill is effectively zero, which is
why everything is the smallest possible size.

| Thing | Value |
|---|---|
| Account / region | `093650262440` / `us-east-1` |
| Frontend bucket | `quadis-hotels-test-co3` (S3 **website** endpoint) |
| Photo bucket | `quadis-hotel-images` |
| CloudFront | `E1ZV1EQ1QRKH08` → `djqj43186y3yh.cloudfront.net` |
| EB app / env | `quadis-backend` / `quadis-backend-live` |
| EB instance | `t3.micro` — 2 vCPU, **1 GiB** |
| RDS | `quadis-db-live`, Postgres 18.3, `db.t3.micro`, 20 GB, single-AZ |
| RDS data | 9 properties, 20 room types, 197 keys, plus any real bookings |

Also on that account and **not** part of the app:
`aws-cloudtrail-logs-…`, `elasticbeanstalk-us-east-1-…`.

---

## Decisions to make before building anything

**1. Region. Recommend `ap-south-1` (Mumbai).** Everything is in `us-east-1`
today. The hotels are in Delhi and Noida and so are the guests. Moving accounts
is the one moment changing region is nearly free — afterwards it is a second
migration.

**2. Instance size. `t3.small` minimum, not `t3.micro`.** 1 GiB is what wedged
the API for 30 minutes on 29 Jul (AGENTS.md incident 6). On the client's account
there is no Free Tier reason to accept it. `backend/.ebextensions/02_swap.config`
adds swap and should still ship, but it is a safety net, not a substitute.

**3. Does her account still have Free Tier?** Twelve months from account
creation. Changes the cost conversation, not the architecture.

---

## CLI access

```bash
aws configure --profile quadis-client      # her keys, prompted, not stored here
aws sts get-caller-identity --profile quadis-client
```

Then every command takes `--profile quadis-client`. Keep the default profile
pointed at the builder account so the two are never confused — the whole
migration involves both at once, and a mis-targeted `aws s3 sync --delete` is
unrecoverable.

Read-only checks first. Create nothing until `get-caller-identity` shows the
account you expect.

---

## Order

Steps 1–3 are reversible and touch no live traffic. Step 5 is the one with teeth.

1. **Rebuild on her account** — chosen region, `t3.small`, fresh RDS, run
   `migrate.ts` and the seed. Set every environment variable (list below).
2. **Verify on the new CloudFront URL** — the §6 checks in AGENTS.md, plus a
   real browser walk. Nothing has touched DNS yet, so the live site is unaffected.
3. **Copy the photo bucket** — `quadis-hotel-images` holds admin-panel uploads,
   which are not in git and not reproducible from the repo.
4. **Export the DNS zone from theserverindia and diff it.** See below.
5. **Switch nameservers.**
6. **Test mail immediately** — send *and* receive on `info@quadishotels.com`,
   then again the next day.
7. **Test payment on the real domain.**
8. **Keep the old hosting paid 2–3 weeks.** Propagation is uneven.
9. Only then tear down the builder account, and rotate the Razorpay keys and
   admin password afterwards.

---

## DNS — the part that can break her business

`quadishotels.com` today, verified 29 Jul:

```
A     quadishotels.com  ->  115.124.108.190      (theserverindia, IIS/ASP.NET/Plesk)
NS    yellow1.theserverindia.com, yellow2...
MX    1 smtp.google.com                          (Google Workspace)
```

`quadishotel.com` — singular — does not resolve at all. No A, no NS, no MX. The
domain is the plural one.

**CloudFront has no static IP, so an apex A record cannot point at it.** Apex →
CloudFront needs an ALIAS, which in practice means Route 53. That rules out the
low-risk path in `docs/dns-cutover.md` ("change one A record, touch nothing
else") and forces a nameserver move, which relocates the whole zone.

Every record has to exist in the new zone **before** the switch:

```
@          A      -> CloudFront ALIAS (was 115.124.108.190)
www        CNAME  quadishotels.com.
mail       A      115.124.108.190
webmail    A      115.124.108.190
ftp        CNAME  quadishotels.com.
blog       A      115.124.108.190
api        A      115.124.108.190
booking    A      115.124.108.190

MX   1  smtp.google.com                    <-- her email dies without this
TXT  v=spf1 a mx include:websitewelcome.com include:_spf.google.com
     include:Yellow.theserverindia.com ~all
TXT  google-site-verification=tx0Bc_a9v1k8qT6UHjQ716HZvDHpLwFt5VFYZjA0u3Y
TXT  google-site-verification=c8NaV2tMxsnJt69f5Wto3bILWNlsYcz1NMDpUcewLP4
```

That list is what a public resolver can see. **Get the real zone export from
theserverindia and diff it** — DKIM selectors under `_domainkey`, autodiscover
records and any subdomain not guessed above will not show from outside.

`mail`, `webmail`, `blog`, `api` and `booking` currently point at the old host
and should keep doing so unless someone decides otherwise. Note `booking.` has
had an expired certificate since 18 Apr 2026, so it is almost certainly dead —
see AGENTS.md §5 — but leaving the record intact costs nothing.

---

## Environment variables to recreate

Names only. Values come from the password manager, not from here.

```
DATABASE_URL           new RDS endpoint
CORS_ORIGIN            MUST become https://quadishotels.com at cutover
                       — wrong value here is incident 5 all over again
RAZORPAY_KEY_ID        rzp_live_… (must start rzp_live_, see below)
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
ADMIN_PASSWORD         regenerate, do not copy
ADMIN_PIN              regenerate, do not copy
SESSION_SECRET         regenerate, do not copy
GROQ_API_KEY
IMAGE_BUCKET           new photo bucket name
AWS_REGION, NODE_ENV=production, PORT=3001
```

Also re-point the **Razorpay webhook** at the new URL, and re-set the same
webhook secret. `docs/razorpay-golive.md` has that procedure.

---

## Two traps carried over

**Razorpay rejects unregistered domains.** The ₹2 test on 29 Jul failed with
*"Business – Website mismatch"* because only `quadishotels.com` is Approved and
we serve from `djqj43186y3yh.cloudfront.net`. The good news: **the cutover fixes
payment for free** — the real domain is already approved, so no throwaway
CloudFront approval is needed.

**A real test key passes our own check.** `RazorpayService` only rejects the
literal `rzp_test_simulated` and `mock`, so an `rzp_test_…` key flips the app
into live mode against Razorpay's test environment — checkout looks like it
works and takes no money. Always confirm `rzp_live_`.

---

## Still owed to the client

- The AWS cost figure — asked twice, on 29 Jul
- That the regenerated Razorpay key may have broken her existing site's payments
- Which of the **two** Razorpay accounts is the real one (Sept '21 vs Feb '26)

---

`docs/HANDOFF-aws-deploy.md` describes the *original* deploy to the builder
account and is now partly stale — it opens by saying the site is blank, which it
has not been since 27 Jul. Read this file for the migration; read that one only
for history.
