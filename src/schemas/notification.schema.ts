import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  query: z.object({
    type: z.string().optional(),
    delivery_status: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

export const testNotificationSchema = z.object({
  body: z.object({
    channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
    recipient: z.string().min(1, 'Recipient phone or email is required'),
    message: z.string().min(1, 'Message is required'),
    recipient_type: z.enum(['PARENT', 'STUDENT', 'TEACHER']).optional().default('PARENT'),
  }),
});
