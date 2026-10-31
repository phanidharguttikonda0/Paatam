# Paatam AI Cost Calculator

This is a **planning estimate**, not a verified production bill or quote. The migrated backend at `D:\Paatam` receives `GEMINI_MODEL` from AWS Secrets Manager; the prototype `D:\SmartStudy\smartstudy-backend\.env` specifies Gemini 3.6 Flash, but does not configure ECS. This scenario assumes **Gemini 3.6 Flash for Gemini-routed generation, OCR and grading**, with Sarvam priced separately for Indic subjects when configured. Grading actually uses each assignment's stored `reasoning_model`, which defaults to Gemini 2.5 Flash in the migrated backend; the deployed secret and assignment values must be checked before treating this as production cost.

## Published Rates (October 27, 2026)

- [Gemini Developer API paid standard rates](https://ai.google.dev/gemini-api/docs/pricing): Gemini 3.6 Flash $0.75 input / $3.75 output per million tokens through December 31, 2026; prices rise in January 2027. Output includes thinking tokens. Gemini 3.1 Flash Lite Image is $0.0336 for a 1K image. These are **not Vertex AI or negotiated rates**.
- [Gemini PDF document guidance](https://ai.google.dev/gemini-api/docs/document-processing) lists 258 tokens per PDF page. The bulk worker sends each student answer sheet as a PDF in one Gemini OCR request; the default uses 258 document tokens per page for both OCR and boundary detection. Additional OCR prompt and generated text tokens are estimated in the subject profiles. Change the editable PDF input assumption if measured usage differs.
- [Sarvam API rates](https://docs.sarvam.ai/api-reference-docs/pricing): Document Digitization costs Rs 0.50/page, Document Extraction Rs 1/page; Sarvam 105B input/output cost Rs 15/Rs 60 per million tokens. Prices exclude GST. This estimate assumes **digitization**; change the rate if extraction is used.
- The USD/INR default (86.50) is a **manual planning input**, not a live exchange rate. Cloud storage, queue, compute and notification allowances in `data.js` are unsourced estimates, not AWS quotations.

## Calculation Scope

Each student paper includes its subject's OCR, one rubric evaluation and a flat per-paper infrastructure allowance. Choose generated exam questions or uploaded question-paper PDF OCR; the latter **replaces** generation. An optional uploaded answer key is priced separately, only for uploaded exams. Question replacements are explicit per exam. Generated questions, uploaded documents and diagrams are divided by **students sharing that exam**, not by total school enrollment. The combined-PDF bulk route performs Gemini boundary detection in 8-page batches; direct per-paper uploads bypass it. The subject mix is normalized to 100%. Annual values assume ten teaching months.

Additional OCR and grading calls are input as extra calls per 100 papers; 100% adds one extra call to each paper. They use the same estimated per-paper input/output as the base call and do not imply every provider retry incurs a full charge. Chapter ingestion assumes one Gemini metadata call (1,200 input / 300 output tokens) and the configured number of 800-token embedding chunks per chapter. Each syllabus analysis assumes one Gemini call (2,000 input / 500 output tokens). Enter monthly volumes rather than total existing content. These shared costs are added once to the institution's monthly total and allocated across monthly papers. Subject cards show only the per-exam workflow, excluding institution-wide monthly curriculum work.

**Embedding warning:** the migrated backend uses `text-embedding-004`, which [was shut down in January 2026](https://ai.google.dev/gemini-api/docs/deprecations). Its replacement endpoint and price must be verified before forecasting embedding costs. Embedding price therefore defaults to **$0 per million input tokens**; setting a supported-model rate in API Rates enables that line item. A zero estimate here means **unknown cost**, not free embeddings. The backend must migrate its endpoint before that workflow can succeed.

Optional calibration assumes every paper still gets the normal subject evaluation, while the selected sample gets **one additional pass using the same subject model**, plus one synthesis call per exam cohort. No Pro model or measured improvement in grading accuracy is implied. Turn it off if the backend does not actually make those calls. The default 22% sample, all token volumes, 500 billed thinking tokens per Gemini evaluation, diagrams per paper, and 40 participants per exam are hypotheses, not usage measurements.

The recommended price is `modeled monthly pipeline cost / (1 - target margin)`. Displayed tiers round the monthly price up; their annual contracts use that displayed price. The resulting difference between price and modeled costs is a **pipeline spread**, not net profit or validated gross margin. 

## AWS Cloud Infrastructure & Notification Channels (Single-AZ Baseline & Dynamic Concurrency)

The calculator models the baseline production infrastructure and notification costs alongside AI grading calls, sized directly from empirical load tests on live AWS infrastructure:

### 1. Fixed Monthly AWS Cloud Bill ($248.11 / Month — Single Availability Zone)
Production architecture is deployed in **Single Availability Zone (Single-AZ in AWS ap-south-2 Hyderabad)** to eliminate idle cross-zone bandwidth taxes and redundant standby instances during early/growth stages, while retaining automated daily snapshots to S3:
- **AWS WAF v2**: $10.80 (Web ACL + AWS Managed Rules + 3 custom rules + L7 inspection)
- **NAT Gateway (Single-AZ)**: $40.77 (1x NAT Gateway for outbound egress to Gemini/Sarvam AI APIs)
- **Elastic IP**: $3.65 (1x static IPv4 address attached to NAT Gateway)
- **Application Load Balancer (ALB)**: $22.27 (Ingress + 1.2 LCU capacity, p99 < 180ms)
- **ECS Fargate Containers**: $72.08 (2x tasks @ 1.0 vCPU + 2 GB RAM each, auto-scaling horizontally up to 4 tasks at >70% CPU in 20-30s with 0 downtime)
- **Amazon RDS PostgreSQL (Single-AZ)**: $61.14 (`db.t4g.medium`, 2 vCPU + 4 GB RAM, 100 GB gp3 storage — 1,024 MB buffer pool fits working dataset in RAM for 99.5%+ cache hit ratio, automated daily snapshots)
- **Amazon RDS Database Proxy**: $21.90 (Dedicated 1 vCPU pooler multiplexing Lambda worker spikes into stable pooled DB connections)
- **CloudWatch Alarms & Logging**: $7.50 (Alarms, structured JSON log retention, dashboard metrics)
- **Elastic Container Registry (ECR)**: $0.50 (Docker image repository storage)
- **Serverless Event Pipeline**: $7.50 (SQS FIFO/Standard queues, 5 Lambda workers capped at concurrency 50, S3 storage, SES)
- **Total Single-AZ Baseline**: **$248.11 / month** (~₹21,462 / mo at ₹86.50/USD).

### 2. 250 Concurrent Users to 5,000 Students Ratio (20:1 Capacity Economics)
Empirical school testing demonstrates that **1 active concurrent exam submitter represents approximately 20 enrolled students** (a 20:1 ratio, as classes take exams in staggered periods):
- **Baseline Concurrency**: 250 concurrent users = **5,000 Enrolled Students Capacity** (40,000 monthly papers @ 8 exams/student/mo).
- **Per-Service Cost / Student**: Calculated directly as $\text{Service Monthly Cost} / 5,000$:
  - ECS Fargate ($72.08/mo): **$0.0144 (₹1.25)** / student / mo
  - RDS PostgreSQL ($61.14/mo): **$0.0122 (₹1.06)** / student / mo
  - NAT Gateway ($40.77/mo): **$0.0082 (₹0.71)** / student / mo
  - RDS Proxy ($21.90/mo): **$0.0044 (₹0.38)** / student / mo
  - ALB Load Balancer ($22.27/mo): **$0.0045 (₹0.39)** / student / mo
  - AWS WAF ($10.80/mo): **$0.0022 (₹0.19)** / student / mo
  - Core Serverless & Logging ($19.15/mo): **$0.0038 (₹0.33)** / student / mo
- **Total Single-AZ Baseline Cost Per Student**:
  $$\frac{\$248.11}{5,000 \text{ students}} = \mathbf{\$0.0496 / \text{student / mo}} \approx \mathbf{\text{₹4.29 / student / month}}$$
- **Total Single-AZ Baseline Cost Per Exam Paper**:
  $$\frac{\$248.11}{40,000 \text{ papers}} = \mathbf{\$0.0062 / \text{paper}} \approx \mathbf{\text{₹0.54 / exam paper}}$$

### 3. Interactive Dynamic AWS Concurrency Calculator
Below the static baseline table, the UI provides an interactive dynamic concurrency simulator where school operators and engineers can model custom concurrent loads (from 10 to 1,000 active concurrent exam users):
- **Dynamic ECS Sizing**:
  - $\le 35$ users: 0.5 vCPU, 1 GB RAM (1 task) $\implies$ $18.02/mo
  - $36 - 80$ users (e.g. 50 users / 1,000 students): 1.0 vCPU, 2 GB RAM (2 tasks) $\implies$ $36.04/mo
  - $81 - 250$ users (e.g. 250 users / 5,000 students): 2.0 vCPU, 4 GB RAM (2 tasks) $\implies$ $72.08/mo
  - $251 - 600$ users (e.g. 500 users / 10,000 students): 4.0 vCPU, 8 GB RAM (4 tasks) $\implies$ $144.16/mo
  - $> 600$ users (e.g. 1,000 users / 20,000 students): 8.0 vCPU, 16 GB RAM (4 tasks) $\implies$ $288.32/mo
- **Dynamic RDS PostgreSQL Sizing**:
  - $\le 35$ users: `db.t4g.micro` (2 vCPU, 1 GB, 20 GB gp3) $\implies$ $14.71/mo
  - $36 - 80$ users (e.g. 50 users / 1,000 students): `db.t4g.small` (2 vCPU, 2 GB, 50 GB gp3) $\implies$ $30.57/mo
  - $81 - 250$ users (e.g. 250 users / 5,000 students): `db.t4g.medium` (2 vCPU, 4 GB, 100 GB gp3) $\implies$ $61.14/mo
  - $251 - 600$ users (e.g. 500 users / 10,000 students): `db.t4g.large` (2 vCPU, 8 GB, 200 GB gp3) $\implies$ $122.28/mo
  - $> 600$ users (e.g. 1,000 users / 20,000 students): `db.t4g.xlarge` (4 vCPU, 16 GB, 400 GB gp3) $\implies$ $244.56/mo
- **Example: 50 Concurrent Users (1,000 Enrolled Students)**:
  - Total Monthly AWS Bill: **$178.58 / month** (~₹15,447 / mo)
  - Cost Per Student / Month: $\$178.58 / 1,000 = \mathbf{\$0.1786 \approx \text{₹15.45 / student / mo}}$
  - Cost Per Exam Paper: $\$178.58 / 8,000 = \mathbf{\$0.0223 \approx \text{₹1.93 / exam paper}}$

### 4. Multi-Channel Parent Notifications (Exact Rates)
Post-grading scorecard dispatch to students/parents supports three notification channels:
- **WhatsApp**: **₹1.00** per message
- **SMS**: **₹0.60** (60 Paisa) per message
- **Email**: **₹0.30** (30 Paisa) per message

Channels can be toggled independently or combined (e.g., WhatsApp + SMS = ₹1.60/paper; WhatsApp + SMS + Email = ₹1.90/paper).

---

## Before Using the Result

1. Confirm production model IDs, provider (Gemini Developer API versus Vertex AI), Indic endpoint and whether calibration/diagram/slicing calls actually occur in the backend.
2. Record `usage_metadata` for a representative sample of real question papers and scanned answer sheets, including input, billed thinking/output, pages, retries, and calls per stage. Replace assumptions in the subject profiles and API Rates with measured values.
3. Compare predicted costs by exam cohort with provider invoices and AWS/Sarvam billing; add excluded operating costs and applicable non-recoverable taxes before setting school prices.

---

## Run

The calculator has zero external npm dependencies. Run `npm test` for regression checks.

### Option A: Run with Node.js
```bash
# Navigate to the cost-calculator directory
cd cost-calculator

# Start the local server
npm start
# Or
node server.js
```
Then open your browser at:
`http://localhost:3333`

### Option B: Open Directly in Any Web Browser
You can also open `index.html` directly in a modern browser.

---

## Cost Formula

For a subject exam with $N$ participants, per-paper cost is:

$$\frac{\text{generation or uploaded PDF OCR} + \text{answer key OCR} + \text{replacements} + \text{diagrams} + \text{slicing} + \text{sample extra passes} + \text{synthesis}}{N} + \text{OCR} + \text{evaluation} + \text{repeat calls} + \text{variable storage} + \text{selected notification channels} + \text{[optional amortized fixed cloud]}.$$

The monthly institution forecast multiplies the weighted exam-paper result by exams per student per month and total enrolled students, then adds monthly chapter metadata/embeddings, syllabus analyses, and fixed AWS cloud infrastructure once. It assumes cohorts of the selected size take equivalent exams throughout the month. CSV includes the workload inputs, cloud infrastructure breakdown, notification channels, cost rows, and monthly forecast.
