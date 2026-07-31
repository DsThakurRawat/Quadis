#!/usr/bin/env bash
#
# Ship the artifact to the box and run the installer.
#
#   ./deploy/build-artifact.sh && ./deploy/push.sh
#
# There is no scp here and there cannot be: the security group
# (sg-0b19531290e391e17) opens 80 and 443 only, no port 22. The artifact goes
# up to S3, and SSM tells the instance to pull and install it. The instance
# role quadis-app-ec2 can read that bucket; nothing on the internet can.
#
# This script does NOT touch DNS. quadishotels.com still resolves to the old
# host until someone changes the A record in the theserverindia panel — see
# AGENTS.md rule 2. Deploying here is safe and reversible for exactly that
# reason: nobody is looking at this box yet.

set -euo pipefail

cd "$(dirname "$0")/.."
PROFILE="${AWS_PROFILE_QUADIS:-quadis-client}"
REGION="ap-south-1"
INSTANCE="i-0d126c49ffdfe1668"
BUCKET="quadis-hotel-photos"

ART="$(ls -t dist-artifact/quadis-*.tar.gz 2>/dev/null | head -1)"
[ -n "$ART" ] || { echo "No artifact. Run ./deploy/build-artifact.sh first." >&2; exit 1; }
KEY="deploys/$(basename "$ART")"

echo "==> Uploading $(basename "$ART") ($(du -h "$ART" | cut -f1))"
aws s3 cp "$ART" "s3://$BUCKET/$KEY" --profile "$PROFILE" --region "$REGION" --only-show-errors

echo "==> Instructing $INSTANCE to install"
CMD=$(aws ssm send-command \
  --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --comment "quadis deploy $(basename "$ART")" \
  --parameters "commands=[
    'set -euo pipefail',
    'rm -rf /tmp/quadis-deploy && mkdir -p /tmp/quadis-deploy',
    'aws s3 cp s3://$BUCKET/$KEY /tmp/quadis-deploy/a.tar.gz --region $REGION',
    'tar -xzf /tmp/quadis-deploy/a.tar.gz -C /tmp/quadis-deploy',
    'chmod +x /tmp/quadis-deploy/install.sh',
    'bash /tmp/quadis-deploy/install.sh',
    'rm -rf /tmp/quadis-deploy'
  ]" \
  --query 'Command.CommandId' --output text)

echo "    command $CMD"
for i in $(seq 1 60); do
  ST=$(aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
        --command-id "$CMD" --instance-id "$INSTANCE" \
        --query 'Status' --output text 2>/dev/null || echo Pending)
  case "$ST" in
    Success) break ;;
    Failed|Cancelled|TimedOut) break ;;
  esac
  sleep 5
done

echo "==> $ST"
aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
  --command-id "$CMD" --instance-id "$INSTANCE" \
  --query 'StandardOutputContent' --output text 2>/dev/null || true

if [ "$ST" != "Success" ]; then
  echo "--- stderr ---" >&2
  aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
    --command-id "$CMD" --instance-id "$INSTANCE" \
    --query 'StandardErrorContent' --output text >&2 2>/dev/null || true
  exit 1
fi

echo
echo "==> Public check on the Elastic IP (NOT the client domain)"
curl -fsS -m 8 "http://13.234.85.127/healthz" && echo "    healthz ok"
echo "    site:      http://13.234.85.127/"
echo "    a redirect: curl -sI http://13.234.85.127/hotel-amar-inn/deluxe-room | head -2"
