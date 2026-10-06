import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';

export interface CreateCorporateAdminInput {
  name: string;
  email: string;
  mobile: string;
}

export interface CreateCorporateInput {
  name: string;
  registration_no: string;
  admin: CreateCorporateAdminInput;
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
            id: idGenerator.nextId(),
            name: data.name,
            registration_no: data.registration_no,
            CorporateAdmins: {
              create: {
                ...data.admin,
                id: idGenerator.nextId()
              },
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
        admin: {
          id: corporate.CorporateAdmins[0].id.toString(),
          name: corporate.CorporateAdmins[0].name,
          email: corporate.CorporateAdmins[0].email,
          mobile: corporate.CorporateAdmins[0].mobile,
        },
      };
    } catch (error: any) {
      // Prisma Unique constraint error code P2002
      if (error.code === 'P2002') {
        throw new AppError('An account with that email or mobile already exists', 400);
      }
      throw error;
    }
  }
  public static async addAdmin(corporateId: bigint, data: CreateCorporateAdminInput) {
    try {
      const admin = await prisma.corporateAdmin.create({
        data: {
          id: idGenerator.nextId(),
          corporate_id: corporateId,
          name: data.name,
          email: data.email,
          mobile: data.mobile,
        },
      });

      return {
        id: admin.id.toString(),
        corporate_id: admin.corporate_id.toString(),
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('An account with that email or mobile already exists', 400);
      }
      throw error;
    }
  }

  public static async getCorporateAdmins(corporateId: bigint, cursor?: bigint, limit: number = 10) {
    const admins = await prisma.corporateAdmin.findMany({
      where: { corporate_id: corporateId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true
      }
    });
    return admins;
  }

  public static async getCorporateAdminProfile(adminId: bigint, corporateId: bigint) {
    const admin = await prisma.corporateAdmin.findUnique({
      where: { id: adminId }
    });

    if (!admin || admin.corporate_id !== corporateId) {
      throw new AppError('Corporate admin not found or access denied', 403);
    }

    return admin;
  }
}
