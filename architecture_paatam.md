# Paatam Application — End-to-End Master Architecture & Technical Deep-Dive

This document provides a comprehensive, top-to-bottom technical specification of the entire **Paatam** enterprise education platform. It details the High-Level Design (HLD), infrastructure topology, asynchronous serverless worker architecture, Retrieval-Augmented Generation (RAG) vector engine, question paper generation, bulk scanning and slicing, two-stage evaluation pipeline, and frontend state synchronization mechanics.

---

## 1. High-Level Design (HLD) & Infrastructure Topology

The Paatam platform adopts a hybrid architecture designed for enterprise multi-tenancy, high-throughput synchronous REST API interactions, and asynchronous, long-running AI workloads.

```mermaid
flowchart TD
    subgraph Client_Tier["Client & Edge Tier"]
        Users["Web / Mobile Clients\n(Students, Teachers, Admins)"]
        R53["Amazon Route 53\n(DNS & SSL Termination)"]
        WAF["AWS WAF\n(Rate Limiting & OWASP Rules)"]
        ALB["Application Load Balancer (ALB)\n(Dual-AZ, HTTPS, Path-Based Routing)"]
        
        Users --> R53 --> WAF --> ALB
    end

    subgraph Synchronous_Core["Synchronous REST API Core (AWS ECS Fargate)"]
        ALB --> ECS["ECS Fargate Tasks\n(Express 5 + TypeScript REST API)"]
        ECS --> Redis["Amazon ElastiCache\n(Valkey / Redis Session & Rate Limits)"]
        ECS --> SES["Amazon SES\n(Transactional Email & OTPs)"]
        ECS --> Twilio["Twilio Gateway\n(SMS Phone OTP Verification)"]
        ECS --> Secrets["AWS Secrets Manager\n(API Keys, DB Credentials, JWT Secrets)"]
    end

    subgraph Data_Tier["Multi-Tenant Persistence Layer"]
        RDSProxy["AWS RDS Proxy\n(Connection Pooler, DDoS Shield & Multi-AZ Failover)"]
        RDS["Amazon RDS PostgreSQL 16\n(Multi-AZ, Native pgvector, Automated Backups)"]
        S3["Amazon S3 Bucket: paatam-documents\n(Direct Uploads, Question Papers, Sliced Submissions)"]
        
        ECS --> RDSProxy --> RDS
        ECS --> S3
    end

    subgraph Async_Engine["Asynchronous Serverless AI Pipeline (SQS + Lambda)"]
        ECS -- "Enqueues PDF Ingestion" --> SQS_Asgn["SQS: paatam-assignment-ocr-queue"]
        SQS_Asgn --> Lambda_Asgn["Lambda: Assignment OCR & Routing Worker\n(15-min Timeout, 1024MB Memory)"]
        Lambda_Asgn -. "3 Retries Failed" .-> DLQ_Asgn["DLQ: paatam-assignment-ocr-dlq"]
        Lambda_Asgn --> RDSProxy
        Lambda_Asgn --> S3

        ECS -- "Enqueues 35-Student Stack" --> SQS_Split["SQS: paatam-bulk-split-queue"]
        SQS_Split --> Lambda_Split["Lambda: Bulk Splitter Worker\n(Header & QR Boundary Detection)"]
        Lambda_Split -. "3 Retries Failed" .-> DLQ_Split["DLQ: paatam-bulk-split-dlq"]
        Lambda_Split --> S3
        Lambda_Split --> RDSProxy
        Lambda_Split -- "Enqueues Individual Papers" --> SQS_Ocr["SQS: paatam-paper-ocr-queue"]

        ECS -- "Direct Single Submit" --> SQS_Ocr
        SQS_Ocr --> Lambda_Ocr["Lambda: Paper OCR Handwriting Worker\n(Stage 1 Multi-Page Transcriber)"]
        Lambda_Ocr -. "3 Retries Failed" .-> DLQ_Ocr["DLQ: paatam-paper-ocr-dlq"]
        Lambda_Ocr --> S3
        Lambda_Ocr --> RDSProxy
        Lambda_Ocr -- "Enqueues Transcribed Text" --> SQS_Eval["SQS: paatam-paper-evaluation-queue"]

        SQS_Eval --> Lambda_Eval["Lambda: Paper Evaluation & Reasoning Worker\n(Stage 2 Rubric & Socratic Scoring)"]
        Lambda_Eval -. "3 Retries Failed" .-> DLQ_Eval["DLQ: paatam-paper-evaluation-dlq"]
        Lambda_Eval --> RDSProxy
    end

    subgraph Self_Healing["Self-Healing EventBridge Sweeper"]
        EB["Amazon EventBridge Cron\n(Schedule: rate(15 minutes))"]
        Lambda_Sweep["Lambda: Sweeper Worker\n(Rescues Orphaned / Stuck In-Flight Jobs)"]
        
        EB --> Lambda_Sweep --> RDSProxy
        Lambda_Sweep -- "Re-enqueues Rescued Jobs" --> SQS_Ocr
        Lambda_Sweep -- "Re-enqueues Rescued Jobs" --> SQS_Eval
    end

    subgraph External_AI["External Multimodal AI Engines"]
        Lambda_Asgn --> Gemini["Google Gemini 2.5 Flash / 1.5 Pro\n(Multimodal Vision & STEM Reasoning)"]
        Lambda_Ocr --> Sarvam["Sarvam Document AI\n(Hindi / Telugu Handwritten OCR)"]
        Lambda_Ocr --> Gemini
        Lambda_Eval --> Sarvam
        Lambda_Eval --> Gemini
        ECS --> Gemini
    end
```

