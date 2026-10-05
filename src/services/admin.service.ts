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

  public static async updateAdmin(adminId: bigint, data: {
    admin_name?: string;
    contact_email?: string;
    mobile?: string;
    role?: AdminRole;
  }) {
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

  public static async deleteAdmin(adminId: bigint) {
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

  public static async getAdminBranches(adminId: bigint) {
    const accesses = await prisma.adminBranchAccess.findMany({
      where: { admin_id: adminId },
      include: {
        Branch: true
      }
    });
    return accesses.map(a => a.Branch);
  }

  public static async getAdminsForCorporate(corporateId: bigint) {
    const admins = await prisma.admin.findMany({
      where: { corporate_id: corporateId },
      select: {
        id: true,
        corporate_id: true,
        admin_name: true,
        contact_email: true,
        mobile: true,
        role: true
      }
    });
    return admins;
  }
}
