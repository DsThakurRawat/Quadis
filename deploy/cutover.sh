#!/usr/bin/env bash
#
# Run this the moment the A record points at us. Not before.
#
#   ./deploy/cutover.sh --check     read-only; safe any time, changes nothing
#   ./deploy/cutover.sh             issues the certificate and turns on HTTPS
#
# WHAT IT DOES NOT DO: touch DNS. The A record change happens in the
# theserverindia panel, by the client or by their support — AGENTS.md rule 2.
# This script only reacts to that change having already happened.
#
# ORDER MATTERS AND IT IS NOT OBVIOUS:
#   1. DNS must already resolve quadishotels.com -> 13.234.85.127. Let's Encrypt
#      validates over HTTP-01 by fetching a token from the domain. If the domain
#      still points at the old host, the old host answers, validation fails, and
#      certbot rate-limits you after five failures per hour.
#   2. CORS_ORIGIN must be set BEFORE the frontend is talking to the API on the
#      real hostname, or every browser call is blocked by CORS while the site
#      itself looks perfect.
#   3. HTTPS last. Her current site is HTTPS; every minute the new one is
#      HTTP-only is a browser warning on her live domain.

set -euo pipefail

cd "$(dirname "$0")/.."
PROFILE="${AWS_PROFILE_QUADIS:-quadis-client}"
REGION="ap-south-1"
INSTANCE="i-0d126c49ffdfe1668"
EIP="13.234.85.127"
DOMAIN="quadishotels.com"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

fail=0
say() { printf "  %-46s %s\n" "$1" "$2"; }

echo "==> Pre-flight"

# --- 1. does DNS point at us yet -----------------------------------------
APEX="$(dig +short A "$DOMAIN" | tail -1)"
if [ "$APEX" = "$EIP" ]; then
  say "apex A -> $EIP" "OK"
else
  say "apex A" "NOT YET ($APEX) — DNS has not moved"
  fail=1
fi

# --- 2. the records that must NOT have changed ---------------------------
# If a zone rebuild went wrong, this is where it shows. DMARC is p=quarantine,
# so broken mail auth does not bounce — it silently goes to spam. Check it
# every single time, not just on the day of the rebuild.
MX="$(dig +short MX "$DOMAIN" | tr -d ' ' | tr 'A-Z' 'a-z')"
case "$MX" in
  *smtp.google.com*) say "MX still Google" "OK" ;;
  *)                 say "MX" "CHANGED ($MX) — STOP, her email is at risk"; fail=1 ;;
esac

DKIM_LEN="$(dig +short TXT default._domainkey."$DOMAIN" | tr -d '"' | wc -c)"
if [ "$DKIM_LEN" -gt 300 ]; then
  say "DKIM default selector present" "OK (${DKIM_LEN}b)"
else
  say "DKIM" "MISSING/SHORT (${DKIM_LEN}b) — mail will go to spam silently"; fail=1
fi

dig +short TXT _dmarc."$DOMAIN" | grep -q "p=quarantine" \
  && say "DMARC intact" "OK" \
  || { say "DMARC" "MISSING"; fail=1; }

for sub in adminweb blog webmail mail booking api; do
  ip="$(dig +short A "$sub.$DOMAIN" | tail -1)"
  if [ "$ip" = "115.124.108.190" ]; then
    say "$sub still on old host" "OK"
  else
    say "$sub" "MOVED ($ip) — she still uses this"; fail=1
  fi
done

# --- 3. is the box actually serving --------------------------------------
code() { curl -s -o /dev/null -w '%{http_code}' -m 8 "$1" 2>/dev/null || echo 000; }
[ "$(code http://$EIP/)"            = "200" ] && say "box serves /"        "OK" || { say "box /" "FAIL"; fail=1; }
[ "$(code http://$EIP/api/health)"  = "200" ] && say "box serves /api"     "OK" || { say "box /api" "FAIL"; fail=1; }
[ "$(code http://$EIP/hotel-amar-inn/deluxe-room)" = "301" ] \
  && say "legacy 301s live" "OK" || { say "legacy 301s" "FAIL"; fail=1; }
for leak in /.env /docs/client-comms/README.md /.agents/AGENTS.md; do
  [ "$(code http://$EIP$leak)" = "404" ] || { say "LEAK $leak" "SERVED — STOP"; fail=1; }
done
say "private paths denied" "OK"

# --- 3b. can Let's Encrypt actually reach the challenge path? -------------
# This is the check that would have caught the cutover-day failure, and it
# works BEFORE DNS moves because the hostname is supplied by a Host header
# rather than by resolution. Both historic failures returned 404 — the apex
# 301'd to a closed port 443, and www hit the `location ~ /\.` deny rule — so
# this asserts a known BODY, not a status code. install.sh writes the canary.
ping_as() { curl -s -m 8 -H "Host: $1" \
  "http://$EIP/.well-known/acme-challenge/ping" 2>/dev/null | tr -d '[:space:]'; }
