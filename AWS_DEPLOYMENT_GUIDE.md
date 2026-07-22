# Quadis Hotels Platform — Complete AWS Deployment Guide

You asked to deploy Quadis Hotels on AWS no matter how hard it is. We have prepared and bundled all required AWS deployment configurations locally inside your codebase (`Dockerfile`, `Procfile`, `.ebextensions/`, `ecosystem.config.js`, and `aws-deploy.sh`).

## ⚠️ Why the CLI Script Failed Earlier
When we attempted to automatically provision Amazon RDS (`aws ec2 describe-vpcs`) and Amazon S3 (`aws s3 ls`) via your terminal, AWS returned:
> `AccessDenied / UnauthorizedOperation: User arn:aws:iam::093650262440:user/testingpr1248 is not authorized to perform ec2:DescribeVpcs and s3:ListAllMyBuckets`

This means the AWS Access Key you currently have configured in your terminal (`testingpr1248`) is a **restricted/testing IAM user** and does not have administrative permissions to create VPCs, Databases, Beanstalk servers, or S3 buckets.

---

## 🚀 How to Deploy Right Now (Two Options)

### Option 1: Grant IAM Permissions and Run `aws-deploy.sh` (Automated)
If you have access to the AWS root account or an admin account:
1. Log into the [AWS IAM Console](https://console.aws.amazon.com/iam/).
2. Find the user `testingpr1248`.
3. Click **Add permissions** → **Attach policies directly** → attach **`AdministratorAccess`**.
4. Come back to your terminal inside the `Quadis` directory and run:
   ```bash
   ./aws-deploy.sh
   ```

---

### Option 2: Step-by-Step AWS Web Console Deployment (Manual)
If you prefer deploying via the AWS Console directly using your browser:

#### 1. Database (Amazon RDS)
1. Go to **Amazon RDS** in the AWS Console (`us-east-1`).
2. Click **Create database** → **PostgreSQL** (Free Tier template).
3. Set DB instance identifier: `quadis-db`, Master username: `quadis`, Master password: `YourSecurePassword123`.
4. Under Connectivity, ensure **Publicly accessible** is set to `Yes` (or accessible within your Beanstalk VPC) and allow inbound TCP port `5432` from anywhere (`0.0.0.0/0`) in its Security Group.
5. Copy the **Endpoint URL** once created. Your `DATABASE_URL` will be:
   `postgresql://quadis:YourSecurePassword123@quadis-db.xyz.us-east-1.rds.amazonaws.com:5432/quadis`

#### 2. Backend API + AI Agent (AWS Elastic Beanstalk or App Runner)
We have prepared both **Elastic Beanstalk (`Procfile`, `.ebextensions/`)** and **Docker (`Dockerfile`)** bundles.

**Deploy via Elastic Beanstalk:**
1. Go to **Elastic Beanstalk** → **Create Application**.
2. Application Name: `quadis-backend`.
3. Platform: **Node.js 20 running on 64bit Amazon Linux 2023**.
4. Application code: Select **Upload your code**. Zip your `backend/` folder (including `Procfile`, `Dockerfile`, `.ebextensions/`, `package.json`, `src/`, `tsconfig.json`) and upload it.
5. In **Configuration → Environment properties**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `DATABASE_URL` = `postgresql://quadis:...@...rds.amazonaws.com:5432/quadis`
   - `GROQ_API_KEY` = `gsk_YOUR_GROQ_API_KEY_HERE`
   - `RAZORPAY_KEY_ID` = `rzp_test_simulated`
   - `RAZORPAY_KEY_SECRET` = `secret_simulated`
   - `ADMIN_PIN` = `998877`
6. Click **Create environment**. Beanstalk will automatically install dependencies (`npm ci`), run `npm run build`, and start the app with Nginx reverse proxy.

#### 3. Frontend Website (Amazon S3 + CloudFront CDN)
1. In your local terminal, build the production frontend:
   ```bash
   npm run build
   ```
   This generates the `dist/` folder.
2. Go to **Amazon S3** → **Create bucket** (`quadis-hotels-live-2026`). Uncheck *Block all public access*.
3. Go to **Properties** → enable **Static website hosting** (Index document: `index.html`, Error document: `index.html`).
4. Go to **Permissions → Bucket policy** and add:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::quadis-hotels-live-2026/*"
       }
     ]
   }
   ```
5. Upload all files from your local `dist/` folder directly into the S3 bucket.
6. (Optional for HTTPS & Caching) Go to **CloudFront** → **Create Distribution**, select your S3 bucket website endpoint as the origin, and create.

---

## ✅ Summary of Prepared Files in Your Codebase
- `backend/Dockerfile` — Multi-stage production container for AWS App Runner, ECS, or EC2.
- `backend/Procfile` — Instructions for AWS Elastic Beanstalk (`npm start`).
- `backend/.ebextensions/01_env.config` — Elastic Beanstalk Nginx proxy and environment configs.
- `backend/ecosystem.config.js` — PM2 configuration for raw Linux EC2 deployments.
- `aws-deploy.sh` — Automated bash script for AWS CLI verification and S3 syncing.
