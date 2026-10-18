import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/role.enum';

describe('Branch Admin Forgot Password & Student Password Reset Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';

  let branch1Id = '';
  let branch2Id = '';
  let branch1AdminId = '';
  let branch1AdminAccessToken = '';
  let branch2AdminId = '';
  let branch2AdminAccessToken = '';

  let classTeacherId = '';
  let classTeacherAccessToken = '';
  let regularTeacherId = '';
  let regularTeacherAccessToken = '';

  let sectionId = '';
  let studentId = '';

  beforeAll(async () => {
    // 1. Create Corporate and CorporateAdmin (Purely OTP-based login)
    const corpId = idGenerator.nextId();
    corporateId = corpId.toString();

    await prisma.corporate.create({
      data: {
        id: corpId,
        name: 'Paatam Central Academy Corp',
        registration_no: 'REG-BRANCH-PWD-TEST-001',
      },
    });

    const corpAdminId = idGenerator.nextId();

    await prisma.corporateAdmin.create({
      data: {
        id: corpAdminId,
        corporate_id: corpId,
        name: 'Central Corp Admin',
        email: 'central_corp@paatam.edu',
        mobile: '9888222001',
      },
    });

    corporateAccessToken = AuthService.generateAccessToken(
      corpAdminId,
      UserRole.CORPORATE_ADMIN,
      corpId
    );

    // 2. Create Two Branches
    const b1Id = idGenerator.nextId();
    branch1Id = b1Id.toString();
    await prisma.branch.create({
      data: {
        id: b1Id,
        corporate_id: corpId,
        name: 'Campus Alpha',
        pincode: '500081',
        address: 'Hitech City, Hyderabad',
        branch_contact_mail: 'alpha@paatam.edu',
        mobile_number: '9888222002',
      },
    });

    const b2Id = idGenerator.nextId();
    branch2Id = b2Id.toString();
    await prisma.branch.create({
      data: {
        id: b2Id,
        corporate_id: corpId,
        name: 'Campus Beta',
        pincode: '500082',
        address: 'Madhapur, Hyderabad',
        branch_contact_mail: 'beta@paatam.edu',
        mobile_number: '9888222003',
      },
    });

    // 3. Create Branch Admins
    const b1AdmId = idGenerator.nextId();
    branch1AdminId = b1AdmId.toString();
    const adminPassHash = await bcrypt.hash('BranchAdminPass123!', 10);

    await prisma.admin.create({
      data: {
        id: b1AdmId,
        corporate_id: corpId,
        admin_name: 'Alpha Principal',
        contact_email: 'alpha_principal@paatam.edu',
        mobile: '9888222004',
        role: 'PRINCIPAL',
        password_hash: adminPassHash,
      },
    });

    await prisma.adminBranchAccess.create({
      data: {
        id: idGenerator.nextId(),
        admin_id: b1AdmId,
        branch_id: b1Id,
      },
    });

    branch1AdminAccessToken = AuthService.generateAccessToken(b1AdmId, 'PRINCIPAL', corpId);

    const b2AdmId = idGenerator.nextId();
    branch2AdminId = b2AdmId.toString();

    await prisma.admin.create({
      data: {
        id: b2AdmId,
        corporate_id: corpId,
        admin_name: 'Beta Principal',
        contact_email: 'beta_principal@paatam.edu',
        mobile: '9888222005',
        role: 'PRINCIPAL',
        password_hash: adminPassHash,
      },
    });

    await prisma.adminBranchAccess.create({
      data: {
        id: idGenerator.nextId(),
        admin_id: b2AdmId,
        branch_id: b2Id,
      },
    });

    branch2AdminAccessToken = AuthService.generateAccessToken(b2AdmId, 'PRINCIPAL', corpId);

    // 4. Create Teachers in Campus Alpha
    const ctId = idGenerator.nextId();
    classTeacherId = ctId.toString();
    const teacherPassHash = await bcrypt.hash('TeacherPass123!', 10);

    await prisma.teacher.create({
      data: {
        id: ctId,
        branch_id: b1Id,
        teacher_id: 'TCH-ALPHA-001',
        name: 'Class Teacher Sharma',
        contact_email: 'sharma@paatam.edu',
        contact_mobile: '9888222006',
        password_hash: teacherPassHash,
      },
    });

    classTeacherAccessToken = AuthService.generateAccessToken(ctId, UserRole.TEACHER);

    const regTchId = idGenerator.nextId();
    regularTeacherId = regTchId.toString();

    await prisma.teacher.create({
      data: {
        id: regTchId,
        branch_id: b1Id,
        teacher_id: 'TCH-ALPHA-002',
        name: 'Subject Teacher Verma',
        contact_email: 'verma@paatam.edu',
        contact_mobile: '9888222007',
        password_hash: teacherPassHash,
      },
    });

    regularTeacherAccessToken = AuthService.generateAccessToken(regTchId, UserRole.TEACHER);

    // 5. Create Academic Year, Class, Section with Class Teacher assigned
    const acadId = idGenerator.nextId();
    await prisma.academicYear.create({
      data: {
        id: acadId,
        branch_id: b1Id,
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      },
    });

    const clsId = idGenerator.nextId();
    await prisma.class.create({
      data: {
        id: clsId,
        branch_id: b1Id,
        academic_year_id: acadId,
        name: 'Grade 10',
        class_order: 10,
      },
    });

    const secId = idGenerator.nextId();
    sectionId = secId.toString();
    await prisma.section.create({
      data: {
        id: secId,
        class_id: clsId,
        class_teacher_id: ctId, // Assigned to Class Teacher Sharma
        section_name: 'Section A',
        strength: 1,
      },
    });

    // 6. Create Student in Section A
    const sId = idGenerator.nextId();
    studentId = sId.toString();
    const initialStudentHash = await bcrypt.hash('InitialStudentPwd123!', 10);

    await prisma.student.create({
      data: {
        id: sId,
        section_id: secId,
        admission_no: 'ADM-ALPHA-2001',
        name: 'Arjun Reddy',
        roll_no: '101',
        password_hash: initialStudentHash,
        contact_email: 'arjun@paatam.edu',
        contact_mobile: '9888222008',
      },
    });
  });

  describe('API 1: Branch Admin Forgot Password & Reset Flow', () => {
    let resetOtp = '';

    it('1. POST /api/auth/admin/forgot-password - Validates missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/admin/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('2. POST /api/auth/admin/forgot-password - Returns 404 for unknown branch admin', async () => {
      const res = await request(app)
        .post('/api/auth/admin/forgot-password')
        .send({
          identifier: 'unknown_admin@nowhere.com',
          corporateId: corporateId,
        });

      expect(res.status).toBe(404);
    });

    it('3. POST /api/auth/admin/forgot-password - Successfully dispatches reset OTP', async () => {
      const res = await request(app)
        .post('/api/auth/admin/forgot-password')
        .send({
          identifier: 'alpha_principal@paatam.edu',
          corporateId: corporateId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Password reset OTP sent');
      expect(res.body.data.otp).toBeDefined();
      resetOtp = res.body.data.otp;
    });

    it('4. POST /api/auth/admin/reset-password - Rejects invalid OTP', async () => {
      const res = await request(app)
        .post('/api/auth/admin/reset-password')
        .send({
          identifier: 'alpha_principal@paatam.edu',
          corporateId: corporateId,
          otp: '999999',
          new_password: 'NewBranchPrincipalPass123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid or expired OTP');
    });

    it('5. POST /api/auth/admin/reset-password - Successfully resets password with valid OTP', async () => {
      const res = await request(app)
        .post('/api/auth/admin/reset-password')
        .send({
          identifier: 'alpha_principal@paatam.edu',
          corporateId: corporateId,
          otp: resetOtp,
          new_password: 'NewBranchPrincipalPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Password has been reset successfully');
    });

    it('6. POST /api/auth/admin/login - Authenticates using new password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          identifier: 'alpha_principal@paatam.edu',
          password: 'NewBranchPrincipalPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('PRINCIPAL');
    });

    it('7. POST /api/auth/branch-admin/forgot-password - Alias route works', async () => {
      const res = await request(app)
        .post('/api/auth/branch-admin/forgot-password')
        .send({
          identifier: 'alpha_principal@paatam.edu',
          corporateId: corporateId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Corporate Admin OTP-Based Login Flow (Passwordless)', () => {
    let loginOtp = '';

    it('1. POST /api/auth/corporate/login - Dispatches OTP to corporate admin', async () => {
      const res = await request(app)
        .post('/api/auth/corporate/login')
        .send({
          email: 'central_corp@paatam.edu',
          corporateId: corporateId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Login OTP sent successfully');
      expect(res.body.data.otp).toBeDefined();
      loginOtp = res.body.data.otp;
    });

    it('2. POST /api/auth/corporate/verify - Verifies OTP and returns access token', async () => {
      const res = await request(app)
        .post('/api/auth/corporate/verify')
        .send({
          email: 'central_corp@paatam.edu',
          corporateId: corporateId,
          otp: loginOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe(UserRole.CORPORATE_ADMIN);
    });
  });

  describe('API 2: Student Password Update by Branch Admin / Class Teacher', () => {
    it('1. PUT /api/students/:studentId/password - Rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .send({ new_password: 'NewSecretPass123!' });

      expect(res.status).toBe(401);
    });

    it('2. PUT /api/students/:studentId/password - Rejects short password (< 6 chars) with 400', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${branch1AdminAccessToken}`)
        .send({ new_password: '123' });

      expect(res.status).toBe(400);
    });

    it('3. PUT /api/students/:studentId/password - Rejects teacher who is NOT class teacher with 403', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${regularTeacherAccessToken}`)
        .send({ new_password: 'UnauthorizedReset123!' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the assigned class teacher');
    });

    it('4. PUT /api/students/:studentId/password - Allows assigned Class Teacher to reset student password', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${classTeacherAccessToken}`)
        .send({ new_password: 'TeacherResetPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Student password updated successfully');

      // Verify student can log in with new password
      const loginRes = await request(app)
        .post('/api/auth/student/login')
        .send({
          admission_no: 'ADM-ALPHA-2001',
          password: 'TeacherResetPass123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('5. PUT /api/students/:studentId/password - Rejects Branch Admin from another branch with 403', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${branch2AdminAccessToken}`)
        .send({ new_password: 'CrossBranchReset123!' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('6. PUT /api/students/:studentId/password - Allows Branch Admin of that branch to update password', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${branch1AdminAccessToken}`)
        .send({ new_password: 'AdminResetPass456!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify student can log in with newly updated password
      const loginRes = await request(app)
        .post('/api/auth/student/login')
        .send({
          admission_no: 'ADM-ALPHA-2001',
          password: 'AdminResetPass456!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('7. PUT /api/students/:studentId/password - Allows Corporate Admin to update password', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}/password`)
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send({ new_password: 'CorporateResetPass789!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify student can log in with corporate-reset password
      const loginRes = await request(app)
        .post('/api/auth/student/login')
        .send({
          admission_no: 'ADM-ALPHA-2001',
          password: 'CorporateResetPass789!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });
  });
});
