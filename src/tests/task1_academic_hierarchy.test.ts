import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';

describe('Task 1: Academic Structural Hierarchy Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';
  let branchId = '';
  let branch2Id = '';
  let adminId = '';
  let adminAccessToken = '';
  let academicYear1Id = '';
  let academicYear2Id = '';
  let classWithSectionsId = '';
  let standaloneClassId = '';

  const testCorporate = {
    name: 'Task 1 Test Corp',
    registration_no: 'REG-TASK1-001',
    admin: {
      name: 'Task1 SuperAdmin',
      email: 'task1_super@corp.com',
      mobile: '9888777111',
    },
  };

  const testBranch1 = {
    name: 'Whitefield Campus',
    pincode: '560066',
    address: 'Whitefield Main Road',
    branch_contact_mail: 'whitefield@task1.edu',
    mobile_number: '9888777222',
  };

  const testBranch2 = {
    name: 'Indiranagar Campus',
    pincode: '560038',
    address: '100ft Road',
    branch_contact_mail: 'indiranagar@task1.edu',
    mobile_number: '9888777333',
  };

  const testAdmin = {
    admin_name: 'Dr. Jane Principal',
    contact_email: 'principal.jane@task1.edu',
    mobile: '9888777444',
    role: 'PRINCIPAL',
    password: 'SecurePassword123!',
  };

  beforeAll(async () => {
    // 1. Send OTP & verify to register Corporate
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

    // 3. Create Branches
    const b1Res = await request(app)
      .post('/api/branch/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testBranch1);
    branchId = b1Res.body.data.id;

    const b2Res = await request(app)
      .post('/api/branch/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testBranch2);
    branch2Id = b2Res.body.data.id;

    // 4. Create Branch Admin
    const adminRes = await request(app)
      .post('/api/admin/create')
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send(testAdmin);
    adminId = adminRes.body.data.id;

    // Assign branches to admin
    await request(app)
      .post(`/api/admin/${adminId}/assign-branches`)
      .set('Authorization', `Bearer ${corporateAccessToken}`)
      .send({ branch_ids: [branchId, branch2Id] });

    // 5. Login Branch Admin
    const adminLoginRes = await request(app).post('/api/auth/admin/login').send({
      identifier: testAdmin.contact_email,
      password: testAdmin.password,
    });
    adminAccessToken = adminLoginRes.body.data.accessToken;
  });

  describe('1. Branch & Admin Management Extensions', () => {
    it('GET /api/branch/corporate/search - should fail with 400 when query parameter q is missing', async () => {
      const res = await request(app)
        .get('/api/branch/corporate/search')
        .set('Authorization', `Bearer ${corporateAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('GET /api/branch/corporate/search - should return matching branches when q is provided', async () => {
      const res = await request(app)
        .get('/api/branch/corporate/search?q=Whitefield')
        .set('Authorization', `Bearer ${corporateAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Whitefield');
    });

    it('GET /api/branch-admin/my-branches - should fail with 401 without auth token', async () => {
      const res = await request(app).get('/api/branch-admin/my-branches');
      expect(res.status).toBe(401);
    });

    it('GET /api/branch-admin/my-branches - should fail with 403 when called by corporate admin', async () => {
      const res = await request(app)
        .get('/api/branch-admin/my-branches')
        .set('Authorization', `Bearer ${corporateAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/branch-admin/my-branches - should return assigned branches for logged-in branch admin', async () => {
      const res = await request(app)
        .get('/api/branch-admin/my-branches')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].role_in_branch).toBe('PRINCIPAL');
    });

    it('GET /api/branch-admin/profile - should return logged-in branch admin profile', async () => {
      const res = await request(app)
        .get('/api/branch-admin/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.admin_name).toBe(testAdmin.admin_name);
      expect(res.body.data.contact_email).toBe(testAdmin.contact_email);
      expect(res.body.data.assigned_branches_count).toBe(2);
    });

    it('DELETE /api/branch/:branchId/admins/:adminId - should remove single branch assignment', async () => {
      const res = await request(app)
        .delete(`/api/branch/${branch2Id}/admins/${adminId}`)
        .set('Authorization', `Bearer ${corporateAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Admin access removed from branch successfully');

      // Verify branch 2 is no longer in my-branches
      const branchesRes = await request(app)
        .get('/api/branch-admin/my-branches')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(branchesRes.body.data.length).toBe(1);
      expect(branchesRes.body.data[0].id).toBe(branchId);
    });

    it('DELETE /api/branch/:branchId/admins/:adminId - should return 404 for unassigned admin', async () => {
      const res = await request(app)
        .delete(`/api/branch/${branch2Id}/admins/${adminId}`)
        .set('Authorization', `Bearer ${corporateAccessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('2. Academic Year Management', () => {
    it('POST /api/branch/:branchId/academic-years - should fail with 400 if end_year != start_year + 1', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/academic-years`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          start_year: 2026,
          end_year: 2028,
          is_active: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('end_year must be start_year + 1');
    });

    it('POST /api/branch/:branchId/academic-years - should create active academic year', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/academic-years`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          start_year: 2026,
          end_year: 2027,
          is_active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.start_year).toBe(2026);
      expect(res.body.data.end_year).toBe(2027);
      expect(res.body.data.is_active).toBe(true);
      academicYear1Id = res.body.data.id;
    });

    it('POST /api/branch/:branchId/academic-years - should fail with 409 if year already exists', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/academic-years`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          start_year: 2026,
          end_year: 2027,
          is_active: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists for this branch');
    });

    it('POST /api/branch/:branchId/academic-years - creating new active year deactivates previous year', async () => {
      const res = await request(app)
        .post(`/api/branch/${branchId}/academic-years`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          start_year: 2027,
          end_year: 2028,
          is_active: true,
        });

      expect(res.status).toBe(201);
      academicYear2Id = res.body.data.id;

      // Verify academicYear1 is now inactive
      const prevYear = await prisma.academicYear.findUnique({
        where: { id: BigInt(academicYear1Id) },
      });
      expect(prevYear?.is_active).toBe(false);
    });

    it('GET /api/branch/:branchId/academic-years - should return paginated academic years with active first', async () => {
      const res = await request(app)
        .get(`/api/branch/${branchId}/academic-years`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].id).toBe(academicYear2Id);
      expect(res.body.data[0].is_active).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('PUT /api/academic-years/:id - should reactivate academicYear1 and deactivate academicYear2', async () => {
      const res = await request(app)
        .put(`/api/academic-years/${academicYear1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          is_active: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(true);

      const year2 = await prisma.academicYear.findUnique({
        where: { id: BigInt(academicYear2Id) },
      });
      expect(year2?.is_active).toBe(false);
    });
  });

  describe('3. Class Management', () => {
    it('POST /api/academic-years/:academicYearId/classes - should fail with 400 if class name is empty', async () => {
      const res = await request(app)
        .post(`/api/academic-years/${academicYear1Id}/classes`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: '',
          class_order: 10,
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/academic-years/:academicYearId/classes - should create class with initial sections', async () => {
      const res = await request(app)
        .post(`/api/academic-years/${academicYear1Id}/classes`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Grade 10',
          class_order: 10,
          initial_sections: ['A', 'B'],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Grade 10');
      expect(res.body.data.sections.length).toBe(2);
      expect(res.body.data.sections[0].section_name).toBe('A');
      classWithSectionsId = res.body.data.id;
    });

    it('POST /api/academic-years/:academicYearId/classes - should fail with 400 for duplicate class name', async () => {
      const res = await request(app)
        .post(`/api/academic-years/${academicYear1Id}/classes`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Grade 10',
          class_order: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Class name already exists in this academic year');
    });

    it('POST /api/academic-years/:academicYearId/classes - should create standalone class without sections', async () => {
      const res = await request(app)
        .post(`/api/academic-years/${academicYear1Id}/classes`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Grade 9',
          class_order: 9,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Grade 9');
      standaloneClassId = res.body.data.id;
    });

    it('GET /api/academic-years/:academicYearId/classes - should list classes ordered by class_order', async () => {
      const res = await request(app)
        .get(`/api/academic-years/${academicYear1Id}/classes`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe('Grade 9');
      expect(res.body.data[0].class_order).toBe(9);
      expect(res.body.data[1].name).toBe('Grade 10');
      expect(res.body.data[1].sections_count).toBe(2);
    });

    it('GET /api/classes/:classId - should return full class details including sections and subjects', async () => {
      const res = await request(app)
        .get(`/api/classes/${classWithSectionsId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Grade 10');
      expect(res.body.data.academic_year.start_year).toBe(2026);
      expect(res.body.data.sections.length).toBe(2);
    });

    it('PUT /api/classes/:classId - should update class name and class_order', async () => {
      const res = await request(app)
        .put(`/api/classes/${standaloneClassId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Grade 9 - Advanced',
          class_order: 8,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Grade 9 - Advanced');
      expect(res.body.data.class_order).toBe(8);
    });

    it('PUT /api/classes/:classId - should fail with 400 if updating to an existing class name in same year', async () => {
      const res = await request(app)
        .put(`/api/classes/${standaloneClassId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Grade 10',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Class name already exists in this academic year');
    });

    it('DELETE /api/classes/:classId - should fail with 400 when sections exist', async () => {
      const res = await request(app)
        .delete(`/api/classes/${classWithSectionsId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete class: sections are linked to this class');
    });

    it('DELETE /api/classes/:classId - should successfully delete class without sections', async () => {
      const res = await request(app)
        .delete(`/api/classes/${standaloneClassId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Class deleted successfully');

      // Verify class is deleted
      const checkRes = await request(app)
        .get(`/api/classes/${standaloneClassId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(checkRes.status).toBe(404);
    });

    it('DELETE /api/academic-years/:id - should fail with 400 when classes exist in session', async () => {
      const res = await request(app)
        .delete(`/api/academic-years/${academicYear1Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        'Cannot delete academic year: active classes are linked to this session'
      );
    });

    it('DELETE /api/academic-years/:id - should successfully delete academic year with 0 classes', async () => {
      const res = await request(app)
        .delete(`/api/academic-years/${academicYear2Id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Academic year deleted successfully');
    });
  });
});
