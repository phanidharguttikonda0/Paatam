import { z } from 'zod';

export const createCorporateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    registration_no: z.string().min(1, 'Registration number is required'),
    verificationToken: z.string().min(1, 'Verification token is required. Please verify OTP first.'),
    admin: z.object({
      name: z.string().min(1, 'Admin name is required'),
      email: z.string().email('Invalid email address'),
      mobile: z.string().length(10, 'Mobile must be exactly 10 digits'),
    }),
  }),
});
