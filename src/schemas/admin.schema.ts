import { z } from 'zod';
import { AdminRole } from '@prisma/client';

export const createAdminSchema = z.object({
  body: z.object({
    admin_name: z.string().min(3, "Admin name must be at least 3 characters"),
    contact_email: z.string().email("Invalid email address"),
    mobile: z.string().length(10, "Mobile number must be 10 digits"),
    role: z.nativeEnum(AdminRole),
    password: z.string().min(6, "Password must be at least 6 characters")
  })
});

export const updateAdminSchema = z.object({
  body: z.object({
    contact_email: z.string().email("Invalid email address").optional(),
    mobile: z.string().length(10, "Mobile number must be 10 digits").optional(),
    role: z.nativeEnum(AdminRole).optional(),
    admin_name: z.string().min(3).optional()
  })
});

export const assignBranchesSchema = z.object({
  body: z.object({
    branch_ids: z.array(z.string().or(z.number()))
  })
});

export const adminLoginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, "Email or mobile is required"),
    password: z.string().min(6, "Password is required")
  })
});
