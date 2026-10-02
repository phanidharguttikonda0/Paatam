import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';

export interface CreateCorporateAdminInput {
  name: string;
  email: string;
  mobile: string;
}

export interface CreateCorporateInput {
  name: string;
  registration_no: string;
  admins: CreateCorporateAdminInput[];
}

export class CorporateService {
  public static async createCorporate(data: CreateCorporateInput) {
    const existingCorporate = await prisma.corporate.findUnique({
      where: { registration_no: data.registration_no },
    });

    if (existingCorporate) {
      throw new AppError('Corporate with this registration number already exists', 400);
    }

    // We can also validate if emails/mobiles are already taken here if needed,
    // though the DB unique constraint will catch it. We'll rely on Prisma transaction here.
    
    try {
      const corporate = await prisma.$transaction(async (tx) => {
        return tx.corporate.create({
          data: {
            name: data.name,
            registration_no: data.registration_no,
            CorporateAdmins: {
              create: data.admins, // Prisma will bulk insert these or create them sequentially
            },
          },
          include: {
            CorporateAdmins: true,
          },
        });
      });

      // Transform response to handle BigInt serialization natively
      return {
        id: corporate.id.toString(),
        name: corporate.name,
        registration_no: corporate.registration_no,
        created_at: corporate.created_at,
        admins: corporate.CorporateAdmins.map((admin) => ({
          id: admin.id.toString(),
          name: admin.name,
          email: admin.email,
          mobile: admin.mobile,
        })),
      };
    } catch (error: any) {
      // Prisma Unique constraint error code P2002
      if (error.code === 'P2002') {
        throw new AppError('An account with that email or mobile already exists', 400);
      }
      throw error;
    }
  }
}
