# Handoff — finish the AWS test deployment

Everything in this file is verified against the live account, not assumed. The
code work is committed; what remains is three AWS steps that a permission
classifier stopped me from running.

**Nothing here is an AWS permissions problem.** The account is root-level and
every call that ran, worked.

---

## Current state

| Thing | Value |
|---|---|
| Repo | `/home/divyansh-rawat/Quadis` |
| Branch | `change-order-3-client-july-27`, HEAD `a298647`, tree clean |
| AWS account | `093650262440`, region `us-east-1` |
| EB application | `quadis-backend` |
| EB environment | `quadis-backend-live` — Ready / Green, **running 24 Jul code** |
| EB endpoint | `http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com` (**HTTP only — HTTPS fails**) |
| Staged version | `co3-a298647` — created, **not yet deployed** |
| Bundle | `s3://elasticbeanstalk-us-east-1-093650262440/co3-a298647.zip` |
| RDS | `quadis-db-live` — postgres, db.t3.micro, available, 20 GB |
| RDS endpoint | `quadis-db-live.cwxeoayeggjy.us-east-1.rds.amazonaws.com:5432`, master user `quadis`, no explicit DBName (use `postgres`) |
| Frontend bucket | `quadis-hotels-test-co3` |
| Frontend URL | `http://quadis-hotels-test-co3.s3-website-us-east-1.amazonaws.com` |

The frontend is already deployed and working, but built **without**
`VITE_API_URL` — deliberately, because the live backend still serves the old
1,599 prices and would have overwritten the correct rate-sheet figures. Step 3
fixes that.

---

## Step 1 — deploy the backend

The version is staged. This makes it live and sets the two secrets the
environment is missing. Without `SESSION_SECRET`, login and registration return
503 by design; without `ADMIN_PASSWORD`, admin routes do the same.

```bash
SS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
AP=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")
echo "SAVE THIS -> ADMIN_PASSWORD=$AP"

aws elasticbeanstalk update-environment \
  --environment-name quadis-backend-live \
  --version-label co3-a298647 \
  --option-settings \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=SESSION_SECRET,Value=$SS" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=ADMIN_PASSWORD,Value=$AP"
```

Wait for Ready, then verify the **new rates** are being served — this is the
check that proves the new code is actually live:

```bash
aws elasticbeanstalk describe-environments --environment-names quadis-backend-live \
  --query 'Environments[0].[Status,Health,VersionLabel]' --output text

curl -s http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com/api/properties \
  | head -c 400
```

Expect `base_price` of **1500** for `hotel-quadis-sector-51-noida`. If you still
see **1599**, the old version is running and the deploy did not take.

---

## Step 2 — connect the database

Today the backend runs in-memory: every booking, enquiry and guest account is
lost on each restart or redeploy.

**The master password is unknown.** It is not in Secrets Manager, not in SSM,
not in the EB environment. AWS cannot reveal it. Nothing has ever connected to
this instance (`DATABASE_URL` has never been set), so there is no data to lose
and resetting is safe.

```bash
DBPASS=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")
echo "SAVE THIS -> DB password: $DBPASS"

aws rds modify-db-instance --db-instance-identifier quadis-db-live \
  --master-user-password "$DBPASS" --apply-immediately

# wait for Status back to 'available' before the next command
aws rds describe-db-instances --db-instance-identifier quadis-db-live \
  --query 'DBInstances[0].DBInstanceStatus' --output text

aws elasticbeanstalk update-environment --environment-name quadis-backend-live \
  --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=DATABASE_URL,Value=postgresql://quadis:$DBPASS@quadis-db-live.cwxeoayeggjy.us-east-1.rds.amazonaws.com:5432/postgres"
```

On boot the backend applies `schema.sql` and then runs `seedPostgres`, which
inserts 9 properties and 20 room types. It is idempotent —
`INSERT ... ON CONFLICT DO NOTHING` — so it never overwrites later admin edits.
Watch for `🌱 Seeded 9 properties and 20 room types.` in the EB logs.

If the password contains characters that are unsafe in a URL, percent-encode it.
`base64url` output avoids this, which is why it is used above.

---

## Step 3 — connect the frontend to the backend

Two env vars, one on each side. Miss either and the site silently fails.

**3a. Allow the S3 origin through CORS.** `NODE_ENV=production` on the
environment, so the localhost dev-origin exemption does not apply, and
`CORS_ORIGIN` is currently unset — which means `allowedOrigins` is empty and
**every browser call from the S3 site is rejected**. `curl` will still work,
which makes this easy to misdiagnose.

```bash
aws elasticbeanstalk update-environment --environment-name quadis-backend-live \
  --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=CORS_ORIGIN,Value=http://quadis-hotels-test-co3.s3-website-us-east-1.amazonaws.com"
```

**3b. Rebuild the frontend against the API and re-upload.** Note the URL ends in
`/api` — `getApiUrl()` appends the endpoint path to it.

```bash
cd /home/divyansh-rawat/Quadis
VITE_API_URL=http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com/api \
  npm run build

# A test bucket must never be indexed — it would compete with quadishotels.com.
printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
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

Verify in a browser, not with curl — CORS only fails in a browser. Open the site,
check the console is free of CORS errors, and confirm a hotel page shows a price
sourced from the API.

---

## Gotchas that will waste your time

- **The backend is HTTP-only.** The S3 website endpoint is also HTTP, so they
  talk fine. The moment anything puts HTTPS in front of the frontend
  (CloudFront, a custom domain), the browser blocks the HTTP API call as mixed
  content. Fixing that means an ALB with ACM, or CloudFront proxying `/api`.
- **Deep links return HTTP 404.** S3 serves `index.html` via `ErrorDocument` but
  keeps the 404 status. The page renders; a crawler sees 404. CloudFront is what
  rewrites this to 200.
- **Never upload `client-assets/`.** It holds the client's GoDaddy and Razorpay
  logins in plaintext. It is gitignored and must never reach a bucket. The
  `aws s3 sync` above only ever reads `dist/`.
- **Do not commit any generated secret.** Keep them in the EB environment.
- **Payload is 558 MB / 412 objects**, with single PNGs up to 3.45 MB. Fine for
  a test, not acceptable for production — see `docs/image-pipeline-plan.md`.

---

## Security findings, not blockers

- RDS `quadis-db-live` is `PubliclyAccessible: true` with `5432` open to
  `0.0.0.0/0`. A TCP connection from a laptop succeeds. The only thing guarding
  guest names, phone numbers and booking records is the password. Before
  production, restrict the security group to the Beanstalk group. Ports 80 and
  3001 are also open to the world on the same group.
- Three stale `quadis-hotels-frontend-*` buckets from 25–26 July are still
  present, two publicly readable. Deleting them was not mine to decide.

---

## Explicitly not in scope

Do not touch DNS. `quadishotels.com` still points at the client's existing host,
and its nameservers are at theserverindia, not GoDaddy — moving them without
recreating the Google MX records takes the client's email down. See
`docs/dns-cutover.md`. This deployment is a test bucket only.
