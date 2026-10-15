-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "answer_key_text" TEXT,
ADD COLUMN     "answer_key_url" TEXT,
ADD COLUMN     "class_subject_id" BIGINT NOT NULL,
ADD COLUMN     "due_date" TIMESTAMPTZ,
ADD COLUMN     "question_paper_url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "delivery_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "provider_message_id" TEXT;

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" BIGINT NOT NULL,
    "assignment_id" BIGINT NOT NULL,
    "bulk_mode" TEXT NOT NULL DEFAULT 'combined_pdf',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'grading',
    "total_files" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "successful_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "split_progress_json" JSONB,
    "grading_progress_json" JSONB,
    "status_message" TEXT,
    "errors_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumTopic" (
    "id" BIGINT NOT NULL,
    "class_subject_id" BIGINT,
    "unit_number" INTEGER NOT NULL DEFAULT 1,
    "unit_name" TEXT NOT NULL,
    "topic_name" TEXT NOT NULL,
    "subtopics" JSONB,
    "prescribed_weightage" INTEGER NOT NULL DEFAULT 0,
    "page_start" INTEGER,
    "page_end" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChapter" (
    "id" BIGINT NOT NULL,
    "class_subject_id" BIGINT,
    "chapter_number" INTEGER NOT NULL DEFAULT 1,
    "chapter_title" TEXT NOT NULL,
    "subtopics" JSONB,
    "pdf_url" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextbookEmbedding" (
    "id" BIGINT NOT NULL,
    "chapter_id" BIGINT,
    "class_subject_id" BIGINT,
    "topic_id" BIGINT,
    "page_number" INTEGER,
    "content_chunk" TEXT NOT NULL,
    "subtopics" JSONB,
    "embedding" vector(1536),
    "embedding_dimensions" INTEGER NOT NULL DEFAULT 1536,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextbookEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchJob_assignment_id_idx" ON "BatchJob"("assignment_id");

-- CreateIndex
CREATE INDEX "CurriculumTopic_class_subject_id_idx" ON "CurriculumTopic"("class_subject_id");

-- CreateIndex
CREATE INDEX "CurriculumChapter_class_subject_id_idx" ON "CurriculumChapter"("class_subject_id");

-- CreateIndex
CREATE INDEX "TextbookEmbedding_chapter_id_idx" ON "TextbookEmbedding"("chapter_id");

-- CreateIndex
CREATE INDEX "TextbookEmbedding_class_subject_id_idx" ON "TextbookEmbedding"("class_subject_id");

-- CreateIndex
CREATE INDEX "TextbookEmbedding_topic_id_idx" ON "TextbookEmbedding"("topic_id");

-- CreateIndex
CREATE INDEX "Assignment_class_subject_id_idx" ON "Assignment"("class_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_contact_email_key" ON "Teacher"("contact_email");

-- CreateIndex: pgvector HNSW index for TextbookEmbedding
CREATE INDEX "TextbookEmbedding_embedding_hnsw_idx" ON "TextbookEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchJob" ADD CONSTRAINT "BatchJob_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumTopic" ADD CONSTRAINT "CurriculumTopic_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "ClassSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumChapter" ADD CONSTRAINT "CurriculumChapter_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "ClassSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookEmbedding" ADD CONSTRAINT "TextbookEmbedding_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "CurriculumChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookEmbedding" ADD CONSTRAINT "TextbookEmbedding_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "ClassSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookEmbedding" ADD CONSTRAINT "TextbookEmbedding_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "CurriculumTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
