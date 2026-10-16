import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';

export class SubjectService {
  /**
   * Retrieves all curriculum master subjects for a branch with cursor pagination
   */
  public static async getBranchSubjects(
    branchId: bigint,
    user: any,
    cursor?: bigint,
    limit: number = 10
  ) {
    await AcademicYearService.assertBranchAccess(user, branchId);

    const subjects = await prisma.subject.findMany({
      where: { branch_id: branchId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
    });

    return subjects.map((s) => ({
      id: s.id.toString(),
      branch_id: s.branch_id.toString(),
      name: s.name,
      code: s.code,
      grade: s.grade,
      board: s.board,
      description: s.description,
      created_at: s.created_at,
    }));
  }

  /**
   * Creates a new curriculum master subject in the branch catalog
   */
  public static async createBranchSubject(
    branchId: bigint,
    user: any,
    data: {
      name: string;
      code?: string;
      grade?: string;
      board?: string;
      description?: string;
    }
  ) {
    await AcademicYearService.assertBranchAccess(user, branchId);

    const existing = await prisma.subject.findFirst({
      where: {
        branch_id: branchId,
        name: data.name,
        grade: data.grade ?? null,
      },
    });

    if (existing) {
      throw new AppError('Subject with this name and grade already exists in this branch', 400);
    }

    const subjectId = idGenerator.nextId();
    const subject = await prisma.subject.create({
      data: {
        id: subjectId,
        branch_id: branchId,
        name: data.name,
        code: data.code,
        grade: data.grade,
        board: data.board,
        description: data.description,
      },
    });

    return {
      id: subject.id.toString(),
      branch_id: subject.branch_id.toString(),
      name: subject.name,
      code: subject.code,
      grade: subject.grade,
      board: subject.board,
      description: subject.description,
    };
  }

  /**
   * Updates master subject metadata
   */
  public static async updateSubject(
    subjectId: bigint,
    user: any,
    data: {
      name?: string;
      code?: string;
      grade?: string;
      board?: string;
      description?: string;
    }
  ) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, subject.branch_id);

    if (data.name || data.grade) {
      const newName = data.name ?? subject.name;
      const newGrade = data.grade !== undefined ? data.grade : subject.grade;
      const existing = await prisma.subject.findFirst({
        where: {
          branch_id: subject.branch_id,
          name: newName,
          grade: newGrade,
          id: { not: subjectId },
        },
      });

      if (existing) {
        throw new AppError('Subject with this name and grade already exists in this branch', 400);
      }
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data,
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      code: updated.code,
      grade: updated.grade,
      board: updated.board,
      description: updated.description,
    };
  }

  /**
   * Deletes a subject from the branch catalog. Blocked if attached to classes or teachers.
   */
  public static async deleteSubject(subjectId: bigint, user: any) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            ClassSubjects: true,
            TeacherSubjects: true,
          },
        },
      },
    });

    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, subject.branch_id);

    if (subject._count.ClassSubjects > 0 || subject._count.TeacherSubjects > 0) {
      throw new AppError(
        `Cannot delete subject: currently attached to ${subject._count.ClassSubjects} classes and ${subject._count.TeacherSubjects} teachers. Remove associations first.`,
        400
      );
    }

    await prisma.subject.delete({ where: { id: subjectId } });

    return { message: 'Subject deleted successfully' };
  }

  /**
   * Lists all subjects attached to a specific class
   */
  public static async getClassSubjects(classId: bigint, user: any) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        ClassSubjects: {
          include: { Subject: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    return classData.ClassSubjects.map((cs) => ({
      class_subject_id: cs.id.toString(),
      subject_id: cs.Subject.id.toString(),
      name: cs.Subject.name,
      code: cs.Subject.code,
      board: cs.Subject.board,
      grade: cs.Subject.grade,
      description: cs.Subject.description,
    }));
  }

  /**
   * Attaches a catalog subject to a class (ClassSubject)
   */
  public static async attachSubjectToClass(classId: bigint, user: any, subjectId: bigint) {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    if (subject.branch_id !== classData.branch_id) {
      throw new AppError('Subject does not belong to this branch', 400);
    }

    const existing = await prisma.classSubject.findUnique({
      where: {
        class_id_subject_id: {
          class_id: classId,
          subject_id: subjectId,
        },
      },
    });

    if (existing) {
      throw new AppError('Subject is already attached to this class', 409);
    }

    const classSubject = await prisma.classSubject.create({
      data: {
        id: idGenerator.nextId(),
        class_id: classId,
        subject_id: subjectId,
      },
    });

    return {
      class_subject_id: classSubject.id.toString(),
      class_id: classSubject.class_id.toString(),
      subject_id: classSubject.subject_id.toString(),
    };
  }

  /**
   * Removes a subject from a class. Blocked if assignments exist.
   */
  public static async removeClassSubject(
    classId: bigint,
    classSubjectId: bigint,
    user: any
  ) {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    const classSubject = await prisma.classSubject.findFirst({
      where: { id: classSubjectId, class_id: classId },
      include: {
        _count: {
          select: { Assignments: true },
        },
      },
    });

    if (!classSubject) {
      throw new AppError('Class subject attachment not found', 404);
    }

    if (classSubject._count.Assignments > 0) {
      throw new AppError(
        `Cannot remove subject: ${classSubject._count.Assignments} assignments have been created under this class subject`,
        400
      );
    }

    await prisma.classSubject.delete({ where: { id: classSubjectId } });

    return { message: 'Subject removed from class successfully' };
  }
}
