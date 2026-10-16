# Paatam Backend - Pending Production API Documentation

> **Companion Document to [API_DOCS.md](file:///d:/SmartStudy/API_DOCS.md)**  
> This specification outlines all remaining backend API endpoints required for the production application.  
> It bridges the gap between the currently implemented production foundation (`Corporate`, `Branch`, `Branch Admin`) and the complete academic workflows captured in the system mindmap, frontend UX flows, and prototype logic.

---

## Table of Contents
1. [Architecture & System Conventions](#1-architecture--system-conventions)
   - [Cursor Pagination Standard](#11-cursor-pagination-standard)
   - [Role-Based Access Control (RBAC) Matrix](#12-role-based-access-control-rbac-matrix)
   - [Assignment Ingestion Architecture: S3 + SQS + Lambda + Dynamic LLM Routing](#13-assignment-ingestion-architecture-s3--sqs--lambda--dynamic-llm-routing)
   - [Automated AI Evaluation Roadmap Note](#14-automated-ai-evaluation-roadmap-note)
2. [Branch & Admin Management Extensions](#2-branch--admin-management-extensions)
   - `GET /api/branch/corporate/search` - Search Branches
   - `DELETE /api/branch/:branchId/admins/:adminId` - Remove Single Admin From Branch
   - `GET /api/branch-admin/my-branches` - Get Assigned Branches for Logged-In Admin
   - `GET /api/branch-admin/profile` - Get Current Branch Admin Profile
3. [Academic Year Management](#3-academic-year-management)
   - `GET /api/branch/:branchId/academic-years` - List Academic Years (Default Latest)
   - `POST /api/branch/:branchId/academic-years` - Create Academic Year
   - `PUT /api/academic-years/:id` - Update Academic Year (Set Active / Date Range)
   - `DELETE /api/academic-years/:id` - Delete Academic Year (Blocked if Classes Exist)
4. [Class Management](#4-class-management)
   - `GET /api/academic-years/:academicYearId/classes` - List Classes in Academic Year
   - `POST /api/academic-years/:academicYearId/classes` - Add Class (with Optional Auto-Sections)
   - `GET /api/classes/:classId` - Get Class Details
   - `PUT /api/classes/:classId` - Update Class
   - `DELETE /api/classes/:classId` - Delete Class (Blocked if Sections/Students Exist)
5. [Section Management & Class Teacher Assignment](#5-section-management--class-teacher-assignment)
   - `GET /api/classes/:classId/sections` - List Sections in Class
   - `POST /api/classes/:classId/sections` - Add Section
   - `GET /api/sections/:sectionId` - Get Section Details (Name, Strength, Class Teacher)
   - `PUT /api/sections/:sectionId` - Update Section Details
   - `DELETE /api/sections/:sectionId` - Delete Section (Blocked if Students Enrolled)
   - `PUT /api/sections/:sectionId/class-teacher` - Assign / Replace Class Teacher
   - `DELETE /api/sections/:sectionId/class-teacher` - Remove Class Teacher from Section
   - `GET /api/sections/:sectionId/subjects-teachers` - List Subjects with Assigned Teachers for Section
6. [Branch Subject Catalog & Class-Subject Mapping](#6-branch-subject-catalog--class-subject-mapping)
   - `GET /api/branch/:branchId/subjects` - Get All Subjects in Branch
   - `POST /api/branch/:branchId/subjects` - Create Subject in Branch Catalog
   - `PUT /api/subjects/:subjectId` - Update Subject Details
   - `DELETE /api/subjects/:subjectId` - Delete Subject (Blocked if Attached to Classes/Teachers)
   - `GET /api/classes/:classId/subjects` - Get Subjects Attached to Class
   - `POST /api/classes/:classId/subjects` - Attach Subject to Class
   - `DELETE /api/classes/:classId/subjects/:classSubjectId` - Remove Subject from Class (Blocked if Assignments Exist)
7. [Teacher Directory, Subject Mapping & Profiles](#7-teacher-directory-subject-mapping--profiles)
   - `POST /api/branch/:branchId/teachers` - Create Teacher
   - `GET /api/branch/:branchId/teachers/search` - Search Teachers by Name or ID
   - `GET /api/teachers/:teacherId` - Get Teacher Full Profile
   - `PUT /api/teachers/:teacherId` - Update Teacher Details
   - `DELETE /api/teachers/:teacherId` - Delete Teacher (Blocked if Class Teacher or Subject Assigned)
   - `GET /api/teachers/:teacherId/subjects` - Get Subjects Assigned to Teacher
   - `POST /api/teachers/:teacherId/subjects` - Assign Teacher to Subject
   - `DELETE /api/teachers/:teacherId/subjects/:subjectId` - Remove Teacher from Subject
   - `GET /api/teachers/:teacherId/sections` - Get Sections Where Teacher is Class Teacher
8. [Student Roster, Enrollment & Profiles](#8-student-roster-enrollment--profiles)
   - `GET /api/sections/:sectionId/students` - List All Students in Section
   - `GET /api/branch/:branchId/students/search` - Search Students by Name or Admission No
   - `POST /api/sections/:sectionId/students` - Add Single Student (with Parent Link)
   - `POST /api/sections/:sectionId/students/bulk` - Bulk Add Students (CSV / JSON Roster)
   - `GET /api/students/:studentId` - Get Student Full Details
   - `PUT /api/students/:studentId` - Update Student Details
   - `DELETE /api/students/:studentId` - Delete Student (Blocked if Submissions Exist)
   - `GET /api/students/:studentId/submissions` - Get Student Submissions & Scores
9. [Teacher Portal & Workflow APIs](#9-teacher-portal--workflow-apis)
   - `POST /api/auth/teacher/login` - Teacher Login
   - `POST /api/auth/teacher/forgot-password` - Teacher Forgot Password (OTP)
   - `POST /api/auth/teacher/reset-password` - Teacher Reset Password
   - `GET /api/teacher/profile` - Get Teacher Profile
   - `GET /api/teacher/dashboard` - Teacher Home Page (Assigned Sections & Subjects)
   - `GET /api/teacher/sections/:sectionId/subjects` - Get Subjects Teacher Teaches in Section
10. [Assignment Pipeline: Ingestion, OCR & Dynamic Routing](#10-assignment-pipeline-ingestion-ocr--dynamic-routing)
    - `POST /api/assignments/upload-urls` - Generate S3 Pre-signed URLs for Question Paper & Answer Key
    - `POST /api/assignments/process-async` - Dispatch S3 URLs to SQS for Lambda OCR & Model Routing
    - `GET /api/assignments/:id/pipeline-status` - Poll Lambda OCR & Model Selection Status
    - `POST /api/assignments/create-sync` - Synchronous Fallback (Upload + Direct LLM OCR)
    - `POST /api/assignments` - Finalize & Publish Assignment (Manual or Post-OCR Verified)
    - `GET /api/assignments` - Get Assignments for Subject in Section
    - `GET /api/assignments/:id` - Get Assignment Details
    - `DELETE /api/assignments/:id` - Delete Assignment (Purges Submissions)
11. [Student Portal & Submission APIs](#11-student-portal--submission-apis)
    - `POST /api/auth/student/login` - Student Login
    - `POST /api/auth/student/forgot-password` - Student Forgot Password (OTP)
    - `POST /api/auth/student/reset-password` - Student Reset Password
    - `GET /api/student/profile` - Get Student Profile
    - `GET /api/student/dashboard` - Student Home Page (Section, Subjects, Class Teacher, Assignments)
    - `GET /api/student/assignments` - List Assignments (Pending & Completed)
    - `GET /api/student/assignments/:id` - Get Assignment Details for Student
    - `POST /api/student/assignments/:id/submit` - Upload Handwritten Answer Sheets (Submission)
    - `GET /api/student/submissions/:id` - Get Submission Result (Score, Feedback, Socratic Hint)
    - `GET /api/student/notifications` - Get Student Notifications
12. [Teacher Grading & Review Workflow](#12-teacher-grading--review-workflow)
    - `GET /api/assignments/:id/submissions` - List Submissions for Assignment
    - `GET /api/submissions/:id` - Get Submission Detailed Scorecard
    - `POST /api/submissions/:id/approve` - Teacher Approve Graded Paper
    - `POST /api/submissions/:id/override` - Teacher Override Score & Feedback
    - `POST /api/submissions/bulk` - Teacher Batch Upload for Entire Class Paper Stack
    - `GET /api/submissions/batch/:jobId` - Poll Batch Job Status

---

## 1. Architecture & System Conventions

### 1.1 Cursor Pagination Standard
All list endpoints adhere to the production cursor pagination specification established in `API_DOCS.md`:
- **Query Parameters:**
  - `cursor` (string, optional): The BigInt ID of the last item received.
  - `limit` (number, optional): Max items to return. Hardcapped at `10`. Defaults to `10`.
- **Response Format:**
  ```json
  {
    "status": "success",
    "data": [ ... ],
    "meta": {
      "nextCursor": "1512528182029314",
      "hasNextPage": true
    }
  }
  ```

### 1.2 Role-Based Access Control (RBAC) Matrix

| User Role | Token Identity | Allowed Scopes & Actions |
|---|---|---|
| `CORPORATE_ADMIN` | Corporate Admin JWT | Multi-branch oversight, create branches, create/assign branch admins, global directory search |
| `BRANCH_ADMIN` (`PRINCIPAL`, `DEAN`, `VICE_PRINCIPAL`) | Branch Admin JWT | Academic years, classes, sections, branch subjects, class-teacher allocation, teacher & student directory |
| `TEACHER` | Teacher JWT | Assigned sections & subjects, assignment creation, student roster in taught sections, submission review & override, class teacher duties |
| `STUDENT` | Student JWT | Enrolled section dashboard, view assignments, upload handwritten answer sheets, view scorecard & hints |

### 1.3 Assignment Ingestion Architecture: S3 + SQS + Lambda + Dynamic LLM Routing

When teachers create assignments by uploading a physical **Question Paper** and **Answer Key**, the production application offers two execution architectures:

#### Primary Architecture: Asynchronous Event-Driven Pipeline (Recommended for Production)
```
[Frontend Client]
       │
       ▼  1. POST /api/assignments/upload-urls (Fetch S3 Presigned URLs)
 [AWS S3 Bucket]
       │  2. Direct browser upload (PDF/Images)
       ▼
 [API Backend]
       │  3. POST /api/assignments/process-async (Enqueues job)
       ▼
  [AWS SQS Queue]
       │
       ▼  4. Triggers worker event
 [AWS Lambda Worker / OCR Service]
       │  5. Calls Vision LLM (Gemini 2.5 Flash / Sarvam Indic OCR)
       │  6. Dynamic Routing: Analyzes paper complexity (text, math, diagrams, language)
       │     and determines optimal evaluation model (`gemini-2.5-flash` vs `gemini-1.5-pro`)
       ▼
 [PostgreSQL / Prisma DB]
       │  7. Stores extracted questions, answer key text, selected reasoning_model, status='ready'
       ▼
[Frontend Polling / Webhook]
          GET /api/assignments/:id/pipeline-status -> Teacher reviews & edits questions before publishing
```

#### Secondary Architecture: Synchronous Direct Fallback (For Single-Page / Rapid Mockups)
- `POST /api/assignments/create-sync`: Receives `multipart/form-data`, uploads to S3 synchronously, calls LLM OCR inline, applies model selection, and returns structured questions in a single blocking response. Suitable for low-latency single-page tests or when SQS/Lambda infrastructure is in maintenance.

### 1.4 Automated AI Evaluation Roadmap Note
> [!NOTE]
> Full automated AI multi-agent evaluation execution (OCR handwriting transcription of student answer sheets, rubric grading passes, socratic hint generation, and automatic WhatsApp scorecard delivery to parents) is part of the future AI Evaluation Engine milestone.  
> The endpoints in this document cover the complete **submission ingestion**, **teacher manual grading & override**, **scorecard review**, and **status lifecycles** required for the production web app today.

---

## 2. Branch & Admin Management Extensions

### `GET /api/branch/corporate/search`
Performs an auto-complete search for branches by name or city across the Corporate entity. Used in header branch pickers and corporate dashboard search inputs.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:**
  - `q` (string, required): Search query term (min 1 character).
- **Validations:**
  - `q` must be non-empty string.
  - Results strictly filtered by logged-in admin's `corporateId`.
  - Hardcapped at 5 matches.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "corporate_id": "1",
        "name": "Whitefield Main Campus",
        "pincode": "560066",
        "address": "ITPL Main Road, Bangalore",
        "branch_contact_mail": "whitefield@school.edu"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Query parameter 'q' is required"

---

### `DELETE /api/branch/:branchId/admins/:adminId`
Removes a specific Branch Admin's access to a single branch without having to overwrite the entire array in `assign-branches`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:**
  - `branchId` (string, required): BigInt ID of the branch.
  - `adminId` (string, required): BigInt ID of the branch admin.
- **Validations:**
  - Verifies both branch and admin belong to the corporate entity.
  - Verifies the admin currently has access to the branch.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Admin access removed from branch successfully"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Branch or admin not found, or admin is not assigned to this branch"

---

### `GET /api/branch-admin/my-branches`
Retrieves all branches linked to the currently logged-in Branch Admin (`AdminBranchAccess`). This is the entry-point API called immediately after Branch Admin login to populate the branch selector dashboard.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN` (`PRINCIPAL`, `DEAN`, `VICE_PRINCIPAL`)
- **Query Params:** None
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "101",
        "name": "North Campus",
        "pincode": "500081",
        "address": "Madhapur, Hyderabad",
        "branch_contact_mail": "north@school.edu",
        "mobile_number": "9876543210",
        "role_in_branch": "PRINCIPAL",
        "active_academic_year": {
          "id": "501",
          "start_year": 2026,
          "end_year": 2027
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Invalid or expired access token"

---

### `GET /api/branch-admin/profile`
Fetches the current logged-in Branch Admin's own profile and branch assignments.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "2",
      "corporate_id": "1",
      "admin_name": "Alice Admin",
      "contact_email": "alice@branch.com",
      "mobile": "1112223334",
      "role": "PRINCIPAL",
      "assigned_branches_count": 2
    }
  }
  ```

---

## 3. Academic Year Management

### `GET /api/branch/:branchId/academic-years`
Fetches a paginated list of academic years for a specific branch. The active/current academic year is returned at the top or flagged with `is_active: true`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`, `BRANCH_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Validations:** Tenancy check: admin must have access to `branchId`.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "501",
        "branch_id": "101",
        "start_year": 2026,
        "end_year": 2027,
        "is_active": true,
        "created_at": "2026-03-01T00:00:00.000Z"
      },
      {
        "id": "500",
        "branch_id": "101",
        "start_year": 2025,
        "end_year": 2026,
        "is_active": false,
        "created_at": "2025-03-01T00:00:00.000Z"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `POST /api/branch/:branchId/academic-years`
Creates a new academic year for a branch. If `is_active: true` is passed, automatically deactivates previous active academic years for that branch.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "start_year": 2026,
    "end_year": 2027,
    "is_active": true
  }
  ```
- **Validations:**
  - `start_year` must be an integer.
  - `end_year` must equal `start_year + 1`.
  - Duplicate `(branch_id, start_year, end_year)` is rejected.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Academic year created successfully",
    "data": {
      "id": "501",
      "branch_id": "101",
      "start_year": 2026,
      "end_year": 2027,
      "is_active": true
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "end_year must be start_year + 1"
  - `409 Conflict`: "Academic year 2026-2027 already exists for this branch"

---

### `PUT /api/academic-years/:id`
Updates academic year details or sets it as active/inactive.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `id` (string, required)
- **Request Body:**
  ```json
  {
    "is_active": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "501",
      "branch_id": "101",
      "start_year": 2026,
      "end_year": 2027,
      "is_active": true
    }
  }
  ```

---

### `DELETE /api/academic-years/:id`
Deletes an academic year. Blocked if classes or sections are linked to it.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `id` (string, required)
- **Validations:**
  - Checks if any record in `Class` has `academic_year_id == id`.
  - If classes exist, deletion is blocked with a 400 Bad Request.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Academic year deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete academic year: active classes are linked to this session"

---

## 4. Class Management

### `GET /api/academic-years/:academicYearId/classes`
Lists all classes in an academic year, ordered by `class_order`. Includes summary counts of sections and attached subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `academicYearId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "601",
        "branch_id": "101",
        "academic_year_id": "501",
        "name": "Grade 10",
        "class_order": 10,
        "sections_count": 2,
        "subjects_count": 5
      }
    ]
  }
  ```

---

### `POST /api/academic-years/:academicYearId/classes`
Creates a class in an academic year. Supports optional initial sections creation in the same transaction.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `academicYearId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Grade 10",
    "class_order": 10,
    "initial_sections": ["A", "B"]
  }
  ```
- **Validations:**
  - `name`: Non-empty string.
  - `class_order`: Positive integer for sorting (e.g. 10 for Grade 10).
  - Class name must be unique within the academic year.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "branch_id": "101",
      "academic_year_id": "501",
      "name": "Grade 10",
      "class_order": 10,
      "sections": [
        { "id": "701", "section_name": "A", "strength": 0 },
        { "id": "702", "section_name": "B", "strength": 0 }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Class name already exists in this academic year"

---

### `GET /api/classes/:classId`
Fetches class details, along with its list of sections, assigned class teachers, and linked subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "name": "Grade 10",
      "class_order": 10,
      "academic_year": {
        "id": "501",
        "start_year": 2026,
        "end_year": 2027
      },
      "sections": [
        {
          "id": "701",
          "section_name": "A",
          "strength": 40,
          "class_teacher": {
            "id": "801",
            "name": "Suresh Raina",
            "teacher_id": "TCH-001"
          }
        }
      ],
      "subjects": [
        { "id": "901", "class_subject_id": "1101", "name": "Physics", "code": "PHY-10" }
      ]
    }
  }
  ```

---

### `PUT /api/classes/:classId`
Updates class name or ordering index.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Grade 10 - ICSE",
    "class_order": 10
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "name": "Grade 10 - ICSE",
      "class_order": 10
    }
  }
  ```

---

### `DELETE /api/classes/:classId`
Deletes a class. Blocked if sections or enrolled students exist.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `classId` (string, required)
- **Validations:**
  - Checks if any `Section` records are attached to `classId`.
  - Blocked with `400 Bad Request` if sections exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete class: active sections exist under this class"

---

## 5. Section Management & Class Teacher Assignment

### `GET /api/classes/:classId/sections`
Lists all sections belonging to a specific class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "701",
        "class_id": "601",
        "section_name": "A",
        "strength": 42,
        "class_teacher_id": "801",
        "class_teacher_name": "Suresh Raina"
      }
    ]
  }
  ```

---

### `POST /api/classes/:classId/sections`
Adds a new section to an existing class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "section_name": "C",
    "strength": 45,
    "class_teacher_id": "801"
  }
  ```
- **Validations:**
  - `section_name` required (e.g. "C").
  - Section name must be unique within the class.
  - If `class_teacher_id` is supplied, validates that teacher belongs to the branch.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "703",
      "class_id": "601",
      "section_name": "C",
      "strength": 45,
      "class_teacher_id": "801"
    }
  }
  ```

---

### `GET /api/sections/:sectionId`
Returns complete section details: section name, capacity/strength, class teacher profile, enrolled student count, and class details.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "701",
      "section_name": "A",
      "strength": 40,
      "enrolled_students_count": 38,
      "class": {
        "id": "601",
        "name": "Grade 10"
      },
      "class_teacher": {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "contact_email": "suresh@school.edu",
        "contact_mobile": "9876500000"
      }
    }
  }
  ```

---

### `PUT /api/sections/:sectionId`
Updates section name or capacity limit.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "section_name": "A-Star",
    "strength": 45
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "701",
      "section_name": "A-Star",
      "strength": 45
    }
  }
  ```

---

### `DELETE /api/sections/:sectionId`
Deletes a section. Blocked if any students are enrolled in this section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Validations:**
  - Checks if `Student` table contains any records with `section_id == sectionId`.
  - Blocked with `400 Bad Request` if students exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Section deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete section: 38 students are currently enrolled in this section"

---

### `PUT /api/sections/:sectionId/class-teacher`
Assigns or re-assigns a teacher as the Section Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "teacher_id": "801"
  }
  ```
- **Validations:**
  - `teacher_id` must be a valid Teacher ID belonging to the same branch.
  - Returns warning if teacher is already a class teacher for another section.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class teacher assigned successfully",
    "data": {
      "section_id": "701",
      "class_teacher_id": "801",
      "teacher_name": "Suresh Raina"
    }
  }
  ```

---

### `DELETE /api/sections/:sectionId/class-teacher`
Removes the designated class teacher from a section (sets `class_teacher_id` to `null`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class teacher unassigned from section"
  }
  ```

---

### `GET /api/sections/:sectionId/subjects-teachers`
Retrieves a matrix of all subjects attached to the section's class, along with the specific teacher assigned to instruct each subject in this section. Essential for frontend section timetable and teacher allocation UI.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "subject_name": "Physics",
        "subject_code": "PHY-10",
        "assigned_teacher": {
          "id": "801",
          "name": "Suresh Raina",
          "teacher_id": "TCH-001"
        }
      },
      {
        "class_subject_id": "1102",
        "subject_name": "Mathematics",
        "subject_code": "MTH-10",
        "assigned_teacher": null
      }
    ]
  }
  ```

---

## 6. Branch Subject Catalog & Class-Subject Mapping

### `GET /api/branch/:branchId/subjects`
Retrieves all curriculum master subjects defined in the branch catalog.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `branchId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "901",
        "branch_id": "101",
        "name": "Physics",
        "code": "PHY-10",
        "grade": "Grade 10",
        "board": "CBSE",
        "description": "Mechanics, Light, Electricity"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `POST /api/branch/:branchId/subjects`
Creates a new curriculum subject in the branch catalog.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Chemistry",
    "code": "CHM-10",
    "grade": "Grade 10",
    "board": "CBSE",
    "description": "Organic, Inorganic and Physical Chemistry"
  }
  ```
- **Validations:**
  - `name`: Required string.
  - Subject name + grade must be unique within the branch.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "902",
      "branch_id": "101",
      "name": "Chemistry",
      "code": "CHM-10",
      "grade": "Grade 10",
      "board": "CBSE"
    }
  }
  ```

---

### `PUT /api/subjects/:subjectId`
Updates master subject metadata (name, code, board, description).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `subjectId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Advanced Chemistry",
    "code": "CHM-10-ADV",
    "description": "Updated syllabus with practical laboratory modules"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "902",
      "name": "Advanced Chemistry",
      "code": "CHM-10-ADV"
    }
  }
  ```

---

### `DELETE /api/subjects/:subjectId`
Deletes a subject from the branch catalog. Blocked if attached to any classes (`ClassSubject`) or teachers (`TeacherSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `subjectId` (string, required)
- **Validations:**
  - Verifies no active rows in `ClassSubject` reference `subjectId`.
  - Verifies no active rows in `TeacherSubject` reference `subjectId`.
  - Blocked with `400 Bad Request` if links exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete subject: currently attached to 3 classes and 2 teachers. Remove associations first."

---

### `GET /api/classes/:classId/subjects`
Lists all subjects attached to a specific class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "subject_id": "901",
        "name": "Physics",
        "code": "PHY-10",
        "board": "CBSE"
      }
    ]
  }
  ```

---

### `POST /api/classes/:classId/subjects`
Attaches a branch catalog subject to a class (`ClassSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "subject_id": "901"
  }
  ```
- **Validations:**
  - `subject_id` must belong to the same branch.
  - Subject cannot be attached twice to the same class.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Subject attached to class successfully",
    "data": {
      "class_subject_id": "1101",
      "class_id": "601",
      "subject_id": "901"
    }
  }
  ```
