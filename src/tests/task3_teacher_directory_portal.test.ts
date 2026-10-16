import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Task 3: Teacher Directory, Subject Allocation & Teacher Auth Portal Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';
  let branchId = '';
  let adminId = '';
  let adminAccessToken = '';
  let academicYearId = '';
  let classId = '';
  let sectionId = '';
  let subject1Id = '';
  let subject2Id = '';
  let classSubject1Id = '';
  let classSubject2Id = '';

  let teacher1Id = '';
  let teacher2Id = '';
  let teacher1AccessToken = '';
  let teacher2AccessToken = '';
  let teacherSubject1Id = '';

  const testCorporate = {
    name: 'Task 3 Academy Corp',
    registration_no: 'REG-TASK3-001',
    admin: {
      name: 'Task3 Corporate SuperAdmin',
      email: 'task3_corp@academy.com',
      mobile: '9666111001',
    },
  };

  const testBranch = {
    name: 'Task3 High School Campus',
    pincode: '500084',
    address: 'Kondapur, Hyderabad',
    branch_contact_mail: 'kondapur@task3.edu',
    mobile_number: '9666111002',
  };

  const testAdmin = {
    admin_name: 'Principal Vernon',
    contact_email: 'vernon@task3.edu',
    mobile: '9666111003',
    role: 'PRINCIPAL',
    password: 'AdminPassword123!',
  };

  const testTeacher1 = {
    name: 'Suresh Raina',
    teacher_id: 'TCH-TASK3-001',
    contact_email: 'suresh.raina@task3.edu',
    contact_mobile: '9666111004',
    password: 'InitialTeacherPassword123!',
  };

  const testTeacher2 = {
    name: 'Mithali Raj',
    teacher_id: 'TCH-TASK3-002',
    contact_email: 'mithali.raj@task3.edu',
    contact_mobile: '9666111005',
    password: 'InitialTeacherPassword123!',
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

    // 5. Create Academic Year, Class, Section, and Subjects for allocations
    const ayRes = await request(app)
      .post(`/api/branch/${branchId}/academic-years`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ start_year: 2026, end_year: 2027, is_active: true });
    academicYearId = ayRes.body.data.id;

    const classRes = await request(app)
      .post(`/api/academic-years/${academicYearId}/classes`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Grade 10', class_order: 10, initial_sections: ['A'] });
    classId = classRes.body.data.id;
    sectionId = classRes.body.data.sections[0].id;

    const sub1Res = await request(app)
      .post(`/api/branch/${branchId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Physics', code: 'PHY-10', grade: '10', board: 'CBSE' });
    subject1Id = sub1Res.body.data.id;

    const sub2Res = await request(app)
      .post(`/api/branch/${branchId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Chemistry', code: 'CHEM-10', grade: '10', board: 'CBSE' });
    subject2Id = sub2Res.body.data.id;

    // Attach Physics & Chemistry to Class 10
    const cs1Res = await request(app)
      .post(`/api/classes/${classId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ subject_id: subject1Id });
    classSubject1Id = cs1Res.body.data.class_subject_id;

    const cs2Res = await request(app)
      .post(`/api/classes/${classId}/subjects`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ subject_id: subject2Id });
    classSubject2Id = cs2Res.body.data.class_subject_id;
  });

  // ==========================================
  // Section 7: Teacher Directory & Subject Mapping
  // ==========================================

  describe('Section 7: Teacher Onboarding, Directory & Subject Allocation', () => {
    it('1. POST /api/branch/:branchId/teachers - Onboard a new teacher with salted password', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/teachers`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testTeacher1);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(testTeacher1.name);
      expect(res.body.data.teacher_id).toBe(testTeacher1.teacher_id);
      expect(res.body.data.contact_email).toBe(testTeacher1.contact_email);
      expect(res.body.data.contact_mobile).toBe(testTeacher1.contact_mobile);
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('password_hash');

      teacher1Id = res.body.data.id;

      // Onboard second teacher
      const res2 = await request(app)
        .post(`/api/branch/${branchId}/teachers`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testTeacher2);
      expect(res2.status).toBe(201);
      teacher2Id = res2.body.data.id;
    });

    it('1b. POST /api/branch/:branchId/teachers - Duplicate teacher_id, email, or mobile rejected with 409 Conflict', async () => {
      const resDuplicate = await request(app)
        .post(`/api/branch/${branchId}/teachers`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testTeacher1);

      expect(resDuplicate.status).toBe(409);
      expect(resDuplicate.body.message).toContain('already exists');
    });

    it('2. GET /api/branch/:branchId/teachers/search - Autocomplete search teachers by name or teacher_id', async () => {
      const searchByName = await request(app)
        .get(`/api/branch/${branchId}/teachers/search?q=Suresh`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(searchByName.status).toBe(200);
      expect(searchByName.body.status).toBe('success');
      expect(Array.isArray(searchByName.body.data)).toBe(true);
      expect(searchByName.body.data.length).toBeGreaterThanOrEqual(1);
      expect(searchByName.body.data[0].name).toBe('Suresh Raina');
      expect(searchByName.body.data[0].teacher_id).toBe('TCH-TASK3-001');
      expect(searchByName.body.data[0].is_class_teacher).toBe(false);

      const searchByCode = await request(app)
        .get(`/api/branch/${branchId}/teachers/search?q=TASK3-002`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(searchByCode.status).toBe(200);
      expect(searchByCode.body.data.length).toBe(1);
      expect(searchByCode.body.data[0].name).toBe('Mithali Raj');
    });

    it('3. GET /api/teachers/:teacherId - Full teacher profile with assigned subjects & sections', async () => {
      const res = await request(app)
        .get(`/api/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(teacher1Id);
      expect(res.body.data.name).toBe(testTeacher1.name);
      expect(Array.isArray(res.body.data.assigned_subjects)).toBe(true);
      expect(Array.isArray(res.body.data.class_teacher_sections)).toBe(true);
    });

    it('4. PUT /api/teachers/:teacherId - Update teacher contact & personal details', async () => {
      const res = await request(app)
        .put(`/api/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Suresh Raina, M.Sc. B.Ed.',
          contact_email: 'suresh.raina.updated@task3.edu',
          contact_mobile: '9666111999',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Suresh Raina, M.Sc. B.Ed.');
      expect(res.body.data.contact_email).toBe('suresh.raina.updated@task3.edu');
      expect(res.body.data.contact_mobile).toBe('9666111999');

      // Update email back for consistent authentication tests later
      await request(app)
        .put(`/api/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ contact_email: testTeacher1.contact_email });
    });

    it('7. POST /api/teachers/:teacherId/subjects - Map teacher to curriculum subject', async () => {
      const res = await request(app)
        .post(`/api/teachers/${teacher1Id}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ subject_id: subject1Id });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('successfully');
      expect(res.body.data.teacher_id).toBe(teacher1Id);
      expect(res.body.data.subject_id).toBe(subject1Id);

      teacherSubject1Id = res.body.data.id;

      // Duplicate mapping should fail with 409
      const dupRes = await request(app)
        .post(`/api/teachers/${teacher1Id}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ subject_id: subject1Id });
      expect(dupRes.status).toBe(409);
    });

    it('6. GET /api/teachers/:teacherId/subjects - Get subjects mapped to teacher', async () => {
      const res = await request(app)
        .get(`/api/teachers/${teacher1Id}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].subject_id).toBe(subject1Id);
      expect(res.body.data[0].subject_name).toBe('Physics');
      expect(res.body.data[0].code).toBe('PHY-10');
    });

    it('9. GET /api/teachers/:teacherId/sections - Sections where teacher is Class Teacher', async () => {
      // Initially, teacher is not a class teacher
      const initialRes = await request(app)
        .get(`/api/teachers/${teacher1Id}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(initialRes.status).toBe(200);
      expect(initialRes.body.data.length).toBe(0);

      // Assign teacher 1 as class teacher for section A
      await request(app)
        .put(`/api/sections/${sectionId}/class-teacher`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ teacher_id: teacher1Id });

      // Now query again
      const afterRes = await request(app)
        .get(`/api/teachers/${teacher1Id}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(afterRes.status).toBe(200);
      expect(afterRes.body.data.length).toBe(1);
      expect(afterRes.body.data[0].section_id).toBe(sectionId);
      expect(afterRes.body.data[0].section_name).toBe('A');
      expect(afterRes.body.data[0].class_id).toBe(classId);
      expect(afterRes.body.data[0].class_name).toBe('Grade 10');

      // Verify autocomplete search now shows is_class_teacher = true
      const searchRes = await request(app)
        .get(`/api/branch/${branchId}/teachers/search?q=Suresh`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(searchRes.body.data[0].is_class_teacher).toBe(true);
    });

    it('5. DELETE /api/teachers/:teacherId - Blocked if actively assigned as Class Teacher or teaches subjects', async () => {
      const res = await request(app)
        .delete(`/api/teachers/${teacher1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot delete teacher');
      expect(res.body.message).toContain('Class Teacher');
    });

    it('8. DELETE /api/teachers/:teacherId/subjects/:subjectId - Unassign teacher from subject', async () => {
      // Map subject 2 to teacher 2
      await request(app)
        .post(`/api/teachers/${teacher2Id}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ subject_id: subject2Id });

      // Delete subject 2 from teacher 2
      const deleteRes = await request(app)
        .delete(`/api/teachers/${teacher2Id}/subjects/${subject2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('successfully');

      // Teacher 2 now has 0 subjects and is not a class teacher, so deletion should succeed
      const deleteTeacher2Res = await request(app)
        .delete(`/api/teachers/${teacher2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(deleteTeacher2Res.status).toBe(200);
      expect(deleteTeacher2Res.body.message).toBe('Teacher deleted successfully');
    });
  });

  // ==========================================
  // Section 9: Teacher Portal & Workflow APIs
  // ==========================================

  describe('Section 9: Teacher Auth Portal & Workflow APIs', () => {
    it('10. POST /api/auth/teacher/login - Login with email and password returns JWT + sets cookie', async () => {
      const res = await request(app).post('/api/auth/teacher/login').send({
        identifier: testTeacher1.contact_email,
        password: testTeacher1.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.id).toBe(teacher1Id);
      expect(res.body.data.user.role).toBe('TEACHER');
      expect(res.body.data.user.branch_id).toBe(branchId);

      const cookieHeader = res.headers['set-cookie']?.join(';') || '';
      expect(cookieHeader).toContain('refreshToken=');

      teacher1AccessToken = res.body.data.accessToken;
    });

    it('10b. POST /api/auth/teacher/login - Login with teacher_id identifier succeeds', async () => {
      const res = await request(app).post('/api/auth/teacher/login').send({
        identifier: testTeacher1.teacher_id,
        password: testTeacher1.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.id).toBe(teacher1Id);
    });

    it('10c. POST /api/auth/teacher/login - Invalid password rejected with 401', async () => {
      const res = await request(app).post('/api/auth/teacher/login').send({
        identifier: testTeacher1.contact_email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('11. POST /api/auth/teacher/forgot-password - Dispatches reset OTP to registered email', async () => {
      const res = await request(app).post('/api/auth/teacher/forgot-password').send({
        identifier: testTeacher1.contact_email,
        branch_id: branchId,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Password reset OTP sent successfully');
      expect(res.body.data).toHaveProperty('otp');
    });

    it('12. POST /api/auth/teacher/reset-password - Verify OTP and update password', async () => {
      // 1. Get OTP
      const otpRow = await prisma.otp.findFirst({
        where: { email: testTeacher1.contact_email },
        orderBy: { created_at: 'desc' },
      });
      expect(otpRow).toBeDefined();

      const newPassword = 'NewTeacherSecurePass999!';

      // 2. Reset password
      const resetRes = await request(app).post('/api/auth/teacher/reset-password').send({
        identifier: testTeacher1.contact_email,
        branch_id: branchId,
        otp: otpRow?.otp,
        new_password: newPassword,
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.status).toBe('success');
      expect(resetRes.body.message).toBe('Password reset successfully');

      // 3. Old password fails
      const failRes = await request(app).post('/api/auth/teacher/login').send({
        identifier: testTeacher1.contact_email,
        password: testTeacher1.password,
      });
      expect(failRes.status).toBe(401);

      // 4. New password succeeds
      const newLoginRes = await request(app).post('/api/auth/teacher/login').send({
        identifier: testTeacher1.contact_email,
        password: newPassword,
      });
      expect(newLoginRes.status).toBe(200);
      teacher1AccessToken = newLoginRes.body.data.accessToken;
    });

    it('13. GET /api/teacher/profile - Authenticated teacher self profile', async () => {
      const res = await request(app)
        .get('/api/teacher/profile')
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(teacher1Id);
      expect(res.body.data.teacher_id).toBe(testTeacher1.teacher_id);
      expect(res.body.data.email).toBe(testTeacher1.contact_email);
      expect(res.body.data.branch_id).toBe(branchId);
    });

    it('13b. GET /api/teacher/profile - Blocked for non-teacher roles (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/teacher/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('14. GET /api/teacher/dashboard - Teacher landing dashboard with teaching allocations and class teacher sections', async () => {
      const res = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('teaching_allocations');
      expect(res.body.data).toHaveProperty('class_teacher_sections');

      // Teaching allocations: Teacher 1 teaches Physics (subject1) which is attached to Class 10 (which has section A)
      expect(res.body.data.teaching_allocations.length).toBeGreaterThanOrEqual(1);
      const alloc = res.body.data.teaching_allocations[0];
      expect(alloc.section_id).toBe(sectionId);
      expect(alloc.section_name).toBe('A');
      expect(alloc.class_id).toBe(classId);
      expect(alloc.class_name).toBe('Grade 10');
      expect(alloc.subject_id).toBe(subject1Id);
      expect(alloc.subject_name).toBe('Physics');
      expect(alloc.class_subject_id).toBe(classSubject1Id);
      expect(alloc.teacher_subject_id).toBe(teacherSubject1Id);

      // Class teacher sections: Section A
      expect(res.body.data.class_teacher_sections.length).toBe(1);
      expect(res.body.data.class_teacher_sections[0].section_id).toBe(sectionId);
      expect(res.body.data.class_teacher_sections[0].section_name).toBe('A');
      expect(res.body.data.class_teacher_sections[0].class_name).toBe('Grade 10');
    });

    it('15. GET /api/teacher/sections/:sectionId/subjects - Specific subjects teacher teaches in designated section', async () => {
      const res = await request(app)
        .get(`/api/teacher/sections/${sectionId}/subjects`)
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].class_subject_id).toBe(classSubject1Id);
      expect(res.body.data[0].teacher_subject_id).toBe(teacherSubject1Id);
      expect(res.body.data[0].subject_name).toBe('Physics');
      expect(res.body.data[0].subject_code).toBe('PHY-10');
    });

    it('15b. GET /api/teacher/sections/:sectionId/subjects - 404 if section does not exist', async () => {
      const res = await request(app)
        .get('/api/teacher/sections/999999999999/subjects')
        .set('Authorization', `Bearer ${teacher1AccessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Section not found');
    });
  });
});