for h in "$DOMAIN" "www.$DOMAIN"; do
  if [ "$(ping_as "$h")" = "acme-ok" ]; then
    say "acme challenge reachable on $h" "OK"
  else
    say "acme challenge on $h" "BLOCKED — certbot WILL fail; do not cut over"
    fail=1
  fi
done

echo
if [ "$fail" -ne 0 ]; then
  echo "==> NOT READY. Fix the above before cutting over." >&2
  [ "$CHECK_ONLY" -eq 1 ] && exit 0
  exit 1
fi
echo "==> Pre-flight clean."
[ "$CHECK_ONLY" -eq 1 ] && { echo "    (--check: stopping here, nothing changed)"; exit 0; }

# --- 4. CORS before HTTPS -------------------------------------------------
echo "==> Setting CORS_ORIGIN"
aws ssm put-parameter --name /quadis/cors-origin --type String \
  --value "https://www.$DOMAIN" --overwrite \
  --profile "$PROFILE" --region "$REGION" >/dev/null
echo "    https://www.$DOMAIN"

# --- 5. certificate -------------------------------------------------------
# AUTHENTICATOR IS `webroot`, NOT `--nginx`, AND THAT IS DELIBERATE.
#
# `--nginx` asks certbot to rewrite quadis.conf on the fly to serve the
# challenge. It cannot win there: the apex->www redirect is a server-level
# `if`, which nginx evaluates BEFORE it selects any location, so whatever
# certbot inserts is pre-empted and the apex 301s instead of answering. The
# webroot authenticator only drops a file on disk; nginx serves it from the
# `location ^~ /.well-known/acme-challenge/` block in quadis.conf, which is
# checked in pre-flight above. `-i nginx` still installs the cert and adds
# the 443 blocks — only the challenge half changed.
echo "==> Issuing certificate (this is the irreversible-ish step; rate limits apply)"
CMD=$(aws ssm send-command --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE" --document-name "AWS-RunShellScript" \
  --comment "quadis cutover: certbot + restart" \
  --parameters "commands=[
    'set -e',
    'mkdir -p /var/www/certbot/.well-known/acme-challenge',
    'certbot run -a webroot -w /var/www/certbot -i nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect',
    'systemctl reload nginx',
    'bash /tmp/quadis-deploy/install.sh 2>/dev/null || true',
    'systemctl restart quadis-api',
    'sleep 4',
    'curl -fsS -m 5 http://127.0.0.1:3001/api/health >/dev/null && echo API-OK'
  ]" --query 'Command.CommandId' --output text)

for i in $(seq 1 60); do
  ST=$(aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
       --command-id "$CMD" --instance-id "$INSTANCE" --query 'Status' --output text 2>/dev/null || echo Pending)
  case "$ST" in Success|Failed|Cancelled|TimedOut) break ;; esac
  sleep 5
done
echo "    $ST"
aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
  --command-id "$CMD" --instance-id "$INSTANCE" --query 'StandardOutputContent' --output text | tail -5

# --- 6. prove it ----------------------------------------------------------
echo
echo "==> Post-cutover verification"
say "https://www.$DOMAIN"        "$(code https://www.$DOMAIN/)"
say "apex redirects to www"      "$(curl -sI -m 8 http://$DOMAIN/ | grep -i '^location:' | tr -d '\r' | cut -d' ' -f2- || echo NONE)"
say "https api"                  "$(code https://www.$DOMAIN/api/health)"
say "a legacy 301"               "$(curl -sI -m 8 https://www.$DOMAIN/hotel-amar-inn/deluxe-room | head -1 | tr -d '\r')"
echo
echo "==> Mail unchanged (re-checked after cutover):"
dig +short MX "$DOMAIN"

# Payments do not come back on their own — two dashboard changes, neither of
# which this script can make or detect. See docs/razorpay-golive.md.
cat <<'RZP'

==> RAZORPAY — two manual steps, nothing below is automatic
    1. Webhook URL is still the dead CloudFront endpoint. Change it to
         https://www.quadishotels.com/api/webhooks/razorpay
       Until then a guest can pay and the booking NEVER confirms.
    2. Merchant account (Feb '26) and website approval were both confirmed on
       31 Jul, so this should now just work — the earlier "website was not
       listed" was the bare-IP origin, not a missing approval. If it still
       fails, check the approved entry covers www. and not only the apex.
    Then: one real booking, paid by UPI on a phone, and refund it.
RZP
echo "==> Done. Tell the client only after the lines above are green."
