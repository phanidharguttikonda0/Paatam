import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';
import bcrypt from 'bcrypt';

describe('Task 7: Teacher Grading, Overrides, Bulk Paper Stacks & Evaluation Review Tests', () => {
  let corporateId = '';
  let branch1Id = '';
  let branch2Id = '';
  let academicYearId = '';
  let classId = '';
  let sectionId = '';

  let teacher1Id = '';
  let teacher1AccessToken = '';
  let teacher2Id = '';
  let teacher2AccessToken = ''; // Branch 2 teacher (for cross-branch 403 checks)

  let student1Id = '';
  let student1AccessToken = '';
  let student2Id = '';

  let subjectId = '';
  let classSubjectId = '';
  let teacherSubjectId = '';

  let assignmentId = '';
  let submission1Id = '';
  let submission2Id = '';
  let batchJobId = '';

  beforeAll(async () => {
    // 1. Corporate
    corporateId = idGenerator.nextId().toString();
    await prisma.corporate.create({
      data: {
        id: BigInt(corporateId),
        name: 'Task 7 Evaluation Academy',
        registration_no: 'REG-TASK7-001',
      },
    });

    // 2. Branch 1
    branch1Id = idGenerator.nextId().toString();
    await prisma.branch.create({
      data: {
        id: BigInt(branch1Id),
        corporate_id: BigInt(corporateId),
        name: 'Task 7 Hyderabad Campus',
        pincode: '500081',
        address: 'Hitech City, Hyderabad',
        branch_contact_mail: 'hyderabad@task7.edu',
        mobile_number: '9888111001',
      },
    });

    // 3. Branch 2 (for authorization isolation checks)
    branch2Id = idGenerator.nextId().toString();
    await prisma.branch.create({
      data: {
        id: BigInt(branch2Id),
        corporate_id: BigInt(corporateId),
        name: 'Task 7 Bangalore Campus',
        pincode: '560001',
        address: 'MG Road, Bangalore',
        branch_contact_mail: 'bangalore@task7.edu',
        mobile_number: '9888111002',
      },
    });

    // 4. Academic Year & Class & Section in Branch 1
    academicYearId = idGenerator.nextId().toString();
    await prisma.academicYear.create({
      data: {
        id: BigInt(academicYearId),
        branch_id: BigInt(branch1Id),
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      },
    });

    classId = idGenerator.nextId().toString();
    await prisma.class.create({
      data: {
        id: BigInt(classId),
        branch_id: BigInt(branch1Id),
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
        strength: 30,
      },
    });

    // 5. Teachers
    const hashedPassword = await bcrypt.hash('TeacherPass123!', 10);
    teacher1Id = idGenerator.nextId().toString();
    await prisma.teacher.create({
      data: {
        id: BigInt(teacher1Id),
        branch_id: BigInt(branch1Id),
        teacher_id: 'TCH-TASK7-001',
        name: 'Dr. Vikram Sarabhai',
        contact_email: 'vikram@task7.edu',
        contact_mobile: '9888222001',
        password_hash: hashedPassword,
      },
    });

    teacher2Id = idGenerator.nextId().toString();
    await prisma.teacher.create({
      data: {
        id: BigInt(teacher2Id),
        branch_id: BigInt(branch2Id), // Branch 2 teacher
        teacher_id: 'TCH-TASK7-002',
        name: 'Dr. Homi Bhabha',
        contact_email: 'homi@task7.edu',
        contact_mobile: '9888222002',
        password_hash: hashedPassword,
      },
    });

    // Log in Teacher 1
    const t1Login = await request(app)
      .post('/api/auth/teacher/login')
      .send({ identifier: 'vikram@task7.edu', password: 'TeacherPass123!' });
    teacher1AccessToken = t1Login.body.data.accessToken;

    // Log in Teacher 2
    const t2Login = await request(app)
      .post('/api/auth/teacher/login')
      .send({ identifier: 'homi@task7.edu', password: 'TeacherPass123!' });
    teacher2AccessToken = t2Login.body.data.accessToken;

    // 6. Subject & Allocation
    subjectId = idGenerator.nextId().toString();
    await prisma.subject.create({
      data: {
        id: BigInt(subjectId),
        branch_id: BigInt(branch1Id),
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

    teacherSubjectId = idGenerator.nextId().toString();
    await prisma.teacherSubject.create({
      data: {
        id: BigInt(teacherSubjectId),
        teacher_id: BigInt(teacher1Id),
        subject_id: BigInt(subjectId),
      },
    });

    // 7. Students in Section A
    const hashedStudentPass = await bcrypt.hash('StudentPass123!', 10);
    student1Id = idGenerator.nextId().toString();
    await prisma.student.create({
      data: {
        id: BigInt(student1Id),
        section_id: BigInt(sectionId),
        admission_no: 'ADM-TASK7-001',
        roll_no: '101',
        name: 'Aarav Sharma',
        contact_email: 'aarav@task7.edu',
        contact_mobile: '9888333001',
        password_hash: hashedStudentPass,
      },
    });

    student2Id = idGenerator.nextId().toString();
    await prisma.student.create({
      data: {
        id: BigInt(student2Id),
        section_id: BigInt(sectionId),
        admission_no: 'ADM-TASK7-002',
        roll_no: '102',
        name: 'Diya Patel',
        contact_email: 'diya@task7.edu',
        contact_mobile: '9888333002',
        password_hash: hashedStudentPass,
      },
    });

    // Log in Student 1
    const s1Login = await request(app)
      .post('/api/auth/student/login')
      .send({ admission_no: 'ADM-TASK7-001', password: 'StudentPass123!' });
    student1AccessToken = s1Login.body.data.accessToken;

    // 8. Assignment in Branch 1 Section A
    assignmentId = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(assignmentId),
        section_id: BigInt(sectionId),
        class_subject_id: BigInt(classSubjectId),
        teacher_subject_id: BigInt(teacherSubjectId),
        title: 'Midterm Physics Assessment',
        difficulty: 'Medium',
        duration_minutes: 60,
        status: 'published',
        question_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/papers/midterm.pdf',
        answer_key_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/keys/midterm_key.pdf',
        questions_json: [
          {
            question_number: 1,
            question_text: 'What is the SI unit of electric potential?',
            max_marks: 10,
          },
          {
            question_number: 2,
            question_text: 'State and prove Gauss theorem.',
            max_marks: 30,
          },
        ],
      },
    });

    // 9. Initial Submissions
    // Submission 1: Aarav Sharma (pending_review)
    submission1Id = idGenerator.nextId().toString();
    await prisma.submission.create({
      data: {
        id: BigInt(submission1Id),
        assignment_id: BigInt(assignmentId),
        student_id: BigInt(student1Id),
        sample_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_p1.jpg',
        sample_paper_urls: [
          'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_p1.jpg',
          'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_p2.jpg',
        ],
        ocr_text: 'Question 1: Electric potential unit is Volt. Question 2: Total flux is q/epsilon_0.',
        score: 34,
        max_score: 40,
        feedback: 'Clear diagrams and accurate formula usage.',
        socratic_hint: 'Double check units when multiplying power and time.',
        status: 'pending_review',
        submitted_at: new Date('2026-10-15T10:15:00.000Z'),
        ai_evaluation_json: [
          { question_number: 1, marks_awarded: 9, max_marks: 10, verdict: 'correct' },
          { question_number: 2, marks_awarded: 25, max_marks: 30, verdict: 'partial' },
        ],
      },
    });

    // Submission 2: Diya Patel (submitted)
    submission2Id = idGenerator.nextId().toString();
    await prisma.submission.create({
      data: {
        id: BigInt(submission2Id),
        assignment_id: BigInt(assignmentId),
        student_id: BigInt(student2Id),
        sample_paper_url: 'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/diya_p1.jpg',
        sample_paper_urls: [
          'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/diya_p1.jpg',
        ],
        ocr_text: 'Question 1: Volt. Question 2: Flux equation proof.',
        score: 38,
        max_score: 40,
        feedback: 'Outstanding explanation.',
        socratic_hint: 'Try alternative proof methods for extra credit.',
        status: 'submitted',
        submitted_at: new Date('2026-10-15T10:30:00.000Z'),
      },
    });
  });

  // ==========================================
  // 1. GET /api/assignments/:id/submissions
  // ==========================================
  describe('1. GET /api/assignments/:id/submissions', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get(`/api/assignments/${assignmentId}/submissions`);
      expect(res.status).toBe(401);
    });

    it('returns 403 when accessed by STUDENT role', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${student1AccessToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 when accessed by teacher from another branch', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${teacher2AccessToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have access to this branch');
    });

    it('returns 404 when assignment does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/assignments/${dummyId}/submissions`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Assignment not found');
    });

    it('lists student submissions for assignment with correct structure and counts', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const firstSub = res.body.data[0];
      expect(firstSub).toHaveProperty('id');
      expect(firstSub).toHaveProperty('student_id');
      expect(firstSub).toHaveProperty('student_name');
      expect(firstSub).toHaveProperty('roll_no');
      expect(firstSub).toHaveProperty('score');
      expect(firstSub).toHaveProperty('max_score', 40);
      expect(firstSub).toHaveProperty('status');
      expect(firstSub).toHaveProperty('submitted_at');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('hasNextPage', false);
    });

    it('filters submissions by status=pending_review', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions?status=pending_review`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(submission1Id);
      expect(res.body.data[0].student_name).toBe('Aarav Sharma');
    });

    it('supports cursor pagination limit=1', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions?limit=1`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.hasNextPage).toBe(true);
      expect(res.body.meta.nextCursor).toBeTruthy();
    });
  });

  // ==========================================
  // 2. GET /api/submissions/:id
  // ==========================================
  describe('2. GET /api/submissions/:id', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get(`/api/submissions/${submission1Id}`);
      expect(res.status).toBe(401);
    });

    it('returns 403 when accessed by teacher from another branch', async () => {
      const res = await request(app)
        .get(`/api/submissions/${submission1Id}`)
        .set('Authorization', `Bearer ${teacher2AccessToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 when submission does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/submissions/${dummyId}`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Submission not found');
    });

    it('retrieves complete inspection data including sample paper URLs and OCR text', async () => {
      const res = await request(app)
        .get(`/api/submissions/${submission1Id}`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      const data = res.body.data;
      expect(data.id).toBe(submission1Id);
      expect(data.assignment_id).toBe(assignmentId);
      expect(data.student).toEqual({
        id: student1Id,
        name: 'Aarav Sharma',
        roll_no: '101',
      });
      expect(data.sample_paper_urls).toEqual([
        'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_p1.jpg',
        'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/aarav_p2.jpg',
      ]);
      expect(data.ocr_text).toContain('Electric potential unit is Volt');
      expect(data.score).toBe(34);
      expect(data.max_score).toBe(40);
      expect(data.feedback).toBe('Clear diagrams and accurate formula usage.');
      expect(data.socratic_hint).toBe('Double check units when multiplying power and time.');
      expect(data.status).toBe('pending_review');
      expect(Array.isArray(data.question_breakdown)).toBe(true);
      expect(data.question_breakdown.length).toBe(2);
      expect(data.question_breakdown[0].verdict).toBe('correct');
    });
  });

  // ==========================================
  // 3. POST /api/submissions/:id/approve
  // ==========================================
  describe('3. POST /api/submissions/:id/approve', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1Id}/approve`)
        .send({ final_score: 36 });
      expect(res.status).toBe(401);
    });

    it('returns 404 when submission does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .post(`/api/submissions/${dummyId}/approve`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ final_score: 36 });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Submission not found');
    });

    it('returns 400 when final_score is negative', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1Id}/approve`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ final_score: -5 });
      expect(res.status).toBe(400);
    });

    it('approves submission, updates final_score & feedback, and dispatches student notification', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1Id}/approve`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({
          final_score: 36,
          final_feedback: 'Excellent work. Checked and approved by Subject Teacher.',
          final_hint: 'Review kinetic friction equation before next unit test.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Submission approved successfully');
      expect(res.body.data.id).toBe(submission1Id);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.final_score).toBe(36);
      expect(res.body.data.final_feedback).toContain('Checked and approved by Subject Teacher');

      // Verify student 1 receives notification in feed
      const notifRes = await request(app)
        .get('/api/student/notifications')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(notifRes.status).toBe(200);
      const gradeNotif = notifRes.body.data.find((n: any) => n.type === 'GRADE_RELEASED');
      expect(gradeNotif).toBeTruthy();
      expect(gradeNotif.title).toBe('Scorecard Released');
      expect(gradeNotif.message).toContain('Midterm Physics Assessment');
    });
  });

  // ==========================================
  // 4. POST /api/submissions/:id/override
  // ==========================================
  describe('4. POST /api/submissions/:id/override', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission2Id}/override`)
        .send({ score: 39 });
      expect(res.status).toBe(401);
    });

    it('returns 400 when score is negative or missing', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission2Id}/override`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ score: -10 });
      expect(res.status).toBe(400);
    });

    it('returns 404 when submission does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .post(`/api/submissions/${dummyId}/override`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ score: 39 });
      expect(res.status).toBe(404);
    });

    it('successfully overrides score directly and marks as approved', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission2Id}/override`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({
          score: 39,
          feedback: 'Marks adjusted following re-evaluation of Q2 step marks.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(submission2Id);
      expect(res.body.data.score).toBe(39);
      expect(res.body.data.status).toBe('approved');

      // Verify inspected submission reflects the overridden score
      const getRes = await request(app)
        .get(`/api/submissions/${submission2Id}`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.score).toBe(39);
      expect(getRes.body.data.status).toBe('approved');
      expect(getRes.body.data.feedback).toBe(
        'Marks adjusted following re-evaluation of Q2 step marks.'
      );
    });
  });

  // ==========================================
  // 5. POST /api/submissions/bulk
  // ==========================================
  describe('5. POST /api/submissions/bulk', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/submissions/bulk')
        .send({ assignment_id: assignmentId, bulk_mode: 'combined_pdf' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when assignment_id is missing', async () => {
      const res = await request(app)
        .post('/api/submissions/bulk')
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ bulk_mode: 'combined_pdf' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when assignment does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .post('/api/submissions/bulk')
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({ assignment_id: dummyId, bulk_mode: 'combined_pdf', total_files: 30 });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Assignment not found');
    });

    it('returns 403 when teacher from another branch attempts bulk upload', async () => {
      const res = await request(app)
        .post('/api/submissions/bulk')
        .set('Authorization', `Bearer ${teacher2AccessToken}`)
        .send({ assignment_id: assignmentId, bulk_mode: 'combined_pdf', total_files: 30 });
      expect(res.status).toBe(403);
    });

    it('initiates batch upload job and returns 202 Accepted with poll URL', async () => {
      const res = await request(app)
        .post('/api/submissions/bulk')
        .set('Authorization', `Bearer ${teacher1AccessToken}`)
        .send({
          assignment_id: assignmentId,
          bulk_mode: 'combined_pdf',
          total_files: 35,
          sample_paper_urls: [
            'https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/batch/master_stack_35_students.pdf',
          ],
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('job_id');
      expect(res.body.data.status).toBe('queued');
      expect(res.body.data.stage).toBe('splitting');
      expect(res.body.data.total_files).toBe(35);
      expect(res.body.data.poll_url).toBe(`/api/submissions/batch/${res.body.data.job_id}`);

      batchJobId = res.body.data.job_id;
    });
  });

  // ==========================================
  // 6. GET /api/submissions/batch/:jobId
  // ==========================================
  describe('6. GET /api/submissions/batch/:jobId', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get(`/api/submissions/batch/${batchJobId}`);
      expect(res.status).toBe(401);
    });

    it('returns 404 when batch job does not exist', async () => {
      const dummyId = idGenerator.nextId().toString();
      const res = await request(app)
        .get(`/api/submissions/batch/${dummyId}`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Batch job not found');
    });

    it('returns 403 when accessed by teacher from another branch', async () => {
      const res = await request(app)
        .get(`/api/submissions/batch/${batchJobId}`)
        .set('Authorization', `Bearer ${teacher2AccessToken}`);
      expect(res.status).toBe(403);
    });

    it('returns batch job progress and created submissions', async () => {
      // Simulate partial job progress update in database
      await prisma.batchJob.update({
        where: { id: BigInt(batchJobId) },
        data: {
          status: 'completed',
          stage: 'completed',
          processed_count: 35,
          successful_count: 35,
          failed_count: 0,
          split_progress_json: [
            { submission_id: submission1Id, student_name: 'Aarav Sharma' },
            { submission_id: submission2Id, student_name: 'Diya Patel' },
          ],
        },
      });

      const res = await request(app)
        .get(`/api/submissions/batch/${batchJobId}`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.job_id).toBe(batchJobId);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.stage).toBe('completed');
      expect(res.body.data.total_files).toBe(35);
      expect(res.body.data.processed_count).toBe(35);
      expect(res.body.data.successful_count).toBe(35);
      expect(res.body.data.failed_count).toBe(0);
      expect(res.body.data.created_submissions).toEqual([
        { submission_id: submission1Id, student_name: 'Aarav Sharma' },
        { submission_id: submission2Id, student_name: 'Diya Patel' },
      ]);
    });
  });
});