### The Architectural Problem: Synchronous Bottlenecks
Traditional monolithic web apps attempt to run PDF rasterization, handwriting OCR, and LLM reasoning inside the synchronous HTTP request handler. 
1. **ALB Hard Timeout**: AWS Application Load Balancers disconnect clients after 30–60 seconds of idle connection. OCR and rubric grading for a 4-page handwritten student paper takes 15–45 seconds; grading a bulk stack of 35 students takes 10–25 minutes. Holding an open HTTP socket guarantees `504 Gateway Timeout` errors.
2. **Container Memory Exhaustion**: Rasterizing high-resolution PDFs (300 DPI) consumes 200MB–800MB of RAM per document. Running multiple concurrent uploads on an ECS web container causes out-of-memory (OOM) kernel crashes.
3. **The Solution**: Paatam uses **Amazon SQS + AWS Lambda**. The ECS web API accepts requests in `< 100ms`, issues pre-signed S3 upload URLs, records a `queued` row in PostgreSQL, and enqueues a job message. Serverless Lambda workers process jobs with 15-minute execution limits, leaving the web API responsive and lightweight.

---

## 2. Multi-Tenant Enterprise Data Model

All database operations enforce tenant isolation through foreign keys and row-level authorization.

```mermaid
erDiagram
    Corporate ||--o{ Branch : "owns"
    Branch ||--o{ AcademicYear : "manages"
    Branch ||--o{ Admin : "employs"
    AcademicYear ||--o{ Class : "defines"
    Class ||--o{ Section : "contains"
    Class ||--o{ ClassSubject : "maps curriculum"
    Section ||--o{ Student : "enrolls"
    ClassSubject ||--o{ CurriculumChapter : "indexes"
    ClassSubject ||--o{ CurriculumTopic : "structures"
    ClassSubject ||--o{ TextbookEmbedding : "vectorizes"
    Section ||--o{ Assignment : "assigns"
    Assignment ||--o{ Submission : "receives"
    Assignment ||--o{ BatchJob : "processes bulk"
    Submission ||--o{ Notification : "alerts"
```

### Isolation Guarantees
* **Corporate Admin**: Access to corporate-wide analytics and cross-branch auditing.
* **Branch Admin**: Scoped strictly to `branch_id`. Cannot inspect or mutate data from other branches.
* **Teacher**: Authorized only for assigned `Section` and `ClassSubject` combinations via `TeacherSubject`.
* **Student**: Bound strictly to their enrolled `section_id` and personal `student_id`.

---

## 3. Retrieval-Augmented Generation (RAG) & Vector Architecture