- **Error Responses:**
  - `409 Conflict`: "Subject is already attached to this class"

---

### `DELETE /api/classes/:classId/subjects/:classSubjectId`
Removes a subject from a class. Blocked if assignments have already been published under this class-subject.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:**
  - `classId` (string, required)
  - `classSubjectId` (string, required)
- **Validations:**
  - Checks if `Assignment` table contains rows with `class_subject_id == classSubjectId`.
  - Blocked if assignments exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject removed from class successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot remove subject: 4 assignments have been created under this class subject"

---

## 7. Teacher Directory, Subject Mapping & Profiles

### `POST /api/branch/:branchId/teachers`
Onboards a new Teacher into a branch. Generates salted password hash and stores contact credentials.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Suresh Raina",
    "teacher_id": "TCH-001",
    "contact_email": "suresh@school.edu",
    "contact_mobile": "9876500000",
    "password": "InitialTeacherPassword123"
  }
  ```
- **Validations:**
  - `teacher_id`: Unique within branch.
  - `contact_email` or `contact_mobile`: Must be unique.
  - `password`: Minimum 8 characters.
- **Success Response (201 Created):**
  *(Note: `password_hash` omitted)*
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "branch_id": "101",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "contact_email": "suresh@school.edu",
      "contact_mobile": "9876500000"
    }
  }
  ```
