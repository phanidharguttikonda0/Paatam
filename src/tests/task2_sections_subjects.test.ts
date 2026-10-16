import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Task 2: Sections & Branch Subject Catalog Mapping Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';
  let branchId = '';
  let adminId = '';
  let adminAccessToken = '';
  let academicYearId = '';
  let classId = '';
  let teacherId = '';
  let section1Id = '';
  let section2Id = '';
  let subject1Id = '';
  let subject2Id = '';
  let standaloneSubjectId = '';
  let classSubjectId = '';

  const testCorporate = {
    name: 'Task 2 Test Corp',
    registration_no: 'REG-TASK2-001',
    admin: {
      name: 'Task2 SuperAdmin',
      email: 'task2_super@corp.com',
      mobile: '9777888111',
    },
  };

  const testBranch = {
    name: 'Task2 Main Campus',
    pincode: '500081',
    address: 'Hitech City, Hyderabad',
    branch_contact_mail: 'hitech@task2.edu',
    mobile_number: '9777888222',
  };

  const testAdmin = {
    admin_name: 'Principal Skinner',
    contact_email: 'skinner@task2.edu',
    mobile: '9777888333',
    role: 'PRINCIPAL',
    password: 'SecurePassword123!',
  };

  beforeAll(async () => {
    // 1. Send OTP & verify
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

    // 2. Create Corporate & Login
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

    // 3. Create Branch
    const bRes = await request(app)
      .post('/api/branch/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testBranch);
    branchId = bRes.body.data.id;

    // 4. Create Branch Admin & assign branch
    const adminRes = await request(app)
      .post('/api/admin/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testAdmin);
    adminId = adminRes.body.data.id;

    await request(app)
      .post(`/api/admin/${adminId}/assign-branches`)
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send({ branch_ids: [branchId] });

    // 5. Login Branch Admin
    const adminLoginRes = await request(app).post('/api/auth/admin/login').send({
      identifier: testAdmin.contact_email,
      password: testAdmin.password,
    });
    adminAccessToken = adminLoginRes.body.data.accessToken;

    // 6. Create Academic Year
    const ayRes = await request(app)
      .post(`/api/branch/${branchId}/academic-years`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      });
    academicYearId = ayRes.body.data.id;

    // 7. Create Class with initial section 'A'
    const classRes = await request(app)
      .post(`/api/academic-years/${academicYearId}/classes`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Grade 10',
        class_order: 10,
        initial_sections: ['A'],
      });
    classId = classRes.body.data.id;
    section1Id = classRes.body.data.sections[0].id;

    // 8. Create a test teacher in this branch directly
    const tId = idGenerator.nextId();
    const teacher = await prisma.teacher.create({
      data: {
        id: tId,
        branch_id: BigInt(branchId),
        name: 'Suresh Raina',
        teacher_id: 'TCH-001',
        password_hash: 'hashedpassword',
        contact_email: 'suresh@task2.edu',
        contact_mobile: '9876500001',
      },
    });
    teacherId = teacher.id.toString();
  });

  describe('1. Section Management & Class Teacher Allocation', () => {
    it('GET /api/classes/:classId/sections - should return list of sections', async () => {
      const res = await request(app)
        .get(`/api/classes/${classId}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].section_name).toBe('A');
    });

    it('POST /api/classes/:classId/sections - should fail with 400 when section_name is empty', async () => {
      const res = await request(app)
        .post(`/api/classes/${classId}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          section_name: '',
          strength: 40,
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/classes/:classId/sections - should successfully create a new section', async () => {
      const res = await request(app)
        .post(`/api/classes/${classId}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          section_name: 'B',
          strength: 45,
          class_teacher_id: teacherId,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.section_name).toBe('B');
      expect(res.body.data.strength).toBe(45);
      expect(res.body.data.class_teacher_id).toBe(teacherId);
      section2Id = res.body.data.id;
    });

    it('POST /api/classes/:classId/sections - should fail with 400 for duplicate section name in class', async () => {
      const res = await request(app)
        .post(`/api/classes/${classId}/sections`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          section_name: 'B',
          strength: 40,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Section name already exists in this class');
    });

    it('GET /api/sections/:sectionId - should return full section details with teacher', async () => {
      const res = await request(app)
        .get(`/api/sections/${section2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.section_name).toBe('B');
      expect(res.body.data.strength).toBe(45);
      expect(res.body.data.class.name).toBe('Grade 10');
      expect(res.body.data.class_teacher.name).toBe('Suresh Raina');
    });

    it('PUT /api/sections/:sectionId - should update section name and strength', async () => {
      const res = await request(app)
        .put(`/api/sections/${section1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          section_name: 'A-Star',
          strength: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.section_name).toBe('A-Star');
      expect(res.body.data.strength).toBe(50);
    });

    it('PUT /api/sections/:sectionId/class-teacher - should assign class teacher to section', async () => {
      const res = await request(app)
        .put(`/api/sections/${section1Id}/class-teacher`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          teacher_id: teacherId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.class_teacher_id).toBe(teacherId);
      expect(res.body.data.teacher_name).toBe('Suresh Raina');
    });

    it('DELETE /api/sections/:sectionId/class-teacher - should unassign class teacher', async () => {
      const res = await request(app)
        .delete(`/api/sections/${section1Id}/class-teacher`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Class teacher unassigned from section');
    });

    it('DELETE /api/sections/:sectionId - should fail with 400 when students are enrolled', async () => {
      // Create student enrolled in section 1
      await prisma.student.create({
        data: {
          id: idGenerator.nextId(),
          section_id: BigInt(section1Id),
          admission_no: 'ADM-001',
          name: 'Rahul Dravid',
          roll_no: '101',
          password_hash: 'hashedpassword',
        },
      });

      const res = await request(app)
        .delete(`/api/sections/${section1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('students are currently enrolled in this section');
    });

    it('DELETE /api/sections/:sectionId - should successfully delete empty section', async () => {
      const res = await request(app)
        .delete(`/api/sections/${section2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Section deleted successfully');

      const checkRes = await request(app)
        .get(`/api/sections/${section2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('2. Branch Subject Catalog & Class-Subject Mapping', () => {
    it('POST /api/branch/:branchId/subjects - should fail with 400 when name is empty', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: '',
          code: 'PHY-10',
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/branch/:branchId/subjects - should create master subjects in branch catalog', async () => {
      const res1 = await request(app)
        .post(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Physics',
          code: 'PHY-10',
          grade: 'Grade 10',
          board: 'CBSE',
          description: 'Mechanics and Electricity',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('success');
      expect(res1.body.data.name).toBe('Physics');
      subject1Id = res1.body.data.id;

      const res2 = await request(app)
        .post(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Chemistry',
          code: 'CHM-10',
          grade: 'Grade 10',
          board: 'CBSE',
          description: 'Organic & Inorganic',
        });

      expect(res2.status).toBe(201);
      subject2Id = res2.body.data.id;

      const res3 = await request(app)
        .post(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'History',
          code: 'HIS-10',
          grade: 'Grade 10',
          board: 'CBSE',
        });
      standaloneSubjectId = res3.body.data.id;
    });

    it('POST /api/branch/:branchId/subjects - should fail with 400 for duplicate name and grade', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Physics',
          grade: 'Grade 10',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject with this name and grade already exists in this branch');
    });

    it('GET /api/branch/:branchId/subjects - should return paginated branch subjects catalog', async () => {
      const res = await request(app)
        .get(`/api/branch/${branchId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(3);
      expect(res.body.meta).toBeDefined();
    });

    it('PUT /api/subjects/:subjectId - should update subject metadata', async () => {
      const res = await request(app)
        .put(`/api/subjects/${subject1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Advanced Physics',
          code: 'PHY-10-ADV',
          description: 'Updated Mechanics and Quantum',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Advanced Physics');
      expect(res.body.data.code).toBe('PHY-10-ADV');
    });

    it('POST /api/classes/:classId/subjects - should attach subject to class', async () => {
      const res = await request(app)
        .post(`/api/classes/${classId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          subject_id: subject1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.subject_id).toBe(subject1Id);
      classSubjectId = res.body.data.class_subject_id;
    });

    it('POST /api/classes/:classId/subjects - should fail with 409 if already attached', async () => {
      const res = await request(app)
        .post(`/api/classes/${classId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          subject_id: subject1Id,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Subject is already attached to this class');
    });

    it('GET /api/classes/:classId/subjects - should list attached subjects for class', async () => {
      const res = await request(app)
        .get(`/api/classes/${classId}/subjects`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].subject_id).toBe(subject1Id);
    });

    it('GET /api/sections/:sectionId/subjects-teachers - should return matrix of subjects with assigned teachers', async () => {
      // Map teacher to subject 1
      await prisma.teacherSubject.create({
        data: {
          id: idGenerator.nextId(),
          teacher_id: BigInt(teacherId),
          subject_id: BigInt(subject1Id),
        },
      });

      const res = await request(app)
        .get(`/api/sections/${section1Id}/subjects-teachers`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].class_subject_id).toBe(classSubjectId);
      expect(res.body.data[0].assigned_teacher).not.toBeNull();
      expect(res.body.data[0].assigned_teacher.name).toBe('Suresh Raina');
    });

    it('DELETE /api/classes/:classId/subjects/:classSubjectId - should fail with 400 when assignments exist', async () => {
      const tsRow = await prisma.teacherSubject.findFirst({
        where: { teacher_id: BigInt(teacherId), subject_id: BigInt(subject1Id) },
      });

      // Create an assignment referencing classSubjectId
      await prisma.assignment.create({
        data: {
          id: idGenerator.nextId(),
          section_id: BigInt(section1Id),
          class_subject_id: BigInt(classSubjectId),
          teacher_subject_id: tsRow!.id,
          title: 'Physics Midterm Quiz',
          question_paper_url: 'https://s3.amazonaws.com/paatam/quiz.pdf',
        },
      });

      const res = await request(app)
        .delete(`/api/classes/${classId}/subjects/${classSubjectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('assignments have been created under this class subject');
    });

    it('DELETE /api/subjects/:subjectId - should fail with 400 if attached to classes or teachers', async () => {
      const res = await request(app)
        .delete(`/api/subjects/${subject1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('currently attached to');
    });

    it('DELETE /api/subjects/:subjectId - should successfully delete unattached subject', async () => {
      const res = await request(app)
        .delete(`/api/subjects/${standaloneSubjectId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Subject deleted successfully');
    });
  });
});
