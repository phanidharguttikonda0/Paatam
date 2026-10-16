import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { parseBigInt } from '../utils/bigint';
import { UserRole, BRANCH_ADMIN_ROLES } from '../enums/role.enum';

export class AcademicYearService {
  /**
   * Helper to verify if the requesting user has administrative access to the branch
   */
  public static async assertBranchAccess(user: any, branchId: bigint) {
    if (!user || !user.role) {
      throw new AppError('Unauthorized', 401);
    }

    if (user.role === UserRole.CORPORATE_ADMIN) {
      if (!user.corporateId) throw new AppError('Unauthorized', 401);
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, corporate_id: corporateId },
      });
      if (!branch) {
        throw new AppError('Branch not found or access denied', 404);
      }
      return branch;
    }

    if (BRANCH_ADMIN_ROLES.includes(user.role)) {
      const adminId = parseBigInt(user.userId, 'userId');
      const access = await prisma.adminBranchAccess.findUnique({
        where: {
          admin_id_branch_id: {
            admin_id: adminId,
            branch_id: branchId,
          },
        },
      });
      if (!access) {
        throw new AppError('Forbidden: You do not have access to this branch', 403);
      }
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw new AppError('Branch not found', 404);
      return branch;
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = parseBigInt(user.userId, 'userId');
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher || teacher.branch_id !== branchId) {
        throw new AppError('Forbidden: You do not have access to this branch', 403);
      }
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw new AppError('Branch not found', 404);
      return branch;
    }

    if (user.role === UserRole.STUDENT) {
      const studentId = parseBigInt(user.userId, 'userId');
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { Section: { include: { Class: true } } },
      });
      if (!student || student.Section.Class.branch_id !== branchId) {
        throw new AppError('Forbidden: You do not have access to this branch', 403);
      }
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw new AppError('Branch not found', 404);
      return branch;
    }

    throw new AppError('Forbidden: Insufficient permissions', 403);
  }

  /**
   * Lists academic years for a branch with cursor-based pagination
   */
  public static async getAcademicYears(
    branchId: bigint,
    user: any,
    cursor?: bigint,
    limit: number = 10
  ) {
    await this.assertBranchAccess(user, branchId);

    const years = await prisma.academicYear.findMany({
      where: { branch_id: branchId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: [{ is_active: 'desc' }, { start_year: 'desc' }, { id: 'desc' }],
    });

    return years;
  }

  /**
   * Creates a new academic year for a branch
   */
  public static async createAcademicYear(
    branchId: bigint,
    user: any,
    data: { start_year: number; end_year: number; is_active?: boolean }
  ) {
    await this.assertBranchAccess(user, branchId);

    if (data.end_year !== data.start_year + 1) {
      throw new AppError('end_year must be start_year + 1', 400);
    }

    const existing = await prisma.academicYear.findUnique({
      where: {
        branch_id_start_year: {
          branch_id: branchId,
          start_year: data.start_year,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `Academic year ${data.start_year}-${data.end_year} already exists for this branch`,
        409
      );
    }

    const isActive = data.is_active ?? true;

    return await prisma.$transaction(async (tx) => {
      if (isActive) {
        // Deactivate all previous academic years for this branch
        await tx.academicYear.updateMany({
          where: { branch_id: branchId },
          data: { is_active: false },
        });
      }

      return await tx.academicYear.create({
        data: {
          id: idGenerator.nextId(),
          branch_id: branchId,
          start_year: data.start_year,
          end_year: data.end_year,
          is_active: isActive,
        },
      });
    });
  }

  /**
   * Updates an academic year
   */
  public static async updateAcademicYear(
    id: bigint,
    user: any,
    data: { is_active?: boolean; start_year?: number; end_year?: number }
  ) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new AppError('Academic year not found', 404);
    }

    await this.assertBranchAccess(user, year.branch_id);

    if (data.start_year !== undefined && data.end_year !== undefined) {
      if (data.end_year !== data.start_year + 1) {
        throw new AppError('end_year must be start_year + 1', 400);
      }
    }

    return await prisma.$transaction(async (tx) => {
      if (data.is_active === true) {
        await tx.academicYear.updateMany({
          where: { branch_id: year.branch_id, id: { not: id } },
          data: { is_active: false },
        });
      }

      return await tx.academicYear.update({
        where: { id },
        data,
      });
    });
  }

  /**
   * Deletes an academic year. Blocked if classes exist.
   */
  public static async deleteAcademicYear(id: bigint, user: any) {
    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Classes: true },
        },
      },
    });

    if (!year) {
      throw new AppError('Academic year not found', 404);
    }

    await this.assertBranchAccess(user, year.branch_id);

    if (year._count.Classes > 0) {
      throw new AppError(
        'Cannot delete academic year: active classes are linked to this session',
        400
      );
    }

    await prisma.academicYear.delete({ where: { id } });

    return { message: 'Academic year deleted successfully' };
  }
}
