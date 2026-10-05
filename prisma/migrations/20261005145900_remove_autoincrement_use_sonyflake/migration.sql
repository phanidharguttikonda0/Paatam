-- AlterTable
ALTER TABLE "AcademicYear" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "AcademicYear_id_seq";

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Admin_id_seq";

-- AlterTable
ALTER TABLE "AdminBranchAccess" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "AdminBranchAccess_id_seq";

-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Assignment_id_seq";

-- AlterTable
ALTER TABLE "Branch" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Branch_id_seq";

-- AlterTable
ALTER TABLE "Class" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Class_id_seq";

-- AlterTable
ALTER TABLE "ClassSubject" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "ClassSubject_id_seq";

-- AlterTable
ALTER TABLE "Corporate" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Corporate_id_seq";

-- AlterTable
ALTER TABLE "CorporateAdmin" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "CorporateAdmin_id_seq";

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Notification_id_seq";

-- AlterTable
ALTER TABLE "Otp" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Otp_id_seq";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "RefreshToken_id_seq";

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Section_id_seq";

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Student_id_seq";

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Subject_id_seq";

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Submission_id_seq";

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Teacher_id_seq";

-- AlterTable
ALTER TABLE "TeacherSubject" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "TeacherSubject_id_seq";
