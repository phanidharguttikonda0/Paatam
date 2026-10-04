import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';

describe('Corporate Flow Integration Tests', () => {
  let verificationToken = '';
  let corporateId = '';
  let accessToken = '';

  const testCorporate = {
    name: 'Test Corp Inc',
    registration_no: 'REG-TEST-100',
    admin: {
      name: 'Admin One',
      email: 'admin1@testcorp.com',
      mobile: '9998887770',
    },
  };

  const testNewAdmin = {
    name: 'Admin Two',
    email: 'admin2@testcorp.com',
    mobile: '1112223330',
  };

  describe('1. Pre-Registration OTP Verification', () => {
    it('should generate an OTP for registration', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: testCorporate.admin.email, mobile: testCorporate.admin.mobile });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should verify the OTP and return a verificationToken', async () => {
      // 1. Fetch OTP directly from DB since we wouldn't have it (no SES/SNS in test)
      const otpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
      expect(otpRow).toBeDefined();

      // 2. Verify it
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: testCorporate.admin.email,
          mobile: testCorporate.admin.mobile,
          otp: otpRow?.otp,
        });

      if (res.status !== 200) console.log('VERIFY OTP ERROR:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.data.verificationToken).toBeDefined();
      
      // Save it for next test
      verificationToken = res.body.data.verificationToken;
    });
  });

  describe('2. Corporate Creation & Lookup', () => {
    it('should fail to create corporate without valid verificationToken', async () => {
      const res = await request(app)
        .post('/api/corporate/create')
        .send({ ...testCorporate, verificationToken: 'invalid-token' });
      
      expect(res.status).toBe(401);
    });

    it('should create a corporate successfully with valid verificationToken', async () => {
      const res = await request(app)
        .post('/api/corporate/create')
        .send({ ...testCorporate, verificationToken });
      
      if (res.status !== 201) console.log('CREATE CORP ERROR:', res.body);
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(testCorporate.name);
      expect(res.body.data.registration_no).toBe(testCorporate.registration_no);
    });

    it('should lookup a corporate by registration number', async () => {
      const res = await request(app).get(`/api/corporate/lookup/${testCorporate.registration_no}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.corporateId).toBeDefined();
      expect(res.body.data.registration_no).toBe(testCorporate.registration_no);
      
      corporateId = res.body.data.corporateId;
    });
  });

  describe('3. Corporate Admin Login Flow', () => {
    it('should request login OTP for the corporate admin', async () => {
      const res = await request(app)
        .post('/api/auth/corporate/login')
        .send({ email: testCorporate.admin.email, corporateId });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP sent successfully');
    });

    it('should verify login OTP and issue Access & Refresh tokens', async () => {
      // 1. Fetch OTP from DB
      const otpRow = await prisma.otp.findFirst({ where: { email: testCorporate.admin.email } });
      
      // 2. Verify
      const res = await request(app)
        .post('/api/auth/corporate/verify')
        .send({ email: testCorporate.admin.email, corporateId, otp: otpRow?.otp });

      if (res.status !== 200) console.log('VERIFY LOGIN ERROR:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('CORPORATE_ADMIN');

      // Check HttpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');

      accessToken = res.body.data.accessToken;
    });
  });

  describe('4. Add Additional Corporate Admin (RBAC)', () => {
    let newAdminVerificationToken = '';

    beforeAll(async () => {
      // Simulate new admin verifying their contact info
      await request(app).post('/api/auth/send-otp').send({ email: testNewAdmin.email, mobile: testNewAdmin.mobile });
      const otpRow = await prisma.otp.findFirst({ where: { email: testNewAdmin.email } });
      const verifyRes = await request(app).post('/api/auth/verify-otp').send({ email: testNewAdmin.email, mobile: testNewAdmin.mobile, otp: otpRow?.otp });
      newAdminVerificationToken = verifyRes.body.data.verificationToken;
    });

    it('should reject adding an admin if missing Access Token', async () => {
      const res = await request(app)
        .post(`/api/corporate/addAdmin/${corporateId}`)
        .send({ ...testNewAdmin, verificationToken: newAdminVerificationToken });

      expect(res.status).toBe(401); // Unauthorized
    });

    it('should allow Corporate Admin to add another admin', async () => {
      const res = await request(app)
        .post(`/api/corporate/addAdmin/${corporateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testNewAdmin, verificationToken: newAdminVerificationToken });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(testNewAdmin.email);
    });

    it('should fail Tenancy Check if admin tries to add admin to a DIFFERENT corporateId', async () => {
      const fakeCorporateId = '99999999'; // Assuming it exists or doesn't matter since tenancy check comes first
      const res = await request(app)
        .post(`/api/corporate/addAdmin/${fakeCorporateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testNewAdmin, verificationToken: newAdminVerificationToken });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });
});
