# Handoff — one redeploy, front and back

Supersedes the previous version. Everything it asked for is done and verified.
What is left is a single fix that has to reach **both** the backend and the
frontend bundle.

**The website is currently blank.** The API is healthy; the browser is not.

---

## Why the site is white

Connecting the real database exposed a type bug. node-postgres returns
`NUMERIC` as a **string**, because the type is arbitrary-precision — and every
price, rate and rating in this schema is `NUMERIC`. So the API started serving:

```json
"base_price": "1500.00",  "rating": "4.60"
```

The frontend calls `rating.toFixed(1)`. On a string that throws
`toFixed is not a function`, React unmounts, and every page renders blank.

The quieter half is worse: `hotel.price + roomOffset` **concatenates** when
price is a string, so a ₹1,500 room with a ₹1,000 upgrade quotes `"15001000"`
instead of 2500. A wrong price on a booking page, with nothing to surface it.

Nothing caught it. The in-memory store holds real numbers, so local development,
CI and every test passed while production was white. It can only appear against
PostgreSQL.

Fixed in **`809b0d6`** — type parsers on the backend, plus coercion at the
frontend boundary. Both halves ship in that commit, which is why the frontend
must be rebuilt too and not just the backend.

---

## Already done — do not repeat

| | |
|---|---|
| Backend deployed | `co3-7140ed6`, Ready / Green |
| Database | migrated and seeded — 9 properties, 20 room types, 197 keys |
| Env vars | `SESSION_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGIN`, `IMAGE_BUCKET`, `AWS_REGION` |
| IAM | `quadis-hotel-images-rw` attached to `aws-elasticbeanstalk-ec2-role` |
| Photo uploads | **verified working on the live instance** — upload 201, served as `image/webp`, delete 200 |
| Git | pushed to `origin/main` |

The database, IAM and env vars need nothing further.

---

## Step 1 — redeploy the backend

```bash
cd /home/divyansh-rawat/Quadis
git pull origin main          # must include 809b0d6

cd backend
npm install
npm run build

VER="co3-$(git rev-parse --short HEAD)"      # co3-809b0d6 at time of writing
zip -qr "/tmp/$VER.zip" dist package.json package-lock.json Procfile .ebextensions -x "*.map"

aws s3 cp "/tmp/$VER.zip" "s3://elasticbeanstalk-us-east-1-093650262440/$VER.zip"

aws elasticbeanstalk create-application-version \
  --application-name quadis-backend --version-label "$VER" \
  --source-bundle S3Bucket=elasticbeanstalk-us-east-1-093650262440,S3Key=$VER.zip

aws elasticbeanstalk update-environment \
  --environment-name quadis-backend-live --version-label "$VER"
```

No `--option-settings` this time. Every variable is already set, and passing
them again only risks clobbering one.

Do not zip `node_modules`. `sharp` ships platform-specific binaries and
Beanstalk must build them on Amazon Linux.

---

## Step 2 — rebuild and re-upload the frontend

Required, not optional. The coercion fix lives in the bundle as well.

```bash
cd /home/divyansh-rawat/Quadis

VITE_API_URL=http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com/api \
  npm run build

printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt   # test bucket, never index it
rm -f dist/sitemap.xml

B=quadis-hotels-test-co3
aws s3 sync dist/ "s3://$B/" --delete --only-show-errors \
  --exclude index.html --exclude robots.txt \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://$B/index.html" --only-show-errors \
  --cache-control "no-cache,must-revalidate" --content-type "text/html; charset=utf-8"
aws s3 cp dist/robots.txt "s3://$B/robots.txt" --only-show-errors \
  --cache-control "no-cache" --content-type "text/plain; charset=utf-8"
```

---

## Step 3 — verify

The API being healthy proves nothing here; the last deploy was healthy and the
site was still blank. Check in this order.

```bash
API=http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com

# 1. Numbers must be unquoted. "1500.00" with quotes means the fix is not live.
curl -s "$API/api/properties" | grep -o '"base_price":[^,]*' | head -3
#    want: "base_price":1500        NOT: "base_price":"1500.00"

curl -s "$API/api/properties" | grep -o '"rating":[^,]*' | head -3
#    want: "rating":4.6             NOT: "rating":"4.60"
```

**2. Then open the site in a browser** —
`http://quadis-hotels-test-co3.s3-website-us-east-1.amazonaws.com/hotels`

- Hotel cards must be visible. A blank cream page means the fix did not reach
  the bundle — rebuild the frontend.
- Open the console. It must be free of `toFixed is not a function`.
- Prices must read `₹3,000 / night`, not `₹3000.00` and not `₹15001000`.

A browser is required. `curl` cannot see a React crash, and CORS failures only
happen in a browser — requests without an `Origin` header are allowed through,
so curl passes even when CORS is misconfigured.

---

## Traps

- **Never sync `dist/` to `quadis-hotel-images`.** The frontend bucket is synced
  with `--delete`; aiming that at the photo bucket erases every uploaded photo.
- **Never upload `client-assets/`.** It holds the client's GoDaddy and Razorpay
  logins in plaintext.
- **HTTP only.** Backend and the S3 website endpoint are both HTTP so they talk
  fine. Putting HTTPS in front of the frontend breaks the API call as mixed
  content.
- **Deep links return HTTP 404** from S3 — `ErrorDocument` serves index.html but
  keeps the status. CloudFront is what fixes it.

## Not in scope

Do not touch DNS. `quadishotels.com` still points at the client's existing host,
and its nameservers are at theserverindia, not GoDaddy — repointing them without
recreating the Google MX records takes the client's email down. See
`docs/dns-cutover.md`.
