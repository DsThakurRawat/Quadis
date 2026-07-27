# Handoff — bring the backend back up

Supersedes the earlier version of this file. Steps 1–3 of that one are done;
what follows is what is still needed, verified against the live account.

**The backend is currently DOWN — 502, crash-looping.** Everything else is fine.

---

## Why it is down

The environment runs `co3-a298647`, built before the TLS fix. On boot it now has
a `DATABASE_URL`, tries to connect to RDS, and is refused:

```
❌ Database migration failed — refusing to start: error: no pg_hba.conf entry
   for host "172.31.27.67", user "quadis", database "postgres", no encryption
```

The operative words are **"no encryption"**. RDS Postgres 16+ ships with
`rds.force_ssl` on; node-postgres connects in plaintext unless told otherwise,
so the handshake is rejected. Migration throws, the server exits by design, and
nginx has no upstream.

**Nothing is misconfigured.** Credentials, security group and URL are all
correct — `psql` connects with the identical `DATABASE_URL`, because psql
negotiates TLS by default. That is what makes this one deceptive: every manual
check passes while the app cannot boot, and the error names `pg_hba.conf`, which
reads like a firewall problem and is not one.

Fixed in `d33d964`. The deployed bundle simply predates it.

---

## Current state

| Thing | Value |
|---|---|
| Repo HEAD | `25baa29` on `main` (13 commits unpushed — see step 4) |
| EB application | `quadis-backend` |
| EB environment | `quadis-backend-live` — Ready / **Red**, running `co3-a298647` |
| Endpoint | `http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com` (HTTP only) |
| RDS | `quadis-db-live` — available, **migrated and seeded**: 9 properties, 20 room types, 197 keys |
| Photo bucket | `quadis-hotel-images` — created, public-read |
| Frontend bucket | `quadis-hotels-test-co3` |
| Already set on EB | `SESSION_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGIN`, `ADMIN_PIN`, `GROQ_API_KEY` |

The database needs nothing. It is already schema-applied and seeded.

---

## Step 1 — grant the instance write access to the photo bucket

New since last time: the admin panel can now upload hotel photos, and the
instance needs to write to S3. Skip this and uploads fail with AccessDenied
while everything else works.

```bash
ROLE=$(aws elasticbeanstalk describe-configuration-settings \
  --application-name quadis-backend --environment-name quadis-backend-live \
  --query 'ConfigurationSettings[0].OptionSettings[?OptionName==`IamInstanceProfile`].Value' \
  --output text)
echo "instance profile: $ROLE"

aws iam put-role-policy --role-name "$ROLE" --policy-name quadis-hotel-images-rw \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Action":["s3:PutObject","s3:DeleteObject"],
      "Resource":"arn:aws:s3:::quadis-hotel-images/*"
    }]
  }'
```

If the instance profile name differs from the role name, look the role up with
`aws iam get-instance-profile --instance-profile-name "$ROLE"` and use the role
inside it.

---

## Step 2 — build, package and deploy

```bash
cd /home/divyansh-rawat/Quadis/backend
npm install          # @aws-sdk/client-s3, multer and sharp are new
npm run build

VER="co3-$(git rev-parse --short HEAD)"     # co3-25baa29 at time of writing
zip -qr "/tmp/$VER.zip" dist package.json package-lock.json Procfile .ebextensions -x "*.map"

aws s3 cp "/tmp/$VER.zip" "s3://elasticbeanstalk-us-east-1-093650262440/$VER.zip"

aws elasticbeanstalk create-application-version \
  --application-name quadis-backend --version-label "$VER" \
  --source-bundle S3Bucket=elasticbeanstalk-us-east-1-093650262440,S3Key=$VER.zip

aws elasticbeanstalk update-environment \
  --environment-name quadis-backend-live --version-label "$VER" \
  --option-settings \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=IMAGE_BUCKET,Value=quadis-hotel-images" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value=us-east-1"
```

`sharp` ships platform-specific binaries. The bundle above deliberately excludes
`node_modules`, so Beanstalk runs `npm install` on the Amazon Linux instance and
gets the right build. Do not zip `node_modules` from a dev machine.

---

## Step 3 — verify, and do not stop at "Ready"

`Ready` only means the config applied. These three prove the app actually works:

```bash
API=http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com

# 1. Alive at all — 502 means it is still crash-looping.
curl -s -o /dev/null -w "health: %{http_code}\n" "$API/api/health"

# 2. Serving from Postgres with the new rates. Expect 1500, not 1599.
curl -s "$API/api/properties" | head -c 300

# 3. Photo upload works — needs step 1. Expect 201.
curl -s -o /dev/null -w "upload: %{http_code}\n" -X POST \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -F "photos=@../public/images/tiers/tier-quadis-select.png" \
  "$API/api/admin/properties/hotel-quadis-sector-51-noida/images"
```

If health is 200 but properties is empty, the app fell back to in-memory —
check `DATABASE_URL` is still set.

---

## Step 4 — push, and rebuild the frontend

```bash
cd /home/divyansh-rawat/Quadis
git push origin main        # 13 commits, scanned, no credentials

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

The URL ends in `/api` — `getApiUrl()` appends the endpoint path to it.

Verify in a **browser**, not curl. CORS only fails in a browser: requests with
no Origin header are allowed through, so curl will pass even if CORS is wrong.

---

## Traps

- **Never sync `dist/` to `quadis-hotel-images`.** The frontend bucket is synced
  with `--delete`; pointing that at the photo bucket erases every upload. They
  are separate buckets for exactly this reason.
- **Never upload `client-assets/`.** It holds the client's GoDaddy and Razorpay
  logins in plaintext. Gitignored, and it must never reach a bucket.
- **HTTP only.** Backend and the S3 website endpoint are both HTTP, so they talk
  fine. The moment HTTPS fronts the frontend, the browser blocks the HTTP API
  call as mixed content.
- **Deep links return HTTP 404** from S3 — `ErrorDocument` serves index.html but
  keeps the status. CloudFront is what fixes it.

## Not in scope

Do not touch DNS. `quadishotels.com` still points at the client's existing host,
and its nameservers are at theserverindia, not GoDaddy — repointing them without
recreating the Google MX records takes the client's email down. See
`docs/dns-cutover.md`.
