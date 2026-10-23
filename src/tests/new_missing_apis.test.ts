import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';
import bcrypt from 'bcrypt';

describe('New Frontend-Requested APIs Integration Tests', () => {
  let corporateId = '';
  let branchId = '';
  let academicYearId = '';
  let classId = '';
  let sectionId = '';
  let teacherId = '';
  let teacherAccessToken = '';
  let studentId = '';
  let studentAccessToken = '';
  let subjectId = '';
  let classSubjectId = '';
  let teacherSubjectId = '';
  let assignmentId = '';
  let createdSubmissionId = '';

  beforeAll(async () => {
    // 1. Corporate
    corporateId = idGenerator.nextId().toString();
    await prisma.corporate.create({
      data: {
        id: BigInt(corporateId),
        name: 'New APIs Test Corporate',
        registration_no: `REG-NEW-API-${Date.now()}`,
      },
    });

    // 2. Branch
    branchId = idGenerator.nextId().toString();
    await prisma.branch.create({
      data: {
        id: BigInt(branchId),
        corporate_id: BigInt(corporateId),
        name: 'New APIs Main Branch',
        pincode: '500032',
        address: 'Gachibowli, Hyderabad',
        branch_contact_mail: `branch-${Date.now()}@paatam.edu`,
        mobile_number: '9888777666',
      },
    });

    // 3. Academic Year
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


    // 4. Class & Section
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

    // 5. Teacher
    const hashedPassword = await bcrypt.hash('TeacherPass123!', 10);
    teacherId = idGenerator.nextId().toString();
    await prisma.teacher.create({
      data: {
        id: BigInt(teacherId),
        branch_id: BigInt(branchId),
        teacher_id: `TCH-${Date.now()}`,
        name: 'Srinivasa Ramanujan',
        contact_email: `ramanujan-${Date.now()}@paatam.edu`,
        contact_mobile: '9888999000',
        password_hash: hashedPassword,
      },
    });

    // 6. Student
    studentId = idGenerator.nextId().toString();
    await prisma.student.create({
      data: {
        id: BigInt(studentId),
        section_id: BigInt(sectionId),
        admission_no: `ADM-${Date.now()}`,
        name: 'Aryabhata',
        roll_no: '101',
        password_hash: hashedPassword,
      },
    });

    // 7. Subject & Mapping
    subjectId = idGenerator.nextId().toString();
    await prisma.subject.create({
      data: {
        id: BigInt(subjectId),
        branch_id: BigInt(branchId),
        name: 'Mathematics',
        code: `MATH-${Date.now()}`,
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

    teacherSubjectId = idGenerator.nextId().toString();
    await prisma.teacherSubject.create({
      data: {
        id: BigInt(teacherSubjectId),
        teacher_id: BigInt(teacherId),
        subject_id: BigInt(subjectId),
      },
    });


    // 8. Assignment
    assignmentId = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(assignmentId),
        section_id: BigInt(sectionId),
        class_subject_id: BigInt(classSubjectId),
        teacher_subject_id: BigInt(teacherSubjectId),
        title: 'Trigonometry & Calculus Exam',
        difficulty: 'Hard',
        duration_minutes: 90,
        submission_mode: 'TEACHER_UPLOAD',
        question_paper_url: 'https://s3.amazonaws.com/paatam/math-paper.pdf',
        status: 'published',
      },
    });

    // Log in Teacher
    const teacherRecord = await prisma.teacher.findUnique({ where: { id: BigInt(teacherId) } });
    const tLogin = await request(app)
      .post('/api/auth/teacher/login')
      .send({ identifier: teacherRecord!.contact_email, password: 'TeacherPass123!' });
    teacherAccessToken = tLogin.body.data.accessToken;

    // Log in Student
    const studentRecord = await prisma.student.findUnique({ where: { id: BigInt(studentId) } });
    const sLogin = await request(app)
      .post('/api/auth/student/login')
      .send({ admission_no: studentRecord!.admission_no, password: 'TeacherPass123!' });
    studentAccessToken = sLogin.body.data.accessToken;
  });

  // ========================================================
  // 1. POST /api/submissions (Direct Single Upload by Teacher)
  // ========================================================
  describe('POST /api/submissions (Direct Single Upload)', () => {
    it('allows teacher to directly create a single student submission and queue for evaluation', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          assignment_id: assignmentId,
          student_id: studentId,
          sample_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/paper-1.pdf',
          submission_mode: 'HANDWRITTEN',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.submission_id).toBeDefined();
      expect(res.body.data.assignment_id).toBe(assignmentId);
      expect(res.body.data.student_id).toBe(studentId);

      createdSubmissionId = res.body.data.submission_id;

      // Seed a graded score for subsequent analytics tests
      await prisma.submission.update({
        where: { id: BigInt(createdSubmissionId) },
        data: {
          score: 36,
          max_score: 40,
          final_score: 36,
          status: 'graded',
          evaluation_status: 'completed',
        },
      });
    });

    it('rejects if student does not belong to the assignment section', async () => {
      // Create student in another section
      const otherSectionId = idGenerator.nextId().toString();
      await prisma.section.create({
        data: {
          id: BigInt(otherSectionId),
          class_id: BigInt(classId),
          section_name: 'B',
          strength: 20,
        },
      });

      const otherStudentId = idGenerator.nextId().toString();
      await prisma.student.create({
        data: {
          id: BigInt(otherStudentId),
          section_id: BigInt(otherSectionId),
          admission_no: `ADM-OTHER-${Date.now()}`,
          name: 'Other Student',
          roll_no: '201',
          password_hash: 'hashed',
        },
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          assignment_id: assignmentId,
          student_id: otherStudentId,
          file_url: 'https://s3.amazonaws.com/paper.pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Student does not belong to this assignment section');
    });
  });

  // ========================================================
  // 2. GET /api/submissions (Global Review Queue)
  // ========================================================
  describe('GET /api/submissions (Review Queue List)', () => {
    it('fetches global submissions list with cursor pagination and metadata', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();

      const item = res.body.data.find((s: any) => s.id === createdSubmissionId);
      expect(item).toBeDefined();
      expect(item.student_name).toBe('Aryabhata');
      expect(item.assignment_title).toBe('Trigonometry & Calculus Exam');
      expect(item.score).toBe(36);
    });

    it('supports filtering by assignment_id', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .query({ assignment_id: assignmentId });

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.assignment_id === assignmentId)).toBe(true);
    });
  });

  // ========================================================
  // 3. GET /api/analytics/overview & GET /api/analytics/students
  // ========================================================
  describe('Analytics APIs', () => {
    it('GET /api/analytics/overview returns aggregate KPIs, grade distribution, and subject metrics', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .query({ class_id: classId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.total_assignments).toBeGreaterThan(0);
      expect(res.body.data.total_submissions).toBeGreaterThan(0);
      expect(res.body.data.average_score_percentage).toBeGreaterThan(0);
      expect(res.body.data.pass_percentage).toBeGreaterThan(0);
      expect(res.body.data.grade_distribution).toHaveProperty('A');
      expect(res.body.data.grade_distribution).toHaveProperty('B');
      expect(res.body.data.score_distribution).toHaveProperty('81-100%');
      expect(Array.isArray(res.body.data.subject_performance)).toBe(true);
    });

    it('GET /api/analytics/students returns per-student grades and performance', async () => {
      const res = await request(app)
        .get('/api/analytics/students')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .query({ class_id: classId, section_id: sectionId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();

      const studentPerf = res.body.data.find((s: any) => s.id === studentId);
      expect(studentPerf).toBeDefined();
      expect(studentPerf.name).toBe('Aryabhata');
      expect(studentPerf.grade).toBe('A');
      expect(studentPerf.average_score).toBe(90); // 36 / 40 = 90%
    });
  });

  // ========================================================
  // 4. GET /api/notifications & POST /api/notifications/test
  // ========================================================
  describe('Notification APIs', () => {
    it('POST /api/notifications/test sends and logs a test alert', async () => {
      const res = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          channel: 'SMS',
          recipient: '9888999888',
          message: 'Paatam test SMS notification for parent review queue',
          recipient_type: 'PARENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.channel).toBe('SMS');
      expect(res.body.data.delivery_status).toBe('delivered');
    });

    it('GET /api/notifications returns notification delivery feed', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
    });
  });

  // ========================================================
  // 5. DELETE /api/submissions/:id (Single Submission Deletion)
  // ========================================================
  describe('DELETE /api/submissions/:id', () => {
    it('deletes a single submission successfully without affecting assignment', async () => {
      const res = await request(app)
        .delete(`/api/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('deleted successfully');

      // Verify submission is deleted from database
      const checkSub = await prisma.submission.findUnique({
        where: { id: BigInt(createdSubmissionId) },
      });
      expect(checkSub).toBeNull();

      // Verify assignment still exists
      const checkAssign = await prisma.assignment.findUnique({
        where: { id: BigInt(assignmentId) },
      });
      expect(checkAssign).toBeDefined();
    });

    it('returns 404 for non-existent submission', async () => {
      const res = await request(app)
        .delete('/api/submissions/999999999999')
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