- **Error Responses:**
  - `409 Conflict`: "Teacher with this teacher_id, email, or mobile already exists"

---

### `GET /api/branch/:branchId/teachers/search`
Fast auto-complete search for teachers by name or `teacher_id`. Essential for frontend autocomplete dropdowns when allocating teachers to sections or subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Query Params:**
  - `q` (string, required): Search term (min 1 char).
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "contact_email": "suresh@school.edu",
        "is_class_teacher": true
      }
    ]
  }
  ```

---

### `GET /api/teachers/:teacherId`
Retrieves full profile for a teacher, including personal details, assigned subjects, and sections where they are Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER` (self)
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "branch_id": "101",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "contact_email": "suresh@school.edu",
      "contact_mobile": "9876500000",
      "assigned_subjects": [
        { "id": "901", "name": "Physics", "code": "PHY-10" }
      ],
      "class_teacher_sections": [
        { "id": "701", "section_name": "A", "class_name": "Grade 10" }
      ]
    }
  }
  ```

---

### `PUT /api/teachers/:teacherId`
Updates a teacher's personal and contact details.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Suresh Raina, M.Sc.",
    "contact_email": "suresh.raina@school.edu",
    "contact_mobile": "9876599999"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```

---

### `DELETE /api/teachers/:teacherId`
Deletes a teacher record. Blocked if the teacher has active subject assignments or is currently designated as Class Teacher for any section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Validations:**
  - Verifies teacher is not in `Section.class_teacher_id`.
  - Verifies no active rows in `TeacherSubject`.
  - Blocked with `400 Bad Request` if dependencies exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Teacher deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete teacher: actively assigned as Class Teacher for Grade 10-A and teaches 2 subjects"

