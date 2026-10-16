import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Student name is required'),
    admission_no: z.string().min(1, 'Admission number is required'),
    roll_no: z.string().min(1, 'Roll number is required'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    contact_email: z.string().email('Invalid email address').optional(),
    contact_mobile: z.string().min(7, 'Mobile number must be at least 7 digits').optional(),
    parent: z
      .object({
        name: z.string().optional(),
        mobile: z.string().optional(),
        email: z.string().email().optional(),
      })
      .optional(),
  }),
});

export const bulkCreateStudentsSchema = z.object({
  body: z.object({
    students: z.array(
      z.object({
        name: z.string().min(1, 'Student name is required'),
        admission_no: z.string().min(1, 'Admission number is required'),
        roll_no: z.string().min(1, 'Roll number is required'),
        password: z.string().min(6).optional(),
        contact_email: z.string().email().optional(),
        contact_mobile: z.string().optional(),
        parent_mobile: z.string().optional(),
      })
    ).min(1, 'At least one student must be provided'),
  }),
});

export const searchStudentSchema = z.object({
  query: z.object({
    q: z.string().min(1, "Query parameter 'q' is required"),
    section_id: z.string().optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    roll_no: z.string().min(1).optional(),
    contact_email: z.string().email('Invalid email address').optional(),
    contact_mobile: z.string().min(7).optional(),
  }),
});

export const studentLoginSchema = z.object({
  body: z
    .object({
      admission_no: z.string().optional(),
      identifier: z.string().optional(),
      password: z.string().min(1, 'Password is required'),
    })
    .refine((data) => data.admission_no || data.identifier, {
      message: 'Admission number or identifier is required',
    }),
});

export const studentForgotPasswordSchema = z.object({
  body: z
    .object({
      admission_no: z.string().optional(),
      identifier: z.string().optional(),
    })
    .refine((data) => data.admission_no || data.identifier, {
      message: 'Admission number or identifier is required',
    }),
});

export const studentResetPasswordSchema = z.object({
  body: z
    .object({
      admission_no: z.string().optional(),
      identifier: z.string().optional(),
      otp: z.string().length(6, 'OTP must be exactly 6 digits'),
      new_password: z.string().min(6, 'New password must be at least 6 characters'),
    })
    .refine((data) => data.admission_no || data.identifier, {
      message: 'Admission number or identifier is required',
    }),
});
