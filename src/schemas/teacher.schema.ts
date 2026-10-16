import { z } from 'zod';

export const createTeacherSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Teacher name is required'),
    teacher_id: z.string().min(1, 'Teacher ID is required'),
    contact_email: z.string().email('Invalid email address'),
    contact_mobile: z.string().min(7, 'Mobile number must be at least 7 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const updateTeacherSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    contact_email: z.string().email('Invalid email address').optional(),
    contact_mobile: z.string().min(7).optional(),
  }),
});

export const searchTeacherSchema = z.object({
  query: z.object({
    q: z.string().min(1, "Query parameter 'q' is required"),
  }),
});

export const mapTeacherSubjectSchema = z.object({
  body: z.object({
    subject_id: z.string().or(z.number()),
  }),
});

export const teacherLoginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Email or Teacher ID is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const teacherForgotPasswordSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    branch_id: z.string().or(z.number()).optional(),
  }),
});

export const teacherResetPasswordSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    branch_id: z.string().or(z.number()).optional(),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});
