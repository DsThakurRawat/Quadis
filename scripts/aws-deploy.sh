#!/usr/bin/env bash
# ==============================================================================
# Quadis Hotels Platform — Automated AWS Deployment Script
# ==============================================================================
set -e

echo "=== Quadis AWS Deployment verification ==="
echo "Checking AWS IAM identity and permissions..."

IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || echo "ERROR")
if [ "$IDENTITY" = "ERROR" ]; then
  echo "❌ Error: AWS CLI is not authenticated or unable to reach AWS STS."
  echo "Run: aws configure"
  exit 1
fi

USER_ARN=$(echo "$IDENTITY" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
echo "✅ Authenticated as: $USER_ARN"

# Test EC2 / VPC read permission
echo "Testing VPC & Security Group access..."
if ! aws ec2 describe-vpcs --max-items 1 >/dev/null 2>&1; then
  echo "❌ AccessDenied: Your IAM user ($USER_ARN) does not have permission for EC2/VPC operations (ec2:DescribeVpcs)."
  echo "To automate deployment via CLI, please attach the 'AdministratorAccess' or 'PowerUserAccess' managed policy to your IAM user in the AWS Console."
  exit 1
fi

# Test S3 read permission
echo "Testing S3 access..."
if ! aws s3 ls >/dev/null 2>&1; then
  echo "❌ AccessDenied: Your IAM user does not have permission for S3 operations (s3:ListAllMyBuckets)."
  echo "Please attach S3 permissions or AdministratorAccess."
  exit 1
fi

echo "✅ All IAM permissions verified! Proceeding with infrastructure creation..."

# 1. Create S3 Bucket for Frontend
BUCKET_NAME="quadis-hotels-frontend-$(date +%s)"
echo "Creating S3 Bucket: $BUCKET_NAME in us-east-1..."
aws s3 mb "s3://$BUCKET_NAME" --region us-east-1

# 2. Build and sync Frontend
echo "Building Frontend bundle..."
npm run build
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete

echo "✅ Frontend deployed to S3 ($BUCKET_NAME). Configure CloudFront or Static Website Hosting next."
