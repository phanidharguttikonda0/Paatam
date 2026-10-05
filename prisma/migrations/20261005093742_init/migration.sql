-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'OTHER');

-- CreateTable
CREATE TABLE "Corporate" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "registration_no" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Corporate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateAdmin" (
    "id" BIGSERIAL NOT NULL,
    "corporate_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" BIGSERIAL NOT NULL,
    "corporate_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "pincode" VARCHAR(6) NOT NULL,
    "address" TEXT NOT NULL,
    "branch_contact_mail" TEXT NOT NULL,
    "mobile_number" VARCHAR(10) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" BIGSERIAL NOT NULL,
    "admin_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "mobile" VARCHAR(10) NOT NULL,
    "role" "AdminRole" NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBranchAccess" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,

    CONSTRAINT "AdminBranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_year" INTEGER NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "class" VARCHAR(10) NOT NULL,
    "class_order" INTEGER,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_mobile" TEXT NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" BIGSERIAL NOT NULL,
    "class_id" BIGINT NOT NULL,
    "class_teacher_id" BIGINT,
    "section_name" VARCHAR(20) NOT NULL,
    "strength" INTEGER NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" BIGSERIAL NOT NULL,
    "section_id" BIGINT NOT NULL,
    "admission_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roll_no" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_mobile" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" BIGSERIAL NOT NULL,
    "class_id" BIGINT NOT NULL,
    "subject_id" BIGINT NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" BIGSERIAL NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "subject_id" BIGINT NOT NULL,

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" BIGSERIAL NOT NULL,
    "section_id" BIGINT NOT NULL,
    "teacher_subject_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "questions_json" JSONB NOT NULL DEFAULT '[]',
    "reasoning_model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'dispatched',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" BIGSERIAL NOT NULL,
    "assignment_id" BIGINT,
    "student_id" BIGINT NOT NULL,
    "sample_paper_url" TEXT,
    "sample_paper_urls" JSONB NOT NULL DEFAULT '[]',
    "ocr_text" TEXT,
    "score" DECIMAL,
    "max_score" DECIMAL,
    "feedback" TEXT,
    "socratic_hint" TEXT,
    "ai_evaluation_json" JSONB,
    "evaluation_provider" TEXT,
    "evaluation_status" TEXT,
    "fallback_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "final_score" DECIMAL,
    "final_feedback" TEXT,
    "final_hint" TEXT,
    "final_evaluation_json" JSONB,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details_json" JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" BIGINT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" BIGSERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "user_type" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT,
    "mobile" VARCHAR(10),
    "otp" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Corporate_registration_no_key" ON "Corporate"("registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateAdmin_email_key" ON "CorporateAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateAdmin_mobile_key" ON "CorporateAdmin"("mobile");

-- CreateIndex
CREATE INDEX "CorporateAdmin_corporate_id_idx" ON "CorporateAdmin"("corporate_id");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_contact_email_key" ON "Admin"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_mobile_key" ON "Admin"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "AdminBranchAccess_admin_id_branch_id_key" ON "AdminBranchAccess"("admin_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_branch_id_start_year_key" ON "AcademicYear"("branch_id", "start_year");

-- CreateIndex
CREATE UNIQUE INDEX "Class_branch_id_academic_year_id_class_key" ON "Class"("branch_id", "academic_year_id", "class");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_branch_id_teacher_id_key" ON "Teacher"("branch_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "Section_class_id_section_name_key" ON "Section"("class_id", "section_name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admission_no_key" ON "Student"("admission_no");

-- CreateIndex
CREATE UNIQUE INDEX "Student_section_id_roll_no_key" ON "Student"("section_id", "roll_no");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_class_id_subject_id_key" ON "ClassSubject"("class_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacher_id_subject_id_key" ON "TeacherSubject"("teacher_id", "subject_id");

-- CreateIndex
CREATE INDEX "Assignment_section_id_teacher_subject_id_idx" ON "Assignment"("section_id", "teacher_subject_id");

-- CreateIndex
CREATE INDEX "Submission_assignment_id_idx" ON "Submission"("assignment_id");

-- CreateIndex
CREATE INDEX "Submission_student_id_idx" ON "Submission"("student_id");

-- CreateIndex
CREATE INDEX "Notification_submission_id_idx" ON "Notification"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_user_type_idx" ON "RefreshToken"("user_id", "user_type");

-- CreateIndex
CREATE INDEX "Otp_email_idx" ON "Otp"("email");

-- CreateIndex
CREATE INDEX "Otp_mobile_idx" ON "Otp"("mobile");

-- AddForeignKey
ALTER TABLE "CorporateAdmin" ADD CONSTRAINT "CorporateAdmin_corporate_id_fkey" FOREIGN KEY ("corporate_id") REFERENCES "Corporate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_corporate_id_fkey" FOREIGN KEY ("corporate_id") REFERENCES "Corporate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminBranchAccess" ADD CONSTRAINT "AdminBranchAccess_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminBranchAccess" ADD CONSTRAINT "AdminBranchAccess_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_class_teacher_id_fkey" FOREIGN KEY ("class_teacher_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacher_subject_id_fkey" FOREIGN KEY ("teacher_subject_id") REFERENCES "TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