The RAG engine converts physical textbooks and syllabus documents into high-dimensional semantic search vectors in AWS RDS PostgreSQL.

```mermaid
flowchart LR
    A["Textbook Chapter PDF"] --> B["PDF Parser / OCR Extractor"]
    B --> C["AI Metadata Extraction\n(Title, Number, Subtopics, Prerequisites)"]
    B --> D["Semantic Sliding Chunking\n(700 chars, 250-char overlap)"]
    D --> E["Google Gemini Embedding Engine\n(gemini-embedding-001)"]
    E --> F["1536-Dimensional Vector Float Array"]
    F --> G[("RDS PostgreSQL: TextbookEmbedding\n(Native pgvector <=> Cosine Distance)")]
```

### Implementation Details
1. **Semantic Sliding-Window Chunking**:
   * Text is split into paragraphs at double line breaks.
   * Chunks are accumulated up to **700 characters** with a **250-character overlap**.
   * Sentence boundaries are preserved to ensure mathematical formulas and grammatical context are never sliced mid-phrase.
2. **Vector Dimension Normalization**:
   * Google Gemini embedding vectors are normalized to exactly **1536 dimensions** to match the PostgreSQL `vector(1536)` column definition.
3. **High-Performance Cosine Search**:
   * Vector similarity queries run natively using the PostgreSQL `<=>` cosine distance operator:
   ```sql
   SELECT id, content_chunk, 1 - (embedding <=> $1::vector) AS similarity
   FROM "TextbookEmbedding"
   WHERE class_subject_id = $2 AND embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector ASC
   LIMIT $3;
   ```
4. **RDS pgvector Parameter Group**:
   * AWS RDS PostgreSQL 16 natively supports `pgvector`.
   * Terraform declares `aws_db_parameter_group.main` (`family = "postgres16"`) and database migrations execute `CREATE EXTENSION IF NOT EXISTS "vector";`.

---

## 4. AI Question Paper Generation Engine

Teachers can generate board-aligned exam question papers or regenerate individual questions on demand.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher / Branch Admin
    participant API as Express API (/api/assignments/generate)
    participant RAG as RAG Service (Textbook Embedding)
    participant LLM as Google Gemini (gemini-2.5-flash)
    participant S3 as Amazon S3 (Diagram Storage)
    participant DB as PostgreSQL (Assignment)

    Teacher->>API: POST /api/assignments/generate (Chapters, Counts, Blueprint)
    API->>RAG: getChapterContext(classSubjectId, chapterTitles)
    RAG-->>API: Extracted Textbook Chunks & Subtopics
    API->>LLM: CBSE/ICSE Board Setter Prompt with Strict JSON Schema
    LLM-->>API: Structured Sections A-D, Questions, Rubric, Keys
    opt Technical Question Requires Diagram
        API->>LLM: Generate Illustration (gemini-2.5-flash-image)
        LLM-->>API: Base64 Image Buffer
        API->>S3: Upload Buffer (diagrams/diagram-17029.png)
        S3-->>API: Pre-signed / Public S3 Image URL
    end
    API-->>Teacher: 200 OK (Full Questions Array Preview)
    
    opt Teacher Replaces Question
        Teacher->>API: POST /api/assignments/regenerate-question
        API->>LLM: Cognitive Replacement Prompt (Same subtopic, Avoid old text)
        LLM-->>API: Fresh Alternative Question
        API-->>Teacher: 200 OK (Replaced Question)
    end
