import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';

export class BranchAdminService {
  /**
   * Retrieves all branches assigned to the logged-in branch admin,
   * along with the active academic year for each branch.
   */
  public static async getMyBranches(adminId: bigint) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin) {
      throw new AppError('Branch admin not found', 404);
    }

    const accesses = await prisma.adminBranchAccess.findMany({
      where: { admin_id: adminId },
      include: {
        Branch: {
          include: {
            AcademicYears: {
              where: { is_active: true },
              take: 1,
              select: {
                id: true,
                start_year: true,
                end_year: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return accesses.map((access) => {
      const activeYear = access.Branch.AcademicYears[0] || null;
      return {
        id: access.Branch.id.toString(),
        name: access.Branch.name,
        pincode: access.Branch.pincode,
        address: access.Branch.address,
        branch_contact_mail: access.Branch.branch_contact_mail,
        mobile_number: access.Branch.mobile_number,
        role_in_branch: admin.role,
        active_academic_year: activeYear
          ? {
              id: activeYear.id.toString(),
              start_year: activeYear.start_year,
              end_year: activeYear.end_year,
            }
          : null,
      };
    });
  }

  /**
   * Retrieves the profile details for the logged-in branch admin.
   */
  public static async getProfile(adminId: bigint) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        _count: {
          select: { AdminBranchAccesses: true },
        },
      },
    });

    if (!admin) {
      throw new AppError('Branch admin not found', 404);
    }

    return {
      id: admin.id.toString(),
      corporate_id: admin.corporate_id.toString(),
      admin_name: admin.admin_name,
      contact_email: admin.contact_email,
      mobile: admin.mobile,
      role: admin.role,
      assigned_branches_count: admin._count.AdminBranchAccesses,
    };
  }
}