---

### `GET /api/teachers/:teacherId/subjects`
Gets all subjects mapped to a specific teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "teacher_subject_id": "1201",
        "subject_id": "901",
        "subject_name": "Physics",
        "code": "PHY-10"
      }
    ]
  }
  ```

---

### `POST /api/teachers/:teacherId/subjects`
Maps a teacher to a subject (`TeacherSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Request Body:**
  ```json
  {
    "subject_id": "901"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Subject mapped to teacher successfully",
    "data": {
      "id": "1201",
      "teacher_id": "801",
      "subject_id": "901"
    }
  }
  ```

---

### `DELETE /api/teachers/:teacherId/subjects/:subjectId`
Removes subject assignment from a teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:**
  - `teacherId` (string, required)
  - `subjectId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject removed from teacher successfully"
  }
  ```

---

### `GET /api/teachers/:teacherId/sections`
Lists all sections where the teacher is designated as the Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "section_id": "701",
        "section_name": "A",
        "class_id": "601",
        "class_name": "Grade 10",
        "enrolled_count": 38
      }
    ]
  }
  ```

---

## 8. Student Roster, Enrollment & Profiles

### `GET /api/sections/:sectionId/students`
Fetches a paginated list of all students enrolled in a specific section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Query Params:** `cursor`, `limit`, `search` (optional)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1301",
        "section_id": "701",
        "name": "Aarav Sharma",
        "admission_no": "ADM-2024-001",
        "roll_no": "1001",
        "contact_email": "aarav@student.edu",
        "contact_mobile": "9988776655"
      }
    ],
    "meta": { "nextCursor": "1301", "hasNextPage": false }
  }
  ```