```

### Cognitive Distribution & Blueprinting
* **Sections**:
  * **Section A**: Multiple Choice Questions (1 mark each).
  * **Section B**: Very Short Answer questions (2 marks each).
  * **Section C**: Short Answer questions (3 marks each).
  * **Section D**: Long / Case-based Descriptive questions (5 marks each).
* **Bloom's Taxonomy Tagging**: Questions are classified with cognitive depth (`remember`, `understand`, `apply`, `analyze`).
* **Technical Diagram Generation**: If a question requires visual apparatus (e.g. concave mirror ray diagrams, electrical circuits), the system attempts high-resolution image generation via Gemini and saves the binary directly to S3. If image generation is constrained, it generates an inline responsive SVG vector diagram as fallback.

---

## 5. Question Paper & Answer Key Upload / Ingestion

When teachers upload existing printed question papers and answer keys:

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant API as Express API
    participant S3 as Amazon S3
    participant SQS as SQS: assignment-ocr-queue
    participant Worker as Lambda: Assignment OCR
    participant AI as Sarvam DocAI / Gemini Vision
    participant DB as PostgreSQL

    Teacher->>API: POST /api/assignments/upload-urls
    API-->>Teacher: Pre-signed S3 PUT URLs
    Teacher->>S3: Direct PUT (Question Paper PDF & Answer Key PDF)
    Teacher->>API: POST /api/assignments/process-async
    API->>DB: INSERT Assignment (status: 'ocr_processing')
    API->>SQS: SendMessage (assignment_id, s3_keys, subject, language)
    API-->>Teacher: 202 Accepted (Pipeline Status Poll URL)

    Worker->>SQS: Consume Message
    Worker->>S3: Download PDF Buffers
    Worker->>AI: Extract Hierarchical Questions & Passages
    AI-->>Worker: JSON (parent stems, lettered sub-parts, rubric keys)
    Worker->>AI: Determine Dynamic Reasoning Model
    Worker->>DB: UPDATE Assignment (questions_json, answer_key_text, status: 'ready')
    
    Teacher->>API: GET /api/assignments/:id/pipeline-status
    API-->>Teacher: 200 OK (status: 'ready', questions_json, answer_key_text)
```

### Hierarchy Preservation Rules
1. **Passage De-duplication**: Reading passages, instructions, and shared figures belong in the parent `stem` field once. Sub-parts `(a)`, `(b)`, `(c)` contain only their sub-question wording.
2. **Dynamic Routing Engine**:
   * Regional Indian Languages (Hindi, Telugu, Bengali, Tamil, etc.) $\rightarrow$ **Sarvam AI**.
   * Advanced STEM / Derivations / LaTeX $\rightarrow$ **Gemini 1.5 Pro**.
   * General Objective / Humanities $\rightarrow$ **Gemini 2.5 Flash**.

---

## 6. Student Submission & Bulk Stack Splitting

Paatam supports two submission workflows:

```mermaid
flowchart TD
    subgraph Mode_A["Mode A: Individual Student Upload"]
        S_Upload["Student uploads homework / test PDF"] --> S_S3["S3: paatam-documents/submissions/"]
        S_S3 --> S_Record["DB: Submission (status: 'submitted')"]
        S_Record --> S_Queue["SQS: paatam-paper-ocr-queue"]
    end

    subgraph Mode_B["Mode B: Teacher Bulk Class Stack Scan"]
        T_Upload["Teacher uploads 35-student combined PDF"] --> T_S3["S3: paatam-documents/bulk_stacks/"]
        T_S3 --> T_Record["DB: BatchJob (status: 'queued', stage: 'splitting')"]
        T_Record --> T_Queue["SQS: paatam-bulk-split-queue"]
        
        T_Queue --> Split_Lambda["Lambda: Bulk Splitter Worker"]
        Split_Lambda --> Header_OCR["Scan Page Headers (Name, Roll No, QR, Barcode)"]
        Header_OCR --> Slicing["Slice Master PDF into Individual Student PDFs"]
        Slicing --> Upload_Sliced["S3: Upload student_101.pdf, student_102.pdf..."]
        Upload_Sliced --> Create_Subs["DB: INSERT Submissions (for each student)"]
        Create_Subs --> Enqueue_OCR["SQS: paatam-paper-ocr-queue (35 messages)"]
    end
```

### Header Classification & Fuzzy Matching
* The Bulk Splitter examines the top 20% of each page for student identifiers (e.g. `Name: Aarav Sharma`, `Roll: 12`).
* Recognizes continuation pages without headers by tracking question numbering sequences.
* Uses Levenshtein distance matching against the enrolled class roster (`Student` table) to resolve handwriting variations.

---

## 7. Two-Stage Asynchronous Evaluation Pipeline

Evaluation is decoupled into two independent SQS-driven stages:

