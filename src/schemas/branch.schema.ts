import { z } from 'zod';

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    pincode: z.string().length(6, "Pincode must be 6 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    branch_contact_mail: z.string().email("Invalid branch email"),
    mobile_number: z.string().length(10, "Mobile number must be 10 characters")
  })
});
