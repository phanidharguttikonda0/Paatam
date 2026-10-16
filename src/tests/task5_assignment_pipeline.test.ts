import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Task 5: Assignment Pipeline Integration Tests', () => {
  let corporateId = '';
  let branchId = '';
  let adminId = '';
  let adminAccessToken = '';
  let academicYearId = '';
  let classId = '';
  let sectionId = '';
  let subjectId = '';
  let classSubjectId = '';
  let teacherId = '';
  let teacherSubjectId = '';
  let teacherAccessToken = '';
  let studentId = '';
  let studentAccessToken = '';

  let asyncAssignmentId = '';
  let syncAssignmentId = '';
  let publishedAssignmentId = '';

  const testCorporate = {
    name: 'Task 5 Edu Global Corp',
    registration_no: 'REG-TASK5-001',
    admin: {
      name: 'Task5 CorpAdmin',
      email: 'corpadmin@task5.edu',
      mobile: '9666111001',
    },
  };

  const testBranch = {
    name: 'Task5 Cyberabad Campus',
    pincode: '500081',
    address: 'Hitech City, Hyderabad',
    branch_contact_mail: 'cyberabad@task5.edu',
    mobile_number: '9666111002',
  };

  const testAdmin = {
    admin_name: 'Principal Skinner',
    contact_email: 'skinner@task5.edu',
    mobile: '9666111003',
    role: 'PRINCIPAL' as const,
    password: 'AdminPassword123!',
  };

  const testTeacher = {
    name: 'Prof. Albert Einstein',
    teacher_id: 'TCH-TASK5-001',
    contact_email: 'einstein@task5.edu',
    contact_mobile: '9666111004',
    password: 'TeacherPassword123!',
  };

  const testStudent = {
    name: 'Young Feynman',
    admission_no: 'ADM-TASK5-001',
    roll_no: '501',
    contact_email: 'feynman@task5.edu',
    contact_mobile: '9666111005',
    password: 'StudentPassword123!',
  };

  beforeAll(async () => {
    // 1. Setup Corporate Entity & Admin
    corporateId = idGenerator.nextId().toString();
    await prisma.corporate.create({
      data: {
        id: BigInt(corporateId),
        name: testCorporate.name,
        registration_no: testCorporate.registration_no,
      },
    });

    // 2. Setup Branch
    branchId = idGenerator.nextId().toString();
    await prisma.branch.create({
      data: {
        id: BigInt(branchId),
        corporate_id: BigInt(corporateId),
        name: testBranch.name,
        pincode: testBranch.pincode,
        address: testBranch.address,
        branch_contact_mail: testBranch.branch_contact_mail,
        mobile_number: testBranch.mobile_number,
      },
    });

    // 3. Setup Branch Admin
    adminId = idGenerator.nextId().toString();
    const adminHashedPass = await require('bcrypt').hash(testAdmin.password, 10);
    await prisma.admin.create({
      data: {
        id: BigInt(adminId),
        corporate_id: BigInt(corporateId),
        admin_name: testAdmin.admin_name,
        contact_email: testAdmin.contact_email,
        mobile: testAdmin.mobile,
        role: testAdmin.role,
        password_hash: adminHashedPass,
      },
    });

    await prisma.adminBranchAccess.create({
      data: {
        id: idGenerator.nextId(),
        admin_id: BigInt(adminId),
        branch_id: BigInt(branchId),
      },
    });

    // 4. Setup Academic Year, Class, Section
    academicYearId = idGenerator.nextId().toString();
    await prisma.academicYear.create({
      data: {
        id: BigInt(academicYearId),
        branch_id: BigInt(branchId),
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      },
    });

    classId = idGenerator.nextId().toString();
    await prisma.class.create({
      data: {
        id: BigInt(classId),
        branch_id: BigInt(branchId),
        academic_year_id: BigInt(academicYearId),
        name: 'Grade 10',
        class_order: 10,
      },
    });

    sectionId = idGenerator.nextId().toString();
    await prisma.section.create({
      data: {
        id: BigInt(sectionId),
        class_id: BigInt(classId),
        section_name: 'A',
        strength: 25,
      },
    });

    // 5. Setup Subject & ClassSubject
    subjectId = idGenerator.nextId().toString();
    await prisma.subject.create({
      data: {
        id: BigInt(subjectId),
        branch_id: BigInt(branchId),
        name: 'Physics',
        code: 'PHY-10',
      },
    });

    classSubjectId = idGenerator.nextId().toString();
    await prisma.classSubject.create({
      data: {
        id: BigInt(classSubjectId),
        class_id: BigInt(classId),
        subject_id: BigInt(subjectId),
      },
    });

    // 6. Setup Teacher & TeacherSubject
    teacherId = idGenerator.nextId().toString();
    const teacherHashedPass = await require('bcrypt').hash(testTeacher.password, 10);
    await prisma.teacher.create({
      data: {
        id: BigInt(teacherId),
        branch_id: BigInt(branchId),
        name: testTeacher.name,
        teacher_id: testTeacher.teacher_id,
        contact_email: testTeacher.contact_email,
        contact_mobile: testTeacher.contact_mobile,
        password_hash: teacherHashedPass,
      },
    });

    teacherSubjectId = idGenerator.nextId().toString();
    await prisma.teacherSubject.create({
      data: {
        id: BigInt(teacherSubjectId),
        teacher_id: BigInt(teacherId),
        subject_id: BigInt(subjectId),
      },
    });

    // 7. Setup Student
    studentId = idGenerator.nextId().toString();
    const studentHashedPass = await require('bcrypt').hash(testStudent.password, 10);
    await prisma.student.create({
      data: {
        id: BigInt(studentId),
        section_id: BigInt(sectionId),
        name: testStudent.name,
        admission_no: testStudent.admission_no,
        roll_no: testStudent.roll_no,
        contact_email: testStudent.contact_email,
        contact_mobile: testStudent.contact_mobile,
        password_hash: studentHashedPass,
      },
    });

    // 8. Generate Auth Tokens
    const adminLoginRes = await request(app).post('/api/auth/admin/login').send({
      identifier: testAdmin.contact_email,
      password: testAdmin.password,
    });
    adminAccessToken = adminLoginRes.body.data.accessToken;

    const teacherLoginRes = await request(app).post('/api/auth/teacher/login').send({
      identifier: testTeacher.contact_email,
      password: testTeacher.password,
    });
    teacherAccessToken = teacherLoginRes.body.data.accessToken;

    const studentLoginRes = await request(app).post('/api/auth/student/login').send({
      admission_no: testStudent.admission_no,
      password: testStudent.password,
    });
    studentAccessToken = studentLoginRes.body.data.accessToken;
  });

  // ==========================================
  // 1. POST /api/assignments/upload-urls
  // ==========================================
  describe('1. POST /api/assignments/upload-urls', () => {
    it('generates AWS S3 pre-signed PUT URLs for question paper and answer key', async () => {
      const res = await request(app)
        .post('/api/assignments/upload-urls')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          files: [
            {
              file_name: 'physics_midterm.pdf',
              file_type: 'application/pdf',
              purpose: 'question_paper',
            },
            {
              file_name: 'answer_key.pdf',
              file_type: 'application/pdf',
              purpose: 'answer_key',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.uploads).toHaveLength(2);

      const qPaper = res.body.data.uploads[0];
      expect(qPaper.purpose).toBe('question_paper');
      expect(qPaper.upload_url).toContain('https://');
      expect(qPaper.upload_url).toContain('X-Amz-Signature=');
      expect(qPaper.file_url).toContain('https://');
      expect(qPaper.key).toContain('temp/question_paper-');

      const ansKey = res.body.data.uploads[1];
      expect(ansKey.purpose).toBe('answer_key');
      expect(ansKey.upload_url).toContain('https://');
      expect(ansKey.key).toContain('temp/answer_key-');
    });

    it('rejects unsupported file extensions with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/assignments/upload-urls')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          files: [
            {
              file_name: 'unsupported.exe',
              file_type: 'application/x-msdownload',
              purpose: 'question_paper',
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('rejects student role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/assignments/upload-urls')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          section_id: sectionId,
          files: [
            {
              file_name: 'physics.pdf',
              file_type: 'application/pdf',
              purpose: 'question_paper',
            },
          ],
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. POST /api/assignments/process-async
  // ==========================================
  describe('2. POST /api/assignments/process-async', () => {
    it('enqueues assignment for async OCR and model routing', async () => {
      const res = await request(app)
        .post('/api/assignments/process-async')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          teacher_subject_id: teacherSubjectId,
          title: 'Physics Async Midterm Exam',
          difficulty: 'Hard',
          duration_minutes: 90,
          question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf',
          answer_key_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/anskey.pdf',
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Assignment queued for OCR and dynamic model routing');
      expect(res.body.data).toHaveProperty('assignment_id');
      expect(res.body.data.status).toBe('ocr_processing');
      expect(res.body.data.poll_url).toBe(`/api/assignments/${res.body.data.assignment_id}/pipeline-status`);

      asyncAssignmentId = res.body.data.assignment_id;
    });

    it('returns 404 if section_id is not found', async () => {
      const nonExistentId = idGenerator.nextId().toString();
      const res = await request(app)
        .post('/api/assignments/process-async')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: nonExistentId,
          class_subject_id: classSubjectId,
          title: 'NonExistent Section Test',
          question_paper_url: 'https://s3.amazonaws.com/paper.pdf',
        });

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 3. GET /api/assignments/:id/pipeline-status
  // ==========================================
  describe('3. GET /api/assignments/:id/pipeline-status', () => {
    it('polls status while assignment is ocr_processing', async () => {
      const res = await request(app)
        .get(`/api/assignments/${asyncAssignmentId}/pipeline-status`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.assignment_id).toBe(asyncAssignmentId);
      expect(res.body.data.pipeline_status).toBe('ocr_processing');
      expect(res.body.data).toHaveProperty('progress_percent');
      expect(res.body.data).toHaveProperty('message');
    });

    it('returns ready status and parsed questions once processing is complete', async () => {
      // Simulate OCR worker writing back extracted questions and marking status 'ready'
      await prisma.assignment.update({
        where: { id: BigInt(asyncAssignmentId) },
        data: {
          status: 'ready',
          reasoning_model: 'gemini-2.5-flash',
          answer_key_text: 'Q1: Option B (Volt)',
          questions_json: [
            {
              question_number: 1,
              question: 'What is the SI unit of electric potential?',
              type: 'mcq',
              marks: 1,
              options: ['Ampere', 'Volt', 'Ohm', 'Joule'],
            },
          ],
        },
      });

      const res = await request(app)
        .get(`/api/assignments/${asyncAssignmentId}/pipeline-status`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pipeline_status).toBe('ready');
      expect(res.body.data.reasoning_model_selected).toBe('gemini-2.5-flash');
      expect(res.body.data.total_questions).toBe(1);
      expect(res.body.data.questions_json[0].question).toContain('SI unit');
      expect(res.body.data.answer_key_text).toContain('Volt');
    });

    it('returns 404 for non-existent assignment id', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/assignments/${dummyId}/pipeline-status`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 4. POST /api/assignments/create-sync
  // ==========================================
  describe('4. POST /api/assignments/create-sync', () => {
    it('creates assignment synchronously with draft status and inline questions', async () => {
      const res = await request(app)
        .post('/api/assignments/create-sync')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: 'Physics Sync Quiz 1',
          duration_minutes: 45,
          question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/sync_qpaper.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Physics Sync Quiz 1');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.reasoning_model).toBe('gemini-2.5-flash');
      expect(Array.isArray(res.body.data.questions_json)).toBe(true);

      syncAssignmentId = res.body.data.id;
    });

    it('rejects create-sync when question_paper_url is missing with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/assignments/create-sync')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: 'Invalid Quiz',
        });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 5. POST /api/assignments (Publish / Finalize)
  // ==========================================
  describe('5. POST /api/assignments', () => {
    it('creates and publishes a new assignment to the section', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: 'Physics Final Examination',
          difficulty: 'Hard',
          duration_minutes: 120,
          due_date: '2026-11-15T18:00:00.000Z',
          status: 'published',
          question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/finals.pdf',
          answer_key_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/finals_key.pdf',
          answer_key_text: 'Finals Answer Key Summary',
          questions_json: [
            {
              question_number: 1,
              question: 'Explain Newton’s Third Law of Motion with an example.',
              type: 'long_answer',
              marks: 5,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Physics Final Examination');
      expect(res.body.data.status).toBe('published');

      publishedAssignmentId = res.body.data.id;
    });

    it('finalizes an existing draft assignment using assignment_id in body', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          assignment_id: syncAssignmentId,
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: 'Physics Sync Quiz 1 (Finalized)',
          status: 'published',
          question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/sync_qpaper.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(syncAssignmentId);
      expect(res.body.data.title).toBe('Physics Sync Quiz 1 (Finalized)');
      expect(res.body.data.status).toBe('published');
    });
  });

  // ==========================================
  // 6. GET /api/assignments (Listing & Filtering)
  // ==========================================
  describe('6. GET /api/assignments', () => {
    it('lists assignments with pagination and submission count', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('total_submissions');
      expect(res.body.meta).toHaveProperty('hasNextPage');
    });

    it('filters assignments by section_id and class_subject_id', async () => {
      const res = await request(app)
        .get(`/api/assignments?section_id=${sectionId}&class_subject_id=${classSubjectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // 7. GET /api/assignments/:id (Detail View)
  // ==========================================
  describe('7. GET /api/assignments/:id', () => {
    it('retrieves assignment details for teacher', async () => {
      const res = await request(app)
        .get(`/api/assignments/${publishedAssignmentId}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(publishedAssignmentId);
      expect(res.body.data.title).toBe('Physics Final Examination');
      expect(res.body.data.section.id).toBe(sectionId);
      expect(res.body.data.class_subject.subject_name).toBe('Physics');
      expect(res.body.data.questions_json).toHaveLength(1);
    });

    it('allows student enrolled in the section to retrieve assignment details', async () => {
      const res = await request(app)
        .get(`/api/assignments/${publishedAssignmentId}`)
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(publishedAssignmentId);
    });

    it('returns 404 for non-existent assignment', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/assignments/${dummyId}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 8. DELETE /api/assignments/:id
  // ==========================================
  describe('8. DELETE /api/assignments/:id', () => {
    it('deletes assignment and purges related submissions and batch jobs', async () => {
      // Attach a test submission to verify cascade delete
      const submissionId = idGenerator.nextId();
      await prisma.submission.create({
        data: {
          id: submissionId,
          assignment_id: BigInt(syncAssignmentId),
          student_id: BigInt(studentId),
          status: 'submitted',
        },
      });

      const res = await request(app)
        .delete(`/api/assignments/${syncAssignmentId}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Assignment and associated student submissions deleted successfully');

      // Verify assignment no longer exists
      const checkRes = await request(app)
        .get(`/api/assignments/${syncAssignmentId}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(checkRes.status).toBe(404);

      // Verify submission was purged
      const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
      expect(sub).toBeNull();
    });

    it('rejects student role from deleting assignment with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/assignments/${publishedAssignmentId}`)
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