```mermaid
sequenceDiagram
    autonumber
    participant Q1 as SQS: paper-ocr-queue
    participant L1 as Lambda: Paper OCR Worker (Stage 1)
    participant S3 as Amazon S3
    participant Sarvam as Sarvam Document AI
    participant Gemini as Google Gemini Vision
    participant DB as PostgreSQL
    participant Q2 as SQS: paper-evaluation-queue
    participant L2 as Lambda: Paper Evaluation Worker (Stage 2)
    participant Notif as DB: Notification

    Q1->>L1: Receive Message (submission_id, paper_urls)
    L1->>DB: UPDATE Submission (status: 'ocr_processing', evaluation_status: 'transcribing_handwriting')
    L1->>S3: Download Page Buffers
    alt Indic Language (Hindi / Telugu)
        L1->>Sarvam: /doc-ai/v1/job/digitise (Polling & Zip Extraction)
        Sarvam-->>L1: High-Precision Devanagari / Telugu Markdown
    else English / STEM
        L1->>Gemini: Multimodal Vision OCR Prompt
        Gemini-->>L1: Transcribed Handwritten Text
    end
    L1->>DB: UPDATE Submission (ocr_text, status: 'ocr_completed', evaluation_status: 'ready_for_evaluation')
    L1->>Q2: SendMessage (submission_id, ocr_text, reasoning_model)

    Q2->>L2: Receive Message
    L2->>DB: UPDATE Submission (status: 'evaluating', evaluation_status: 'running_rubric_evaluation')
    L2->>DB: Fetch Assignment Questions & Teacher Answer Key
    alt Reasoning Model === 'sarvam'
        L2->>Sarvam: /v1/chat/completions (sarvam-105b with Strict JSON Schema)
        Sarvam-->>L2: Structured Question Evaluations JSON
    else Reasoning Model === 'gemini'
        L2->>Gemini: Rubric Evaluation & Socratic Hint Prompt
        Gemini-->>L2: Structured Question Evaluations JSON
    end
    L2->>L2: Dynamic Reasoning Refiner (Anti-Boilerplate Engine)
    L2->>DB: UPDATE Submission (score, max_score, feedback, socratic_hint, ai_evaluation_json, status: 'graded', evaluation_status: 'completed')
    L2->>Notif: INSERT Notification (GRADE_RELEASED, delivery_status: 'delivered')
```

### Anti-Hallucination & Transcribing Protections
1. **Unanswered / Empty Box Detection**:
   * If an answer box or blank line has nothing written, it is transcribed as `[Box: EMPTY]`.
   * Evaluator automatically assigns `scorePercent: 0`, `status: 'Unrelated / No Credit'`, and reasoning: `"Question was left blank by the student."`
2. **Indic Numeral Normalization**:
   * Devanagari numerals (१, २, ३) and Telugu numerals (౧, ౨, ౩) are normalized to Arabic numerals (1, 2, 3) to prevent question alignment failures.
3. **Objective / MCQ Robust Matching**:
   * Supports tick marks (`[Box: ✓]`), circled letters (`[Circled: B]`), crossed-out corrections (`[Crossed-out: A] [Box: B]`), and verbatim option text matches.
4. **Dynamic Reasoning Refiner (`refineOrSynthesizeReasoning`)**:
   * Inspects model outputs for generic repeating phrases (e.g. *"Correct answer extracted from paper"*).
   * Automatically replaces generic boilerplate with concrete, question-specific explanations based on the student's handwritten answer snippet.

---

## 8. Dead Letter Queues (DLQs) & The Self-Healing Sweeper

### DLQ Architecture Demystified
Dead Letter Queues are not separate services; they are standard AWS SQS queues configured with extended message retention:
* **Standard Queues**: `visibility_timeout = 900s` (15 mins), `message_retention = 86400s` (1 day).
* **DLQs**: `message_retention = 1209600s` (14 days).
* **Redrive Policy**: `maxReceiveCount = 3`. If a Lambda worker crashes or times out 3 consecutive times, SQS moves the poison message into the DLQ.
* **CloudWatch Alarm**: `ApproximateNumberOfMessagesVisible > 0` triggers an alert to engineering.