---

### `GET /api/branch/:branchId/students/search`
Searches students across the entire branch by name or admission number.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `branchId` (string, required)
- **Query Params:**
  - `q` (string, required): Search query.
  - `section_id` (string, optional): Filter by section.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1301",
        "name": "Aarav Sharma",
        "admission_no": "ADM-2024-001",
        "roll_no": "1001",
        "section_name": "A",
        "class_name": "Grade 10"
      }
    ]
  }
  ```

---

### `POST /api/sections/:sectionId/students`
Enrolls a single student into a section. If parent contact details are supplied, automatically links or creates the parent CRM record.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER` (if class teacher of this section)
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Aarav Sharma",
    "admission_no": "ADM-2024-001",
    "roll_no": "1001",
    "contact_email": "aarav@student.edu",
    "contact_mobile": "9988776655",
    "password": "StudentPassword123",
    "parent": {
      "name": "Kavita Sharma",
      "mobile": "9876511111",
      "email": "kavita@gmail.com"
    }
  }
  ```
- **Validations:**
  - `admission_no`: Unique across the system.
  - `name`: Required string.
  - Automatically increments section strength counter in transaction.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1301",
      "section_id": "701",
      "name": "Aarav Sharma",
      "admission_no": "ADM-2024-001",
      "roll_no": "1001"
    }
  }
  ```
- **Error Responses:**
  - `409 Conflict`: "A student with admission number ADM-2024-001 already exists"

---

