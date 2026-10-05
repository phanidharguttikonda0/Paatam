import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';

describe('Branch and Branch Admin Integration Tests', () => {
  let corporateId = '';
  let corporateAccessToken = '';
  let branchId = '';
  let adminId = '';
  let adminAccessToken = '';

  const testCorporate = {
    name: 'School Corp Inc',
    registration_no: 'REG-SCH-100',
    admin: {
      name: 'Super Admin',
      email: 'super@schoolcorp.com',
      mobile: '9998887771',
    },
  };

  const testBranch = {
    name: 'Main Campus',
    pincode: '500081',
    address: 'City Center',
    branch_contact_mail: 'contact@maincampus.com',
    mobile_number: '8887776660'
  };

  const testAdmin = {
    admin_name: 'Principal Skinner',
    contact_email: 'skinner@maincampus.com',
    mobile: '1231231234',
    role: 'PRINCIPAL',
    password: 'SecurePassword123'
  };

  beforeAll(async () => {
    // 1. Send OTP
    await request(app).post('/api/auth/send-otp').send({ email: testCorporate.admin.email, mobile: testCorporate.admin.mobile });
    const otpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
    
    // 2. Verify OTP
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ email: testCorporate.admin.email, mobile: testCorporate.admin.mobile, otp: otpRow?.otp });
    const verificationToken = verifyRes.body.data.verificationToken;

    // 3. Create Corporate
    const createRes = await request(app).post('/api/corporate/create').send({ ...testCorporate, verificationToken });
    
    // 4. Lookup Corporate
    const lookupRes = await request(app).get(`/api/corporate/lookup/${testCorporate.registration_no}`);
    corporateId = lookupRes.body.data.corporateId;

    // 5. Login Corporate Admin
    await request(app).post('/api/auth/corporate/login').send({ email: testCorporate.admin.email, corporateId });
    const loginOtpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
    const loginRes = await request(app).post('/api/auth/corporate/verify').send({ email: testCorporate.admin.email, corporateId, otp: loginOtpRow?.otp });
    
    corporateAccessToken = loginRes.body.data.accessToken;
  });

  describe('1. Branch Creation', () => {
    it('should fail to create branch if unauthorized', async () => {
      const res = await request(app)
        .post('/api/branch/create')
        .send(testBranch);
      
      expect(res.status).toBe(401);
    });

    it('should create a branch successfully with CORPORATE_ADMIN token', async () => {
      const res = await request(app)
        .post('/api/branch/create')
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send(testBranch);
      
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(testBranch.name);
      expect(res.body.data.corporate_id.toString()).toBe(corporateId);
      
      branchId = res.body.data.id;
    });

    it('should fail to create branch with same name', async () => {
      const res = await request(app)
        .post('/api/branch/create')
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send(testBranch);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('2. Branch Admin Creation', () => {
    it('should create a branch admin successfully', async () => {
      const res = await request(app)
        .post('/api/admin/create')
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send(testAdmin);
      
      expect(res.status).toBe(201);
      expect(res.body.data.admin_name).toBe(testAdmin.admin_name);
      expect(res.body.data.corporate_id.toString()).toBe(corporateId);
      
      adminId = res.body.data.id;
    });

    it('should fail to create admin with duplicate email', async () => {
      const res = await request(app)
        .post('/api/admin/create')
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send({ ...testAdmin, mobile: '0000000000' }); // different mobile, same email
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('3. Admin Branch Assignment', () => {
    it('should fail to assign a branch that belongs to another corporate', async () => {
      // Fake a branch from another corporate
      const fakeCorporate = await prisma.corporate.create({
        data: { id: idGenerator.nextId(), name: 'Fake Corp', registration_no: 'FAKE-123' }
      });
      const fakeBranch = await prisma.branch.create({
        data: { id: idGenerator.nextId(), corporate_id: fakeCorporate.id, name: 'Fake Branch', pincode: '123456', address: 'Fake', branch_contact_mail: 'fake@fake.com', mobile_number: '1234567890' }
      });

      const res = await request(app)
        .post(`/api/admin/${adminId}/assign-branches`)
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send({ branch_ids: [fakeBranch.id.toString()] });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invalid or do not belong to your corporate');
    });

    it('should assign a valid branch successfully', async () => {
      const res = await request(app)
        .post(`/api/admin/${adminId}/assign-branches`)
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send({ branch_ids: [branchId] });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Branches assigned successfully');
    });
  });

  describe('4. Retrieval APIs', () => {
    it('should get all admins for the corporate', async () => {
      const res = await request(app)
        .get('/api/admin/corporate/all')
        .set('Authorization', `Bearer ${corporateAccessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(adminId);
      expect(res.body.data[0].corporate_id.toString()).toBe(corporateId);
    });

    it('should get branches assigned to admin', async () => {
      const res = await request(app)
        .get(`/api/admin/${adminId}/branches`)
        .set('Authorization', `Bearer ${corporateAccessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(branchId);
    });

    it('should get admins assigned to branch', async () => {
      const res = await request(app)
        .get(`/api/branch/${branchId}/admins`)
        .set('Authorization', `Bearer ${corporateAccessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(adminId);
    });
  });

  describe('5. Branch Admin Login', () => {
    it('should fail to login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ identifier: testAdmin.contact_email, password: 'WrongPassword' });
      
      expect(res.status).toBe(401);
    });

    it('should login successfully with correct password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ identifier: testAdmin.contact_email, password: testAdmin.password });
      
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('PRINCIPAL');

      adminAccessToken = res.body.data.accessToken;
    });

    it('should fail to access CORPORATE_ADMIN only route with PRINCIPAL token', async () => {
      const res = await request(app)
        .post('/api/branch/create')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testBranch);
      
      expect(res.status).toBe(403);
    });
  });

  describe('6. Update and Delete Admin', () => {
    it('should update admin details', async () => {
      const res = await request(app)
        .put(`/api/admin/${adminId}`)
        .set('Authorization', `Bearer ${corporateAccessToken}`)
        .send({ admin_name: 'Superintendent Chalmers' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.admin_name).toBe('Superintendent Chalmers');
    });

    it('should delete admin successfully', async () => {
      const res = await request(app)
        .delete(`/api/admin/${adminId}`)
        .set('Authorization', `Bearer ${corporateAccessToken}`);
      
      expect(res.status).toBe(200);

      // Verify deletion
      const adminsRes = await request(app)
        .get('/api/admin/corporate/all')
        .set('Authorization', `Bearer ${corporateAccessToken}`);
      
      expect(adminsRes.body.data.find((a: any) => a.id === adminId)).toBeUndefined();
    });
  });
});
