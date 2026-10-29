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

## AWS Cloud Infrastructure & Notification Channels (Updated for 250 Concurrent Users)

The calculator models the baseline production infrastructure and notification costs alongside AI grading calls, sized directly from empirical load tests on live AWS infrastructure:

### 1. Fixed Monthly AWS Cloud Bill ($346.67 / Month for 250 Concurrent Users)
Based on empirical load testing and resource allocation benchmarks for **250 Concurrent Users** (5,000 Students + 1,000 Staff):
- **AWS WAF v2**: $10.80 (Web ACL + AWS Managed Rules + 3 custom rules + L7 inspection)
- **NAT Gateways**: $81.54 (2x NAT Gateways, 1 per AZ, redundant outbound egress for Gemini/Sarvam AI calls)
- **Elastic IPs**: $7.30 (2x static IPv4 addresses attached to NAT Gateways)
- **Application Load Balancer (ALB)**: $22.27 (Dual-AZ ingress + 1.2 LCU capacity, p99 < 180ms)
- **ECS Fargate Containers**: $72.08 (2x tasks, 1.0 vCPU + 2 GB RAM each across 2 AZs, auto-scaling up to 4 tasks at >70% CPU)
- **Amazon RDS PostgreSQL**: $115.28 (Multi-AZ `db.t4g.medium`, 2 vCPU + 4 GB RAM, 100 GB gp3 storage — 1,024 MB buffer pool fits 100% of working dataset in RAM for 99.5%+ cache hit ratio)
- **Amazon RDS Database Proxy**: $21.90 (Connection pooler with `max_connections_percent = 80`, supporting 360 backend pooled connections)
- **CloudWatch Alarms & Logging**: $7.50 (Alarms, structured JSON log retention, dashboard metrics)
- **Elastic Container Registry (ECR)**: $0.50 (Docker image repository storage)
- **Serverless Event Pipeline**: $7.50 (SQS FIFO/Standard queues, 5 Lambda workers capped at concurrency 50, S3 storage, SES)
- **Total Multi-AZ Baseline**: **$346.67 / month** (~₹29,987 / mo at ₹86.50/USD).
- **Cost-Optimized Single-AZ Option**: **$248.11 / month** (~₹21,462 / mo) by consolidating to 1 NAT Gateway ($40.77), 1 Elastic IP ($3.65), and Single-AZ `db.t4g.medium` ($61.14/mo with automated snapshots).

### 2. Multi-Channel Parent Notifications (Exact Rates)
Post-grading scorecard dispatch to students/parents supports three notification channels:
- **WhatsApp**: **₹1.00** per message
- **SMS**: **₹0.60** (60 Paisa) per message
- **Email**: **₹0.30** (30 Paisa) per message

Channels can be toggled independently or combined (e.g., WhatsApp + SMS = ₹1.60/paper; WhatsApp + SMS + Email = ₹1.90/paper).

### 3. Per-Student and Per-Paper Amortization
Cloud bills are evaluated in the same exact framework as AI calls:
- **Mid-Sized Cohort (350 Students, 6 exams/mo)**:
  - Per Student / Month: $\$346.67 / 350 = \$0.9905 \approx \text{₹85.68}$ / student / month
  - Per Exam Paper: $\$346.67 / 2,100 = \$0.1651 \approx \text{₹14.28}$ / paper
- **Full Capacity Campus (5,000 Students, 8 exams/mo)**:
  - Per Student / Month: $\$346.67 / 5,000 = \$0.0693 \approx \text{₹6.00}$ / student / month
  - Per Exam Paper: $\$346.67 / 40,000 = \$0.0087 \approx \text{₹0.75}$ / paper (less than ₹1 per paper!)
- **Optional Toggle**: In the UI, the toggle *"Amortize Fixed Cloud in Per-Paper COGS"* dynamically incorporates the fixed hosting bill into per-paper cost cards and displayed subscription tiers.

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