### `POST /api/sections/:sectionId/students/bulk`
Bulk onboards an entire classroom roster using a JSON array or CSV payload.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "students": [
      {
        "name": "Aarav Sharma",
        "admission_no": "ADM-2024-001",
        "roll_no": "1001",
        "contact_mobile": "9988776655",
        "parent_mobile": "9876511111"
      },
      {
        "name": "Diya Patel",
        "admission_no": "ADM-2024-002",
        "roll_no": "1002",
        "contact_mobile": "9988776656",
        "parent_mobile": "9876511112"
      }
    ]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Enrolled 2 students successfully (0 failed)",
    "data": {
      "total_processed": 2,
      "successful_count": 2,
      "failed_count": 0,
      "failed_rows": []
    }
  }
  ```

---

### `GET /api/students/:studentId`
Retrieves a student's full profile, class and section details, parent contacts, and enrolled subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `STUDENT` (self)
- **URL Params:** `studentId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1301",
      "name": "Aarav Sharma",
      "admission_no": "ADM-2024-001",
      "roll_no": "1001",
      "contact_email": "aarav@student.edu",
      "contact_mobile": "9988776655",
      "class": { "id": "601", "name": "Grade 10" },
      "section": { "id": "701", "name": "A" }
    }
  }
  ```

---

### `PUT /api/students/:studentId`
Updates student demographic or contact details.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `studentId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Aarav K. Sharma",
    "roll_no": "1001-A",
    "contact_mobile": "9988776699"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```

---

### `DELETE /api/students/:studentId`
Deletes a student record. Blocked if the student has past exam submissions to preserve academic records.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `studentId` (string, required)
- **Validations:**
  - Checks if `Submission` contains any records for `student_id == studentId`.
  - Blocked with `400 Bad Request` if submissions exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Student deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete student: 4 evaluated test submissions exist on record"

---

### `GET /api/students/:studentId/submissions`
Fetches all test submissions, scores, and status history for an individual student.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `STUDENT` (self)
- **URL Params:** `studentId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1401",
        "assignment_title": "Physics Midterm Exam",
        "subject_name": "Physics",
        "score": 34,
        "max_score": 40,
        "status": "approved",
        "submitted_at": "2026-10-15T06:30:00.000Z"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

## 9. Teacher Portal & Workflow APIs

### `POST /api/auth/teacher/login`
Authenticates a Teacher using their identifier (`contact_email` or `teacher_id`) and password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (200 OK):**
  *Headers:* `Set-Cookie: refreshToken=...; HttpOnly; Max-Age=2592000`
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "role": "TEACHER",
        "branch_id": "101"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Invalid credentials"

---

### `POST /api/auth/teacher/forgot-password`
Generates and dispatches a password reset OTP to the teacher's registered email or mobile.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "branch_id": "101"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset OTP sent successfully"
  }
  ```

---

### `POST /api/auth/teacher/reset-password`
Verifies OTP and resets the teacher's password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "branch_id": "101",
    "otp": "123456",
    "new_password": "NewSecurePassword456!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset successfully"
  }
  ```

---

### `GET /api/teacher/profile`
Retrieves the logged-in teacher's profile.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "email": "suresh@school.edu",
      "mobile": "9876500000",
      "branch_id": "101"
    }
  }
  ```

---

### `GET /api/teacher/dashboard`
The primary landing API for the Teacher Home Page. Returns:
1. All sections where the teacher conducts classes, grouped by subject.
2. Any sections where the teacher is designated as the **Class Teacher** (which gives them access to student management in that section).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "teaching_allocations": [
        {
          "section_id": "701",
          "section_name": "A",
          "class_id": "601",
          "class_name": "Grade 10",
          "subject_id": "901",
          "subject_name": "Physics",
          "class_subject_id": "1101",
          "teacher_subject_id": "1201",
          "students_count": 38
        }
      ],
      "class_teacher_sections": [
        {
          "section_id": "701",
          "section_name": "A",
          "class_name": "Grade 10",
          "students_count": 38
        }
      ]
    }
  }
  ```

---

### `GET /api/teacher/sections/:sectionId/subjects`
Returns the specific subjects that the authenticated teacher teaches in the designated section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "teacher_subject_id": "1201",
        "subject_name": "Physics",
        "subject_code": "PHY-10"
      }
    ]
  }
  ```

---

## 10. Assignment Pipeline: Ingestion, OCR & Dynamic Routing

### `POST /api/assignments/upload-urls`
Generates AWS S3 pre-signed `PUT` URLs allowing the teacher's browser to directly upload the **Question Paper PDF** and optional **Answer Key PDF** directly to the cloud bucket without passing large binary payloads through the Node.js API server.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "files": [
      {
        "file_name": "grade10_physics_midterm.pdf",
        "file_type": "application/pdf",
        "purpose": "question_paper"
      },
      {
        "file_name": "physics_midterm_answerkey.pdf",
        "file_type": "application/pdf",
        "purpose": "answer_key"
      }
    ]
  }
  ```
- **Validations:**
  - Allowed file types: `application/pdf`, `image/jpeg`, `image/png`.
  - Max file size: 50MB.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "uploads": [
        {
          "purpose": "question_paper",
          "upload_url": "https://s3.ap-south-1.amazonaws.com/paatam-assignments/temp/qpaper-151252.pdf?AWSAccessKeyId=...",
          "file_url": "https://paatam-assignments.s3.ap-south-1.amazonaws.com/temp/qpaper-151252.pdf",
          "key": "temp/qpaper-151252.pdf"
        },
        {
          "purpose": "answer_key",
          "upload_url": "https://s3.ap-south-1.amazonaws.com/paatam-assignments/temp/anskey-151252.pdf?AWSAccessKeyId=...",
          "file_url": "https://paatam-assignments.s3.ap-south-1.amazonaws.com/temp/anskey-151252.pdf",
          "key": "temp/anskey-151252.pdf"
        }
      ]
    }
  }
  ```

---

### `POST /api/assignments/process-async`
Dispatches an assignment processing job to an AWS SQS queue after files have been uploaded to S3.  
1. Creates an initial `Assignment` record with `status: "ocr_processing"`.  
2. Emits an event message to AWS SQS.  
3. An AWS Lambda worker receives the message, invokes Multimodal Vision LLM to OCR the questions & answer key.  
4. **Dynamic Model Routing Step**: The Lambda inspects the complexity of the exam questions (diagram density, STEM notation, Indic language) and selects the best reasoning model (e.g. `gemini-2.5-flash` for standard exams or `gemini-1.5-pro` for deep reasoning/derivation questions).  
5. Lambda writes the parsed questions back to PostgreSQL and updates status to `"ready"`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "class_subject_id": "1101",
    "teacher_subject_id": "1201",
    "title": "Physics Midterm Exam",
    "difficulty": "Medium",
    "duration_minutes": 60,
    "question_paper_url": "https://paatam-assignments.s3.ap-south-1.amazonaws.com/temp/qpaper-151252.pdf",
    "answer_key_url": "https://paatam-assignments.s3.ap-south-1.amazonaws.com/temp/anskey-151252.pdf"
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "status": "success",
    "message": "Assignment queued for OCR and dynamic model routing",
    "data": {
      "assignment_id": "1501",
      "status": "ocr_processing",
      "poll_url": "/api/assignments/1501/pipeline-status"
    }
  }
  ```

