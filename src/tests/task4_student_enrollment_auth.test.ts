import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Task 4: Student Roster, Enrollment & Student Auth Portal Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';
  let branchId = '';
  let adminId = '';
  let adminAccessToken = '';
  let academicYearId = '';
  let classId = '';
  let section1Id = '';
  let section2Id = '';
  let subjectId = '';
  let classSubjectId = '';
  let teacherId = '';
  let teacherSubjectId = '';
  let assignmentId = '';

  let student1Id = '';
  let student2Id = '';
  let student1AccessToken = '';
  let student2AccessToken = '';

  const testCorporate = {
    name: 'Task 4 Edu Corp',
    registration_no: 'REG-TASK4-001',
    admin: {
      name: 'Task4 SuperAdmin',
      email: 'task4_super@corp.com',
      mobile: '9555111001',
    },
  };

  const testBranch = {
    name: 'Task4 Jubilee Hills Campus',
    pincode: '500033',
    address: 'Road No 36, Jubilee Hills, Hyderabad',
    branch_contact_mail: 'jubilee@task4.edu',
    mobile_number: '9555111002',
  };

  const testAdmin = {
    admin_name: 'Principal Belding',
    contact_email: 'belding@task4.edu',
    mobile: '9555111003',
    role: 'PRINCIPAL',
    password: 'SecureAdminPass123!',
  };

  const testTeacher = {
    name: 'Rahul Dravid',
    teacher_id: 'TCH-TASK4-001',
    contact_email: 'dravid@task4.edu',
    contact_mobile: '9555111004',
    password: 'TeacherPassword123!',
  };

  const testStudent1 = {
    name: 'Aarav Sharma',
    admission_no: 'ADM-TASK4-001',
    roll_no: '1001',
    contact_email: 'aarav@task4.edu',
    contact_mobile: '9555111005',
    password: 'InitialStudentPass123!',
    parent: {
      name: 'Kavita Sharma',
      mobile: '9555111006',
      email: 'kavita@parent.com',
    },
  };

  const testStudent2 = {
    name: 'Diya Patel',
    admission_no: 'ADM-TASK4-002',
    roll_no: '1002',
    contact_email: 'diya@task4.edu',
    contact_mobile: '9555111007',
    password: 'InitialStudentPass123!',
  };

  beforeAll(async () => {
    // 1. Corporate setup & login
    await request(app).post('/api/auth/send-otp').send({
      email: testCorporate.admin.email,
      mobile: testCorporate.admin.mobile,
    });
    const otpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({
      email: testCorporate.admin.email,
      mobile: testCorporate.admin.mobile,
      otp: otpRow?.otp,
    });
    const verificationToken = verifyRes.body.data.verificationToken;

    await request(app).post('/api/corporate/create').send({
      ...testCorporate,
      verificationToken,
    });
    const lookupRes = await request(app).get(`/api/corporate/lookup/${testCorporate.registration_no}`);
    corporateId = lookupRes.body.data.corporateId;

    await request(app).post('/api/auth/corporate/login').send({
      email: testCorporate.admin.email,
      corporateId,
    });
    const loginOtpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
    const loginRes = await request(app).post('/api/auth/corporate/verify').send({
      email: testCorporate.admin.email,
      corporateId,
      otp: loginOtpRow?.otp,
    });
    corporateAccessToken = loginRes.body.data.accessToken;

    // 2. Create Branch
    const branchRes = await request(app)
      .post('/api/branch/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testBranch);
    branchId = branchRes.body.data.id;

    // 3. Create Admin & Assign to Branch
    const adminRes = await request(app)
      .post('/api/admin/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testAdmin);
    adminId = adminRes.body.data.id;

    await request(app)
      .post(`/api/admin/${adminId}/assign-branches`)
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send({ branch_ids: [branchId] });

    // 4. Admin Login
    const adminLoginRes = await request(app).post('/api/auth/admin/login').send({
      identifier: testAdmin.contact_email,
      password: testAdmin.password,
    });
    adminAccessToken = adminLoginRes.body.data.accessToken;

    // 5. Create Academic Year, Class, 2 Sections
    const ayRes = await request(app)
      .post(`/api/branch/${branchId}/academic-years`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ start_year: 2026, end_year: 2027, is_active: true });
    academicYearId = ayRes.body.data.id;

    const classRes = await request(app)
      .post(`/api/academic-years/${academicYearId}/classes`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Grade 10', class_order: 10, initial_sections: ['A', 'B'] });
    classId = classRes.body.data.id;
    section1Id = classRes.body.data.sections[0].id;
    section2Id = classRes.body.data.sections[1].id;

    // 6. Create Subject & Teacher & Assignment for submission tests
    const subRes = await request(app)
      .post(`/api/branch/${branchId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Physics', code: 'PHY-10', grade: '10', board: 'CBSE' });
    subjectId = subRes.body.data.id;

    const csRes = await request(app)
      .post(`/api/classes/${classId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ subject_id: subjectId });
    classSubjectId = csRes.body.data.class_subject_id;

    const teacherRes = await request(app)
      .post(`/api/branch/${branchId}/teachers`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(testTeacher);
    teacherId = teacherRes.body.data.id;

    const tsRes = await request(app)
      .post(`/api/teachers/${teacherId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ subject_id: subjectId });
    teacherSubjectId = tsRes.body.data.id;

    // Create an assignment in DB for submission history testing
    assignmentId = idGenerator.nextId().toString();
    await prisma.assignment.create({
      data: {
        id: BigInt(assignmentId),
        section_id: BigInt(section1Id),
        class_subject_id: BigInt(classSubjectId),
        teacher_subject_id: BigInt(teacherSubjectId),
        title: 'Physics Midterm Exam',
        difficulty: 'Medium',
        duration_minutes: 60,
        status: 'published',
        question_paper_url: 'https://example.com/qpaper.pdf',
      },
    });
  });

  // ==========================================
  // Section 8: Student Roster & Enrollment
  // ==========================================

  describe('Section 8: Student Enrollment & Roster Management', () => {
    it('1. POST /api/sections/:sectionId/students - Enroll single student', async () => {
      const res = await request(app)
        .post(`/api/sections/${section1Id}/students`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testStudent1);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.section_id).toBe(section1Id);
      expect(res.body.data.name).toBe(testStudent1.name);
      expect(res.body.data.admission_no).toBe(testStudent1.admission_no);
      expect(res.body.data.roll_no).toBe(testStudent1.roll_no);
      expect(res.body.data).not.toHaveProperty('password_hash');

      student1Id = res.body.data.id;

      // Verify section strength incremented to 1
      const sectionRes = await request(app)
        .get(`/api/sections/${section1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(sectionRes.body.data.strength).toBe(1);
    });

    it('1b. POST /api/sections/:sectionId/students - Reject duplicate admission number with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/sections/${section1Id}/students`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ...testStudent1,
          roll_no: '9999',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('1c. POST /api/sections/:sectionId/students - Reject duplicate roll number in same section with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/sections/${section1Id}/students`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Another Student',
          admission_no: 'ADM-UNIQUE-999',
          roll_no: testStudent1.roll_no, // duplicate in section 1
          password: 'Pass12345!',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists in this section');
    });

    it('2. GET /api/sections/:sectionId/students - Paginated roster of students in section', async () => {
      const res = await request(app)
        .get(`/api/sections/${section1Id}/students`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(student1Id);
      expect(res.body.data[0].name).toBe(testStudent1.name);
      expect(res.body.data[0].admission_no).toBe(testStudent1.admission_no);
      expect(res.body.meta).toHaveProperty('hasNextPage');
    });

    it('2b. GET /api/sections/:sectionId/students - Search filter by student name', async () => {
      const res = await request(app)
        .get(`/api/sections/${section1Id}/students?search=Aarav`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Aarav Sharma');

      const noMatch = await request(app)
        .get(`/api/sections/${section1Id}/students?search=NonExistentStudent`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(noMatch.body.data.length).toBe(0);
    });

    it('3. GET /api/branch/:branchId/students/search - Search across entire branch by name or admission_no', async () => {
      const searchByName = await request(app)
        .get(`/api/branch/${branchId}/students/search?q=Sharma`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(searchByName.status).toBe(200);
      expect(searchByName.body.status).toBe('success');
      expect(searchByName.body.data.length).toBe(1);
      expect(searchByName.body.data[0].name).toBe('Aarav Sharma');
      expect(searchByName.body.data[0].section_name).toBe('A');
      expect(searchByName.body.data[0].class_name).toBe('Grade 10');

      const searchByAdm = await request(app)
        .get(`/api/branch/${branchId}/students/search?q=TASK4-001`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(searchByAdm.status).toBe(200);
      expect(searchByAdm.body.data.length).toBe(1);
      expect(searchByAdm.body.data[0].admission_no).toBe(testStudent1.admission_no);
    });

    it('4. POST /api/sections/:sectionId/students/bulk - Bulk enroll students with row-by-row validation', async () => {
      const bulkPayload = {
        students: [
          {
            name: 'Diya Patel',
            admission_no: testStudent2.admission_no,
            roll_no: testStudent2.roll_no,
            contact_mobile: testStudent2.contact_mobile,
            contact_email: testStudent2.contact_email,
            password: testStudent2.password,
          },
          {
            name: 'Rohan Mehra',
            admission_no: 'ADM-TASK4-003',
            roll_no: '1003',
            contact_mobile: '9555111008',
          },
          {
            // Row that should fail: duplicate admission_no (already belongs to Aarav)
            name: 'Duplicate Student',
            admission_no: testStudent1.admission_no,
            roll_no: '1004',
          },
        ],
      };

      const res = await request(app)
        .post(`/api/sections/${section1Id}/students/bulk`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.total_processed).toBe(3);
      expect(res.body.data.successful_count).toBe(2);
      expect(res.body.data.failed_count).toBe(1);
      expect(res.body.data.failed_rows.length).toBe(1);
      expect(res.body.data.failed_rows[0].row).toBe(3);
      expect(res.body.data.failed_rows[0].reason).toContain('already exists');

      // Fetch Diya Patel id
      const diyaRow = await prisma.student.findUnique({
        where: { admission_no: testStudent2.admission_no },
      });
      student2Id = diyaRow!.id.toString();

      // Section 1 strength should now be 1 (initial) + 2 (successful bulk) = 3
      const sectionRes = await request(app)
        .get(`/api/sections/${section1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(sectionRes.body.data.strength).toBe(3);
    });

    it('5. GET /api/students/:studentId - Full student details with class and section', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(student1Id);
      expect(res.body.data.name).toBe(testStudent1.name);
      expect(res.body.data.admission_no).toBe(testStudent1.admission_no);
      expect(res.body.data.class.name).toBe('Grade 10');
      expect(res.body.data.section.name).toBe('A');
    });

    it('6. PUT /api/students/:studentId - Update student demographic and contact details', async () => {
      const res = await request(app)
        .put(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Aarav K. Sharma',
          contact_mobile: '9555111999',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Aarav K. Sharma');
      expect(res.body.data.contact_mobile).toBe('9555111999');
    });

    it('8. GET /api/students/:studentId/submissions - Student test submissions history', async () => {
      // Create a submission in DB for student 1
      const submissionId = idGenerator.nextId();
      await prisma.submission.create({
        data: {
          id: submissionId,
          assignment_id: BigInt(assignmentId),
          student_id: BigInt(student1Id),
          score: 34,
          max_score: 40,
          status: 'approved',
        },
      });

      const res = await request(app)
        .get(`/api/students/${student1Id}/submissions`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].assignment_title).toBe('Physics Midterm Exam');
      expect(res.body.data[0].subject_name).toBe('Physics');
      expect(res.body.data[0].score).toBe(34);
      expect(res.body.data[0].max_score).toBe(40);
      expect(res.body.data[0].status).toBe('approved');
    });

    it('7. DELETE /api/students/:studentId - Blocked if evaluated test submissions exist', async () => {
      const res = await request(app)
        .delete(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot delete student');
      expect(res.body.message).toContain('submissions exist');
    });

    it('7b. DELETE /api/students/:studentId - Successfully deletes student with 0 submissions', async () => {
      // Student 2 (Diya) has 0 submissions
      const res = await request(app)
        .delete(`/api/students/${student2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Student deleted successfully');

      // Verify 404 on subsequent get
      const getRes = await request(app)
        .get(`/api/students/${student2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ==========================================
  // Section 11: Student Auth Portal
  // ==========================================

  describe('Section 11: Student Auth Portal', () => {
    it('9. POST /api/auth/student/login - Student login with admission_no and password sets cookie & JWT', async () => {
      const res = await request(app).post('/api/auth/student/login').send({
        identifier: testStudent1.admission_no,
        password: testStudent1.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.id).toBe(student1Id);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.section_id).toBe(section1Id);

      const rawCookie = res.headers['set-cookie'];
      const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join(';') : String(rawCookie || '');
      expect(cookieHeader).toContain('refreshToken=');

      student1AccessToken = res.body.data.accessToken;
    });

    it('9c. POST /api/auth/student/login - Student login with admission_no field directly', async () => {
      const res = await request(app).post('/api/auth/student/login').send({
        admission_no: testStudent1.admission_no,
        password: testStudent1.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('9b. POST /api/auth/student/login - Invalid password rejected with 401', async () => {
      const res = await request(app).post('/api/auth/student/login').send({
        identifier: testStudent1.admission_no,
        password: 'IncorrectPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('10. POST /api/auth/student/forgot-password - Dispatches reset OTP to registered contact', async () => {
      const res = await request(app).post('/api/auth/student/forgot-password').send({
        admission_no: testStudent1.admission_no,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Password reset OTP sent to registered contact');
      expect(res.body.data).toHaveProperty('otp');
    });

    it('11. POST /api/auth/student/reset-password - Verify OTP and update password', async () => {
      const otpRow = await prisma.otp.findFirst({
        where: { email: testStudent1.contact_email },
        orderBy: { created_at: 'desc' },
      });
      expect(otpRow).toBeDefined();

      const newPassword = 'NewStudentSecurePass789!';

      const resetRes = await request(app).post('/api/auth/student/reset-password').send({
        admission_no: testStudent1.admission_no,
        otp: otpRow?.otp,
        new_password: newPassword,
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.status).toBe('success');
      expect(resetRes.body.message).toBe('Password reset successfully');

      // Old password fails
      const oldLogin = await request(app).post('/api/auth/student/login').send({
        identifier: testStudent1.admission_no,
        password: testStudent1.password,
      });
      expect(oldLogin.status).toBe(401);

      // New password succeeds
      const newLogin = await request(app).post('/api/auth/student/login').send({
        identifier: testStudent1.admission_no,
        password: newPassword,
      });
      expect(newLogin.status).toBe(200);
      student1AccessToken = newLogin.body.data.accessToken;
    });

    it('12. GET /api/student/profile - Authenticated student self profile', async () => {
      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', `Bearer ${student1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(student1Id);
      expect(res.body.data.admission_no).toBe(testStudent1.admission_no);
      expect(res.body.data.section_id).toBe(section1Id);
    });

    it('12b. GET /api/student/profile - Forbidden for non-student roles (403)', async () => {
      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
