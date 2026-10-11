import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';

describe('Validation, Refresh, and Safe ID Parsing Fixes', () => {
  describe('Mistake 1 & 4: Zod Validation and Forgot/Reset Password Schemas', () => {
    it('should return 400 Bad Request (not 500) on malformed body for corporate create', async () => {
      const res = await request(app)
        .post('/api/corporate/create')
        .send({
          name: 'Invalid Corp',
          // missing registration_no, verificationToken, and admin
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation failed:');
    });

    it('should return 400 on forgot-password when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/admin/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation failed:');
    });

    it('should return 400 on reset-password when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/admin/reset-password')
        .send({
          identifier: 'admin@test.com',
          // missing corporateId, otp, new_password
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation failed:');
    });
  });

  describe('Mistake 2: Refresh Token Endpoint', () => {
    it('should return 401 when refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Refresh token required');
    });

    it('should return 401 when refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'non-existent-token' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired refresh token');
    });
  });

  describe('Mistake 3: Safe BigInt Parsing', () => {
    it('should parse valid string and number into BigInt', () => {
      expect(parseBigInt('123456789012345')).toBe(BigInt('123456789012345'));
      expect(parseBigInt(42)).toBe(BigInt(42));
      expect(parseBigInt(BigInt(99))).toBe(BigInt(99));
    });

    it('should throw AppError 400 when invalid string is passed', () => {
      expect(() => parseBigInt('abc', 'testId')).toThrow('Invalid testId: must be a numeric ID');
      expect(() => parseBigInt('12.34', 'testId')).toThrow('Invalid testId: must be a numeric ID');
      expect(() => parseBigInt(null, 'testId')).toThrow('Invalid testId: must be a numeric ID');
    });

    it('should return 400 on corporate login when non-numeric corporateId is passed', async () => {
      const res = await request(app)
        .post('/api/auth/corporate/login')
        .send({
          email: 'admin@test.com',
          corporateId: 'not-a-number'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('must be a numeric ID');
    });
  });
});
