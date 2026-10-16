import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Task 6: Student Portal & Assignment Submissions Integration Tests', () => {
  let corporateId = '';
  let branchId = '';
  let academicYearId = '';
  let classId = '';
  let section1Id = '';
  let section2Id = '';
  let teacherId = '';
  let teacherAccessToken = '';
  let subject1Id = '';
  let subject2Id = '';
  let classSubject1Id = '';
  let classSubject2Id = '';
  let teacherSubject1Id = '';

  let student1Id = '';
  let student1AccessToken = '';
  let student2Id = '';
  let student2AccessToken = '';

  let assignment1Id = '';
  let assignment2Id = '';
  let otherSectionAssignmentId = '';
  let submission1Id = '';

  const testCorporate = {
    name: 'Task 6 Student Corp',
    registration_no: 'REG-TASK6-001',
  };

  const testBranch = {
    name: 'Task 6 Secunderabad Campus',
    pincode: '500003',
    address: 'Clock Tower, Secunderabad',
    branch_contact_mail: 'secunderabad@task6.edu',
    mobile_number: '9777111001',
  };

  const testTeacher = {
    name: 'Suresh Raina',
    teacher_id: 'TCH-TASK6-001',
    contact_email: 'raina@task6.edu',
    contact_mobile: '9777111002',
    password: 'TeacherPassword123!',
  };

  const testStudent1 = {
    name: 'Aarav Sharma',
    admission_no: 'ADM-TASK6-001',
    roll_no: '101',
    contact_email: 'aarav@task6.edu',
    contact_mobile: '9777111003',
    password: 'StudentPassword123!',
  };

  const testStudent2 = {
    name: 'Diya Patel',
    admission_no: 'ADM-TASK6-002',
    roll_no: '102',
    contact_email: 'diya@task6.edu',
    contact_mobile: '9777111004',
    password: 'StudentPassword123!',
  };

  beforeAll(async () => {
    // 1. Corporate & Branch
    corporateId = idGenerator.nextId().toString();
    await prisma.corporate.create({
      data: {
        id: BigInt(corporateId),
        name: testCorporate.name,
        registration_no: testCorporate.registration_no,
      },
    });

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

    // 2. Academic Year & Class
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

    // 3. Teacher
    teacherId = idGenerator.nextId().toString();
    const teacherHash = await require('bcrypt').hash(testTeacher.password, 10);
    await prisma.teacher.create({
      data: {
        id: BigInt(teacherId),
        branch_id: BigInt(branchId),
        name: testTeacher.name,
        teacher_id: testTeacher.teacher_id,
        contact_email: testTeacher.contact_email,
        contact_mobile: testTeacher.contact_mobile,
        password_hash: teacherHash,
      },
    });

    // 4. Sections (Section 1 has Suresh Raina as Class Teacher)
    section1Id = idGenerator.nextId().toString();
    await prisma.section.create({
      data: {
        id: BigInt(section1Id),
        class_id: BigInt(classId),
        section_name: 'A',
        strength: 30,
        class_teacher_id: BigInt(teacherId),
      },
    });

    section2Id = idGenerator.nextId().toString();
    await prisma.section.create({
      data: {
        id: BigInt(section2Id),
        class_id: BigInt(classId),
        section_name: 'B',
        strength: 28,
      },
    });

    // 5. Subjects & ClassSubjects
    subject1Id = idGenerator.nextId().toString();
    await prisma.subject.create({
      data: {
        id: BigInt(subject1Id),
        branch_id: BigInt(branchId),
        name: 'Physics',
        code: 'PHY-10',
      },
    });

    subject2Id = idGenerator.nextId().toString();
    await prisma.subject.create({
      data: {
        id: BigInt(subject2Id),
        branch_id: BigInt(branchId),
        name: 'Mathematics',
        code: 'MTH-10',
      },
    });

    classSubject1Id = idGenerator.nextId().toString();
    await prisma.classSubject.create({
      data: {
        id: BigInt(classSubject1Id),
        class_id: BigInt(classId),
        subject_id: BigInt(subject1Id),
      },
    });

    classSubject2Id = idGenerator.nextId().toString();
    await prisma.classSubject.create({
      data: {
        id: BigInt(classSubject2Id),
        class_id: BigInt(classId),
        subject_id: BigInt(subject2Id),
      },
    });

    teacherSubject1Id = idGenerator.nextId().toString();
    await prisma.teacherSubject.create({
      data: {
        id: BigInt(teacherSubject1Id),
        teacher_id: BigInt(teacherId),
        subject_id: BigInt(subject1Id),
      },
    });

    // 6. Students
    student1Id = idGenerator.nextId().toString();
    const student1Hash = await require('bcrypt').hash(testStudent1.password, 10);
    await prisma.student.create({
      data: {
        id: BigInt(student1Id),
        section_id: BigInt(section1Id),
        name: testStudent1.name,
        admission_no: testStudent1.admission_no,
        roll_no: testStudent1.roll_no,
        contact_email: testStudent1.contact_email,
        contact_mobile: testStudent1.contact_mobile,
        password_hash: student1Hash,
      },
    });

    student2Id = idGenerator.nextId().toString();
    const student2Hash = await require('bcrypt').hash(testStudent2.password, 10);
    await prisma.student.create({
      data: {
        id: BigInt(student2Id),
        section_id: BigInt(section2Id), // Enrolled in Section B
        name: testStudent2.name,
        admission_no: testStudent2.admission_no,
        roll_no: testStudent2.roll_no,
        contact_email: testStudent2.contact_email,
        contact_mobile: testStudent2.contact_mobile,
        password_hash: student2Hash,
      },
    });

    // 7. Assignments in Section 1 (A)
    assignment1Id = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(assignment1Id),
        section_id: BigInt(section1Id),
        class_subject_id: BigInt(classSubject1Id),
        teacher_subject_id: BigInt(teacherSubject1Id),
        title: 'Physics Midterm Exam',
        difficulty: 'Medium',
        duration_minutes: 60,
        status: 'published',
        question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/physics_midterm.pdf',
        due_date: new Date('2026-10-25T18:00:00.000Z'),
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

    assignment2Id = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(assignment2Id),
        section_id: BigInt(section1Id),
        class_subject_id: BigInt(classSubject1Id),
        teacher_subject_id: BigInt(teacherSubject1Id),
        title: 'Physics Mechanics Quiz',
        difficulty: 'Easy',
        duration_minutes: 30,
        status: 'published',
        question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/mechanics_quiz.pdf',
        due_date: new Date('2026-10-30T18:00:00.000Z'),
        questions_json: [
          {
            question_number: 1,
            question: 'Define acceleration.',
            type: 'short_answer',
            marks: 2,
          },
        ],
      },
    });

    // Assignment in Section 2 (B)
    otherSectionAssignmentId = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(otherSectionAssignmentId),
        section_id: BigInt(section2Id),
        class_subject_id: BigInt(classSubject1Id),
        teacher_subject_id: BigInt(teacherSubject1Id),
        title: 'Section B Physics Quiz',
        status: 'published',
        question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/section_b_quiz.pdf',
        questions_json: [],
      },
    });

    // 8. Auth Tokens
    const teacherLogin = await request(app).post('/api/auth/teacher/login').send({
      identifier: testTeacher.contact_email,
      password: testTeacher.password,
    });
    teacherAccessToken = teacherLogin.body.data.accessToken;

    const student1Login = await request(app).post('/api/auth/student/login').send({
      admission_no: testStudent1.admission_no,
      password: testStudent1.password,
    });
    student1AccessToken = student1Login.body.data.accessToken;

    const student2Login = await request(app).post('/api/auth/student/login').send({
      admission_no: testStudent2.admission_no,
      password: testStudent2.password,
    });
    student2AccessToken = student2Login.body.data.accessToken;
  });

  // ==========================================
  // 1. GET /api/student/dashboard
  // ==========================================
  describe('1. GET /api/student/dashboard', () => {
    it('retrieves full landing dashboard for authenticated student', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.class_name).toBe('Grade 10');
      expect(res.body.data.section_name).toBe('A');
      expect(res.body.data.class_teacher.name).toBe('Suresh Raina');
      expect(res.body.data.class_teacher.email).toBe('raina@task6.edu');
      expect(res.body.data.subjects.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.assignments_summary.pending_count).toBe(2);
      expect(res.body.data.assignments_summary.completed_count).toBe(0);
    });

    it('rejects teacher role from accessing student dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/student/dashboard');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 2. GET /api/student/assignments
  // ==========================================
  describe('2. GET /api/student/assignments', () => {
    it('lists active assignments for the student section with is_submitted=false', async () => {
      const res = await request(app)
        .get('/api/student/assignments')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].is_submitted).toBe(false);
      expect(res.body.data[0].submission_id).toBeNull();
      expect(res.body.data[0]).toHaveProperty('subject_name');
    });

    it('filters assignments by status=pending', async () => {
      const res = await request(app)
        .get('/api/student/assignments?status=pending')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((a: any) => !a.is_submitted)).toBe(true);
    });

    it('returns empty list for status=completed before any submissions', async () => {
      const res = await request(app)
        .get('/api/student/assignments?status=completed')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ==========================================
  // 3. GET /api/student/assignments/:id
  // ==========================================
  describe('3. GET /api/student/assignments/:id', () => {
    it('retrieves assignment details and questions for the student', async () => {
      const res = await request(app)
        .get(`/api/student/assignments/${assignment1Id}`)
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(assignment1Id);
      expect(res.body.data.title).toBe('Physics Midterm Exam');
      expect(res.body.data.subject).toBe('Physics');
      expect(res.body.data.questions).toHaveLength(1);
      expect(res.body.data.questions[0].question).toContain('SI unit of electric potential');
    });

    it('rejects access to assignment from a different section with 404', async () => {
      const res = await request(app)
        .get(`/api/student/assignments/${otherSectionAssignmentId}`)
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 4. POST /api/student/assignments/:id/submit
  // ==========================================
  describe('4. POST /api/student/assignments/:id/submit', () => {
    it('submits handwritten answer sheets and creates a submission record', async () => {
      const res = await request(app)
        .post(`/api/student/assignments/${assignment1Id}/submit`)
        .set('Authorization', `Bearer ${student1AccessToken}`)
        .send({
          sample_paper_urls: [
            'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_page1.jpg',
            'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_page2.jpg',
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Answer sheets submitted successfully');
      expect(res.body.data).toHaveProperty('submission_id');
      expect(res.body.data.assignment_id).toBe(assignment1Id);
      expect(res.body.data.student_id).toBe(student1Id);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.files_uploaded_count).toBe(2);

      submission1Id = res.body.data.submission_id;
    });

    it('reflects updated counts on the student dashboard after submission', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignments_summary.completed_count).toBe(1);
      expect(res.body.data.assignments_summary.pending_count).toBe(1);
    });

    it('shows is_submitted=true in the assignments list', async () => {
      const res = await request(app)
        .get('/api/student/assignments')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      const submitted = res.body.data.find((a: any) => a.id === assignment1Id);
      expect(submitted.is_submitted).toBe(true);
      expect(submitted.submission_id).toBe(submission1Id);
    });
  });

  // ==========================================
  // 5. GET /api/student/submissions/:id
  // ==========================================
  describe('5. GET /api/student/submissions/:id', () => {
    it('retrieves scorecard and evaluation feedback for student own submission', async () => {
      // Simulate teacher/system evaluating and releasing grades
      await prisma.submission.update({
        where: { id: BigInt(submission1Id) },
        data: {
          status: 'approved',
          score: 34,
          max_score: 40,
          final_score: 34,
          final_feedback: 'Strong understanding of kinematics with minor algebraic errors.',
          final_hint: 'Recall vertical velocity at the apex.',
        },
      });

      const res = await request(app)
        .get(`/api/student/submissions/${submission1Id}`)
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(submission1Id);
      expect(res.body.data.assignment_title).toBe('Physics Midterm Exam');
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.score).toBe(34);
      expect(res.body.data.max_score).toBe(40);
      expect(res.body.data.feedback).toContain('Strong understanding of kinematics');
      expect(res.body.data.socratic_hint).toContain('vertical velocity');
    });

    it('rejects another student from viewing this submission with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/student/submissions/${submission1Id}`)
        .set('Authorization', `Bearer ${student2AccessToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent submission', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/student/submissions/${dummyId}`)
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 6. GET /api/student/notifications
  // ==========================================
  describe('6. GET /api/student/notifications', () => {
    it('retrieves notification feed for the student', async () => {
      const res = await request(app)
        .get('/api/student/notifications')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const notif = res.body.data[0];
      expect(notif).toHaveProperty('id');
      expect(notif.title).toBe('Assignment Submitted');
      expect(notif.message).toContain('Physics Midterm Exam');
      expect(notif.read).toBe(false);
    });
  });
});
