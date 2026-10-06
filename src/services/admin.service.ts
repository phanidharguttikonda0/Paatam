import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';
import { idGenerator } from '../utils/idGenerator';

export class AdminService {
  public static async createAdmin(corporateId: bigint, data: {
    admin_name: string;
    contact_email: string;
    mobile: string;
    role: AdminRole;
    password: string;
  }) {
    // Check if email or mobile already exists
    const existing = await prisma.admin.findFirst({
      where: {
        OR: [
          { contact_email: data.contact_email },
          { mobile: data.mobile }
        ]
      }
    });

    if (existing) {
      throw new AppError('An admin with this email or mobile already exists', 400);
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const admin = await prisma.admin.create({
      data: {
        id: idGenerator.nextId(),
        corporate_id: corporateId,
        admin_name: data.admin_name,
        contact_email: data.contact_email,
        mobile: data.mobile,
        role: data.role,
        password_hash
      }
    });

    // Exclude password_hash from return
    const { password_hash: _, ...safeAdmin } = admin;
    return safeAdmin;
  }

  public static async assignBranches(adminId: bigint, branchIds: bigint[], corporateId: bigint) {
    // Verify all branches belong to the corporate
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: branchIds },
        corporate_id: corporateId
      }
    });

    if (branches.length !== branchIds.length && branchIds.length > 0) {
      throw new AppError('One or more branches are invalid or do not belong to your corporate entity', 400);
    }

    // Delete existing access and insert new
    await prisma.$transaction(async (tx) => {
      await tx.adminBranchAccess.deleteMany({
        where: { admin_id: adminId }
      });

      if (branchIds.length > 0) {
        await tx.adminBranchAccess.createMany({
          data: branchIds.map(bId => ({
            id: idGenerator.nextId(),
            admin_id: adminId,
            branch_id: bId
          }))
        });
      }
    });

    return { message: 'Branches assigned successfully' };
  }

  public static async updateAdmin(adminId: bigint, corporateId: bigint, data: {
    admin_name?: string;
    contact_email?: string;
    mobile?: string;
    role?: AdminRole;
  }) {
    // Tenancy Check
    const existingAdmin = await prisma.admin.findUnique({ where: { id: adminId }});
    if (!existingAdmin || existingAdmin.corporate_id !== corporateId) {
      throw new AppError('Admin not found or access denied', 403);
    }
    // check uniqueness of email/mobile if provided
    if (data.contact_email || data.mobile) {
      const existing = await prisma.admin.findFirst({
        where: {
          id: { not: adminId },
          OR: [
            ...(data.contact_email ? [{ contact_email: data.contact_email }] : []),
            ...(data.mobile ? [{ mobile: data.mobile }] : [])
          ]
        }
      });
      if (existing) {
        throw new AppError('Email or mobile already in use by another admin', 400);
      }
    }

    const admin = await prisma.admin.update({
      where: { id: adminId },
      data
    });

    const { password_hash: _, ...safeAdmin } = admin;
    return safeAdmin;
  }

  public static async deleteAdmin(adminId: bigint, corporateId: bigint) {
    // Tenancy Check
    const existingAdmin = await prisma.admin.findUnique({ where: { id: adminId }});
    if (!existingAdmin || existingAdmin.corporate_id !== corporateId) {
      throw new AppError('Admin not found or access denied', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminBranchAccess.deleteMany({
        where: { admin_id: adminId }
      });
      await tx.admin.delete({
        where: { id: adminId }
      });
    });

    return { message: 'Admin deleted successfully' };
  }

  public static async getAdminBranches(adminId: bigint, cursor?: bigint, limit: number = 10) {
    const accesses = await prisma.adminBranchAccess.findMany({
      where: { admin_id: adminId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
      include: {
        Branch: true
      }
    });
    return accesses.map((a: any) => ({ ...a.Branch, _accessId: a.id })); // Keeping ID for cursor logic if needed, but returning Branch
  }

  public static async getAdminsForCorporate(corporateId: bigint, cursor?: bigint, limit: number = 10) {
    const admins = await prisma.admin.findMany({
      where: { corporate_id: corporateId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        corporate_id: true,
        admin_name: true,
        contact_email: true,
        role: true
      }
    });
    return admins;
  }

  public static async getAdminProfile(adminId: bigint, corporateId: bigint) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin || admin.corporate_id !== corporateId) {
      throw new AppError('Admin not found or access denied', 403);
    }
    
    const { password_hash: _, ...safeAdmin } = admin;
    return safeAdmin;
  }

  public static async checkAdminExistsByIdentifier(identifier: string, corporateId: bigint) {
    const admin = await prisma.admin.findFirst({
      where: {
        corporate_id: corporateId,
        OR: [
          { contact_email: identifier },
          { mobile: identifier }
        ]
      }
    });

    if (!admin) {
      throw new AppError('No branch admin found with that identifier in this corporate entity', 404);
    }

    return admin;
  }

  public static async updatePassword(adminId: bigint, newPasswordPlain: string) {
    const password_hash = await bcrypt.hash(newPasswordPlain, 10);
    await prisma.admin.update({
      where: { id: adminId },
      data: { password_hash }
    });
  }

  public static async searchBranchAdmins(corporateId: bigint, query: string) {
    const admins = await prisma.admin.findMany({
      where: {
        corporate_id: corporateId,
        admin_name: { contains: query, mode: 'insensitive' }
      },
      take: 5,
      select: {
        id: true,
        admin_name: true,
        contact_email: true,
        role: true
      }
    });
    return admins;
  }
}
