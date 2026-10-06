import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';

export class BranchService {
  public static async createBranch(corporateId: bigint, data: {
    name: string;
    pincode: string;
    address: string;
    branch_contact_mail: string;
    mobile_number: string;
  }) {
    // Optionally check if branch with same name exists under this corporate
    const existingBranch = await prisma.branch.findFirst({
      where: {
        corporate_id: corporateId,
        name: data.name
      }
    });

    if (existingBranch) {
      throw new AppError('A branch with this name already exists for your corporate', 400);
    }

    const branch = await prisma.branch.create({
      data: {
        id: idGenerator.nextId(),
        corporate_id: corporateId,
        ...data
      }
    });

    return branch;
  }

  public static async getAllBranches(corporateId: bigint, cursor?: bigint, limit: number = 10) {
    const branches = await prisma.branch.findMany({
      where: { corporate_id: corporateId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' }
    });
    return branches;
  }

  public static async getAdminsForBranch(branchId: bigint, corporateId: bigint, cursor?: bigint, limit: number = 10) {
    // Ensure the branch belongs to the corporate
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, corporate_id: corporateId }
    });

    if (!branch) {
      throw new AppError('Branch not found or does not belong to your corporate entity', 404);
    }

    const accesses = await prisma.adminBranchAccess.findMany({
      where: { branch_id: branchId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
      include: {
        Admin: {
          select: {
            id: true,
            corporate_id: true,
            admin_name: true,
            contact_email: true,
            mobile: true,
            role: true
          }
        }
      }
    });

    // Keeping id in the return for pagination tracking
    return accesses.map(a => ({ ...a.Admin, _accessId: a.id }));
  }

  public static async getTeachersForBranch(branchId: bigint, corporateId: bigint, cursor?: bigint, limit: number = 10) {
    // Ensure the branch belongs to the corporate
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, corporate_id: corporateId }
    });

    if (!branch) {
      throw new AppError('Branch not found or does not belong to your corporate entity', 404);
    }

    const teachers = await prisma.teacher.findMany({
      where: { branch_id: branchId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        branch_id: true,
        name: true,
        teacher_id: true,
        contact_email: true,
        contact_mobile: true
      }
    });

    return teachers;
  }
}
