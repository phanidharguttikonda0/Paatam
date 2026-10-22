# Paatam Backend — Production Readiness & Deployment Runbook

This document details the exact configuration steps, verification procedures, and operational roadmap for the remaining integration and infrastructure tasks.

---

## 📌 Executive Summary of Current Architecture

1. **Multi-Tenant Hierarchy & RBAC**:
   - Strict hierarchical tenancy: `Corporate` $\rightarrow$ `Branch` $\rightarrow$ `Class` $\rightarrow$ `Section` $\rightarrow$ `ClassSubject` / `TeacherSubject`.
   - Role-Based Access Control enforced at middleware layer for `SUPER_ADMIN`, `CORPORATE_ADMIN`, `BRANCH_ADMIN`, `TEACHER`, and `STUDENT`.
2. **AI Engine & RAG Integration**:
   - Integrated Mohit's core SmartStudy AI logic: Indic OCR (Sarvam AI), LLM evaluation & reasoning (Google Gemini), question paper generation, single question regeneration, and technical diagram generation.
   - Native PostgreSQL 16 vector embeddings (`pgvector`) with HNSW cosine similarity index (`1 - (embedding <=> $1::vector)`).
   - 35-student bulk scanned answer sheet stack ingestion with automated boundary splitting.
3. **AWS Cloud & Serverless Infrastructure**:
   - **Compute**: ECS Fargate container service behind an AWS Application Load Balancer (ALB).
   - **Message Queues**: 4 Amazon SQS queues with 15-minute visibility timeouts and 4 dedicated Dead Letter Queues (DLQs) with 14-day retention.
   - **Serverless Workers**: 5 AWS Lambda functions (`assignment-ocr`, `bulk-split`, `paper-ocr`, `paper-evaluation`, `sweeper`).
   - **Self-Healing Cron**: Amazon EventBridge rule invoking `sweeper` Lambda every 15 minutes to rescue stalled submissions.
   - **Internal VPC Endpoint**: Amazon S3 Gateway VPC Endpoint (`vpce-0f456e659ae22c06f`) eliminating NAT Gateway data transfer fees and routing all S3 traffic privately with minimal latency.
4. **CI/CD Automation**:
   - GitHub Actions pipeline runs linting, typechecking, documentation generation, and the full 230-test Vitest test suite against an isolated PostgreSQL `pgvector` container.
   - Merges into `main` automatically trigger production Docker image builds, pushes to Amazon ECR, and zero-downtime rolling updates to ECS.

---

## ✅ Step 1: AI API Keys in AWS Secrets Manager (COMPLETED)

All application secrets and AI provider credentials are consolidated inside `paatam/db/credentials-dev` in `ap-south-2` and automatically injected into ECS Fargate containers and Lambda workers.

### Configured Secret Keys:
* `DATABASE_URL`: Managed connection pooling via RDS Proxy.
* `JWT_SECRET`: Custom HMAC production signature secret.
* `GEMINI_API_KEY`: Google Gemini API key for question generation & paper evaluation.
* `SARVAM_API_KEY`: Sarvam AI subscription key for Indic handwriting OCR.

---

## ✅ Step 3: AWS SES Domain Verification & Email Setup (COMPLETED)

Domain ownership and DKIM tokens for `paatam.in` are configured in Hostinger and verified by Amazon SES.

### Verified Hostinger DNS Records:
1. `yvkvhja4eudqdrlsn2gfe7xqxed3fjos._domainkey` ➔ `yvkvhja4eudqdrlsn2gfe7xqxed3fjos.dkim.amazonses.com`
2. `3lk6dpbvkoeih4zs7dxbi4g3uasmnttd._domainkey` ➔ `3lk6dpbvkoeih4zs7dxbi4g3uasmnttd.dkim.amazonses.com`
3. `jiuf6oighq24cy2v2z2qz7n4bur3azga._domainkey` ➔ `jiuf6oighq24cy2v2z2qz7n4bur3azga.dkim.amazonses.com`
4. `_amazonses` (TXT) ➔ `9Ew5jKHYS6JjCt5KGu8n1uVzEcyMPm2O+h/xbZybER8=`

---

## ✅ Step 4: Custom Domain & HTTPS / SSL Certificate (COMPLETED)

`api.paatam.in` is fully secured with an Amazon-issued TLS 1.3 SSL certificate and connected to the Application Load Balancer.

### Verification Details:
* **Certificate ARN**: `arn:aws:acm:ap-south-2:473671718844:certificate/68a811a3-f05c-4be0-827c-daf444089990` (Status: **ISSUED**)
* **Port 443 HTTPS Listener**: Active in `terraform/alb.tf` with `ELBSecurityPolicy-TLS13-1-2-2021-06`.
* **Port 80 HTTP Listener**: Active in `terraform/alb.tf` forwarding requests.
* **Live Endpoints**:
  * `https://api.paatam.in/health` ➔ `{"status":"ok"}`
  * `https://api.paatam.in/docs` ➔ HTTP 200 OK (Interactive API Reference)

---

## 📱 Step 5: Twilio SMS OTP Integration

For SMS OTP verification for parents and students:

### 1. Required Variables in `.env` or Secrets Manager
```env
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
DEFAULT_COUNTRY_CODE=+91
```

### 2. Verification
Test sending an SMS OTP via the auth test suite or `/api/auth/otp/send`.

---

## 📊 Step 6: Monitoring, Load Testing & Capacity Estimation

### 1. Load Estimations (35-Student Batch Concurrency)
* **Average Batch Size**: 35 students $\times$ 3 pages = 105 pages per stack.
* **Peak Exam Upload Window**: 50 sections uploading concurrently $= 1,750$ submissions enqueued within 10 minutes.
* **SQS Capacity**: Handles unlimited throughput; visibility timeout is 15 minutes to allow deep AI evaluation.
* **ECS Capacity**: Fargate task CPU / Memory autoscaling from 2 to 10 tasks based on CPU utilization $>70\%$.
* **Lambda Concurrency**: Set reserved concurrency to prevent hitting LLM rate limits.

### 2. CloudWatch Alarms
* `paatam-dlq-messages-dev`: Triggers if messages land in any DLQ (`assignment-ocr`, `bulk-split`, `paper-ocr`, `paper-evaluation`).
* `paatam-lambda-errors-dev`: Triggers if Lambda invocation error rate exceeds 5% in 5 minutes.
* `paatam-ecs-cpu-high-dev`: Triggers if container CPU exceeds 80% for 3 consecutive evaluation periods.