---

### `GET /api/assignments/:id/pipeline-status`
Frontend polling endpoint to check the progress of the Lambda OCR extraction and model selection.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK - Processing):**
  ```json
  {
    "status": "success",
    "data": {
      "assignment_id": "1501",
      "pipeline_status": "ocr_processing",
      "progress_percent": 45,
      "message": "Extracting questions from uploaded PDF..."
    }
  }
  ```
- **Success Response (200 OK - Completed):**
  ```json
  {
    "status": "success",
    "data": {
      "assignment_id": "1501",
      "pipeline_status": "ready",
      "reasoning_model_selected": "gemini-2.5-flash",
      "routing_reason": "Standard single-choice and short numerical format detected",
      "total_questions": 15,
      "questions_json": [
        {
          "question_number": 1,
          "question": "What is the SI unit of electric potential?",
          "type": "mcq",
          "marks": 1,
          "options": ["Ampere", "Volt", "Ohm", "Joule"]
        }
      ],
      "answer_key_text": "Q1: (B) Volt [1 Mark]"
    }
  }
  ```

---

### `POST /api/assignments/create-sync`
Synchronous fallback alternative. Accepts `multipart/form-data`, uploads to S3, calls LLM OCR inline, and returns parsed questions immediately in the HTTP response.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `question_paper` (File, required)
  - `answer_key` (File, optional)
  - `section_id` (string, required)
  - `class_subject_id` (string, required)
  - `title` (string, required)
  - `duration_minutes` (number, required)
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Quiz 1",
      "status": "draft",
      "reasoning_model": "gemini-2.5-flash",
      "questions_json": [ ... ]
    }
  }
  ```

---

### `POST /api/assignments`
Finalizes and publishes the assignment. Used either after manual creation in UI, or to confirm/edit questions returned by the OCR pipeline before dispatching to students.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "class_subject_id": "1101",
    "teacher_subject_id": "1201",
    "title": "Physics Midterm Exam",
    "difficulty": "Medium",
    "duration_minutes": 60,
    "due_date": "2026-10-25T18:00:00.000Z",
    "status": "published",
    "reasoning_model": "gemini-2.5-flash",
    "question_paper_url": "https://.../qpaper.pdf",
    "answer_key_url": "https://.../anskey.pdf",
    "answer_key_text": "Q1: (B) Volt [1 Mark]...",
    "questions_json": [
      {
        "question_number": 1,
        "question": "What is the SI unit of electric potential?",
        "type": "mcq",
        "marks": 1,
        "options": ["Ampere", "Volt", "Ohm", "Joule"]
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Midterm Exam",
      "status": "published",
      "created_at": "2026-10-15T09:00:00.000Z"
    }
  }
  ```

---

### `GET /api/assignments`
Lists assignments. Supports filtering by section and subject.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Query Params:**
  - `section_id` (string, optional)
  - `class_subject_id` (string, optional)
  - `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1501",
        "title": "Physics Midterm Exam",
        "difficulty": "Medium",
        "duration_minutes": 60,
        "status": "published",
        "total_submissions": 32,
        "due_date": "2026-10-25T18:00:00.000Z"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `GET /api/assignments/:id`
Retrieves a single assignment with full question list, answer key, and attached media URLs.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`, `STUDENT`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Midterm Exam",
      "difficulty": "Medium",
      "duration_minutes": 60,
      "status": "published",
      "reasoning_model": "gemini-2.5-flash",
      "question_paper_url": "https://.../qpaper.pdf",
      "questions_json": [ ... ],
      "created_at": "2026-10-15T09:00:00.000Z"
    }
  }
  ```

---

### `DELETE /api/assignments/:id`
Deletes an assignment and purges related submissions.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Assignment and associated student submissions deleted successfully"
  }
  ```

---

## 11. Student Portal & Submission APIs

### `POST /api/auth/student/login`
Authenticates a student using their `admission_no` (or email) and password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "ADM-2024-001",
    "password": "StudentPassword123"
  }
  ```
- **Success Response (200 OK):**
  *Headers:* `Set-Cookie: refreshToken=...; HttpOnly; Max-Age=2592000`
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "1301",
        "name": "Aarav Sharma",
        "admission_no": "ADM-2024-001",
        "roll_no": "1001",
        "role": "STUDENT",
        "section_id": "701"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Invalid credentials"

---

### `POST /api/auth/student/forgot-password`
Initiates password reset OTP for a student.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "admission_no": "ADM-2024-001"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset OTP sent to registered contact"
  }
  ```

---

### `POST /api/auth/student/reset-password`
Verifies OTP and resets student password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "admission_no": "ADM-2024-001",
    "otp": "123456",
    "new_password": "NewStudentPassword789!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset successfully"
  }
  ```

---

### `GET /api/student/profile`
Retrieves student profile information.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1301",
      "name": "Aarav Sharma",
      "admission_no": "ADM-2024-001",
      "roll_no": "1001",
      "email": "aarav@student.edu",
      "mobile": "9988776655",
      "section_id": "701"
    }
  }
  ```

---