### Self-Healing Sweeper Worker
When external AI APIs experience global outages or network dropouts, messages can exceed retries or leave rows in an intermediate state (`ocr_processing` or `evaluating`).

```mermaid
flowchart TD
    Cron["EventBridge: rate(15 minutes)"] --> Sweep["Sweeper Worker (Lambda)"]
    Sweep --> Check_Sub["Query Submissions:\nstatus in ('ocr_processing', 'evaluating')\nAND updated_at < NOW() - 30 minutes"]
    Sweep --> Check_Batch["Query BatchJobs:\nstatus in ('queued', 'processing')\nAND updated_at < NOW() - 30 minutes"]
    
    Check_Sub -- "retry_count < 3" --> Re_Enqueue["Re-enqueue to SQS Pipeline"]
    Check_Sub -- "retry_count >= 3" --> Fail_Sub["Mark status: 'failed'\nReason: AI Worker Timeout"]
    
    Check_Batch -- "retry_count < 3" --> Re_Batch["Re-enqueue to Bulk Split Queue"]
    Check_Batch -- "retry_count >= 3" --> Fail_Batch["Mark status: 'failed'"]
```

---

## 9. Frontend State Synchronization & Polling Strategy

To provide users with real-time feedback without websockets or server-sent events overhead, Paatam uses **predictive polling intervals** tied to entity status fields.

```mermaid
stateDiagram-v2
    [*] --> Uploading: Teacher uploads PDF
    Uploading --> Queued: POST /api/submissions/batch
    Queued --> Splitting: BulkSplitLambda starts
    Splitting --> Transcribing: Sliced into papers
    Transcribing --> Grading: Stage 1 OCR complete
    Grading --> PendingReview: Stage 2 Evaluation complete
    PendingReview --> Graded: Teacher approves score
    Graded --> [*]
```

### Status Polling Reference Table

| Entity | Polling Endpoint | In-Flight States | Terminal States | Recommended Interval |
| :--- | :--- | :--- | :--- | :--- |
| **Assignment Question Paper** | `GET /api/assignments/:id/pipeline-status` | `ocr_processing` | `ready`, `failed` | 3 seconds (Exponential backoff up to 10s) |
| **Bulk Batch Job** | `GET /api/submissions/batch/:jobId` | `queued`, `splitting`, `grading` | `completed`, `failed` | 5 seconds |
| **Student Submission** | `GET /api/submissions/:id` | `submitted`, `ocr_processing`, `evaluating` | `graded`, `pending_review`, `failed` | 4 seconds |

### Frontend UX Behavior
1. **Assignment Creation**:
   * While `pipeline_status === 'ocr_processing'`, show a progress bar at 45% with message: *"Extracting questions and answer key..."*.
   * When `pipeline_status === 'ready'`, unlock the questions editor with pre-filled questions, marks, and benchmark keys.
2. **Bulk Stack Upload**:
   * Display live counters: `processed_count / total_files`.
   * As each student paper is sliced, it dynamically appears in the submissions table.
3. **Scorecard Inspection**:
   * Split-screen view: Left pane displays high-res scanned student paper pages from S3; right pane displays question-by-question marks, reasoning, and Socratic hints.

---

## 10. Security & Secrets Architecture

1. **AWS Secrets Manager**:
   * `paatam/database/credentials`: Database username, host, and auto-generated secure password.
   * `paatam/app/secrets`: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`, `SARVAM_API_KEY`.
2. **Network Isolation**:
   * **Public Subnets**: Internet-facing ALB and NAT Gateways.
   * **Private Subnets**: ECS Fargate containers and RDS Proxy.
   * **Isolated Subnets**: Amazon RDS PostgreSQL instance (zero inbound or outbound route to the internet).
3. **Authentication Token Lifecycle**:
   * **Access Token**: Short-lived (15 minutes), signed with HMAC SHA-256, transmitted in `Authorization: Bearer <token>`.
   * **Refresh Token**: Long-lived (7 days), stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie, persisted in PostgreSQL `RefreshToken` table with instant revocation on logout.
