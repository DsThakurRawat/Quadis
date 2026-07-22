# AWS Production Live Endpoints & Central API Connectivity

### Summary of Changes
This Pull Request finalizes the AWS full-stack deployment and resolves the cross-origin API connection issue when running on Amazon S3 static hosting.

#### 1. Central API Configuration (`src/config/api.ts`)
- Created `getApiUrl()` helper that dynamically targets:
  - `http://localhost:3001` during local development (`localhost:5173`)
  - `http://quadis-backend-live.eba-ekdyt4m3.us-east-1.elasticbeanstalk.com` in production on Amazon S3 (`s3-website-us-east-1.amazonaws.com`).
- Refactored `QuadisAssistChat.tsx`, `CheckoutModal.tsx`, `AdminDashboard.tsx`, `Corporate.tsx`, `Contact.tsx`, and `BanquetDetail.tsx` to use `getApiUrl()` uniformly.

#### 2. Live AWS Production Infrastructure
- **Frontend SPA (`Vite`)**: Deployed & live on Amazon S3 Static Website Hosting (`s3://quadis-hotels-frontend-1784733246`).
- **Backend API & AI (`Node.js 20`)**: Deployed & live on AWS Elastic Beanstalk (`quadis-backend-live` environment).
- **Database Engine (`PostgreSQL`)**: Deployed & live on Amazon RDS (`quadis-db-live.cwxeoayeggjy.us-east-1.rds.amazonaws.com:5432`).
- **Multi-Cloud CLI Readiness**: Verified installation and readiness for **AWS CLI (`aws`)**, **Google Cloud CLI (`gcloud`)**, and **Microsoft Azure CLI (`az`)**.

### Verification
- Tested `/api/ai/chat` live against the Elastic Beanstalk server from external POST requests (`Status: healthy`).
- Compiled frontend `dist/` bundle (`466 MB`) and verified successful synchronization with `aws s3 sync --delete`.