### `GET /api/student/dashboard`
The primary landing endpoint for the Student Home Page. Returns:
1. Student's section and class details.
2. Assigned Class Teacher name and contact.
3. List of active subjects taught in the section.
4. Summary counts of pending and completed assignments.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "class_name": "Grade 10",
      "section_name": "A",
      "class_teacher": {
        "id": "801",
        "name": "Suresh Raina",
        "email": "suresh@school.edu"
      },
      "subjects": [
        { "id": "901", "name": "Physics", "code": "PHY-10" },
        { "id": "902", "name": "Mathematics", "code": "MTH-10" }
      ],
      "assignments_summary": {
        "pending_count": 2,
        "completed_count": 5
      }
    }
  }
  ```

---

### `GET /api/student/assignments`
Returns a list of assignments available for the student's section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Query Params:**
  - `status` (string, optional): `pending` or `completed`.
  - `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1501",
        "title": "Physics Midterm Exam",
        "subject_name": "Physics",
        "duration_minutes": 60,
        "due_date": "2026-10-25T18:00:00.000Z",
        "is_submitted": false,
        "submission_id": null
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `GET /api/student/assignments/:id`
Retrieves assignment details for the student to take the exam.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Midterm Exam",
      "subject": "Physics",
      "duration_minutes": 60,
      "questions": [
        {
          "question_number": 1,
          "question": "What is the SI unit of electric potential?",
          "type": "mcq",
          "marks": 1,
          "options": ["Ampere", "Volt", "Ohm", "Joule"]
        }
      ]
    }
  }
  ```

---

### `POST /api/student/assignments/:id/submit`
Endpoint for the student to upload photos or scanned PDFs of their handwritten answer sheets. Stores files in S3 and registers the `Submission`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **URL Params:** `id` (string, required): Assignment ID.
- **Content-Type:** `multipart/form-data`
- **Form Data Fields:**
  - `answer_sheets`: One or more image (`.png`, `.jpg`) or PDF files.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Answer sheets submitted successfully",
    "data": {
      "submission_id": "1401",
      "assignment_id": "1501",
      "student_id": "1301",
      "status": "submitted",
      "submitted_at": "2026-10-15T10:15:00.000Z",
      "files_uploaded_count": 3
    }
  }
  ```

---

### `GET /api/student/submissions/:id`
Retrieves evaluation results for a student's submission once graded: final score, maximum possible score, constructive feedback, and Socratic learning hints.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT` (must own submission)
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "assignment_title": "Physics Midterm Exam",
      "status": "approved",
      "score": 34,
      "max_score": 40,
      "feedback": "Strong understanding of kinematics with minor algebraic errors in projectile height calculation.",
      "socratic_hint": "Recall how vertical velocity behaves at the peak of a projectile trajectory.",
      "submitted_at": "2026-10-15T10:15:00.000Z"
    }
  }
  ```

---

### `GET /api/student/notifications`
Retrieves notifications for the student (e.g. "Physics exam graded", "New assignment published").

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1601",
        "title": "Paper Graded",
        "message": "Your submission for Physics Midterm Exam has been graded. Score: 34/40.",
        "timestamp": "2026-10-15T11:00:00.000Z",
        "read": false
      }
    ]
  }
  ```

---

## 12. Teacher Grading & Review Workflow

### `GET /api/assignments/:id/submissions`
Lists all student submissions for a specific assignment, showing submission time, score, and review status.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Query Params:** `cursor`, `limit`, `status` (`submitted`, `approved`, `pending_review`)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1401",
        "student_id": "1301",
        "student_name": "Aarav Sharma",
        "roll_no": "1001",
        "score": 34,
        "max_score": 40,
        "status": "pending_review",
        "submitted_at": "2026-10-15T10:15:00.000Z"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `GET /api/submissions/:id`
Retrieves complete submission inspection data: scanned handwritten paper image URLs, OCR transcript text, question-by-question scoring breakdown, and feedback.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "assignment_id": "1501",
      "student": {
        "id": "1301",
        "name": "Aarav Sharma",
        "roll_no": "1001"
      },
      "sample_paper_urls": [
        "https://.../page1.jpg",
        "https://.../page2.jpg"
      ],
      "ocr_text": "Question 1: Electric potential unit is Volt...",
      "score": 34,
      "max_score": 40,
      "feedback": "Clear diagrams and accurate formula usage.",
      "socratic_hint": "Double check units when multiplying power and time.",
      "status": "pending_review",
      "question_breakdown": [
        {
          "question_number": 1,
          "marks_awarded": 1,
          "max_marks": 1,
          "verdict": "correct"
        }
      ]
    }
  }
  ```

---

### `POST /api/submissions/:id/approve`
Teacher reviews, adjusts feedback, and approves the graded paper. Sets status to `approved`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Request Body:**
  ```json
  {
    "final_score": 36,
    "final_feedback": "Excellent work. Checked and approved by Subject Teacher.",
    "final_hint": "Review kinetic friction equation before next unit test."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Submission approved successfully",
    "data": {
      "id": "1401",
      "status": "approved",
      "final_score": 36,
      "final_feedback": "Excellent work. Checked and approved by Subject Teacher."
    }
  }
  ```

---

### `POST /api/submissions/:id/override`
Teacher overrides the awarded score directly.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Request Body:**
  ```json
  {
    "score": 38,
    "feedback": "Marks adjusted following re-evaluation of Q4 step marks."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "score": 38,
      "status": "approved"
    }
  }
  ```

---

### `POST /api/submissions/bulk`
Allows a teacher to upload a batch of student handwritten answer sheets (either as individual PDF files per student, or one combined master PDF). Initiates background batch job.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `assignment_id` (string, required)
  - `bulk_mode` (string, required: `"single_per_student"` or `"combined_pdf"`)
  - `files` (one or more PDF/image files)
- **Success Response (202 Accepted):**
  ```json
  {
    "status": "success",
    "data": {
      "job_id": "1701",
      "status": "queued",
      "stage": "splitting",
      "total_files": 35,
      "poll_url": "/api/submissions/batch/1701"
    }
  }
  ```

---

### `GET /api/submissions/batch/:jobId`
Status polling endpoint for batch paper upload jobs.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `jobId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "job_id": "1701",
      "status": "completed",
      "stage": "completed",
      "total_files": 35,
      "processed_count": 35,
      "successful_count": 35,
      "failed_count": 0,
      "created_submissions": [
        { "submission_id": "1401", "student_name": "Aarav Sharma" }
      ]
    }
  }
  ```

---

*Paatam Backend — Production Pending API Specification. Designed to pair seamlessly with [API_DOCS.md](file:///d:/SmartStudy/API_DOCS.md).*
