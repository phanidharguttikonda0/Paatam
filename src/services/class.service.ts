import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';

export class ClassService {
  /**
   * Lists classes for an academic year, ordered by class_order
   */
  public static async getClassesForAcademicYear(academicYearId: bigint, user: any) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new AppError('Academic year not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, academicYear.branch_id);

    const classes = await prisma.class.findMany({
      where: { academic_year_id: academicYearId },
      include: {
        _count: {
          select: {
            Sections: true,
            ClassSubjects: true,
          },
        },
      },
      orderBy: [{ class_order: 'asc' }, { id: 'asc' }],
    });

    return classes.map((c) => ({
      id: c.id.toString(),
      branch_id: c.branch_id.toString(),
      academic_year_id: c.academic_year_id.toString(),
      name: c.name,
      class_order: c.class_order,
      sections_count: c._count.Sections,
      subjects_count: c._count.ClassSubjects,
    }));
  }

  /**
   * Creates a new class with optional initial sections
   */
  public static async createClass(
    academicYearId: bigint,
    user: any,
    data: { name: string; class_order: number; initial_sections?: string[] }
  ) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new AppError('Academic year not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, academicYear.branch_id);

    const existingClass = await prisma.class.findFirst({
      where: {
        branch_id: academicYear.branch_id,
        academic_year_id: academicYearId,
        name: data.name,
      },
    });

    if (existingClass) {
      throw new AppError('Class name already exists in this academic year', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const classId = idGenerator.nextId();

      const createdClass = await tx.class.create({
        data: {
          id: classId,
          branch_id: academicYear.branch_id,
          academic_year_id: academicYearId,
          name: data.name,
          class_order: data.class_order,
        },
      });

      const sections = [];
      if (data.initial_sections && data.initial_sections.length > 0) {
        for (const sectionName of data.initial_sections) {
          const sectionId = idGenerator.nextId();
          const section = await tx.section.create({
            data: {
              id: sectionId,
              class_id: classId,
              section_name: sectionName,
              strength: 0,
            },
          });
          sections.push({
            id: section.id.toString(),
            section_name: section.section_name,
            strength: section.strength,
          });
        }
      }

      return {
        id: createdClass.id.toString(),
        branch_id: createdClass.branch_id.toString(),
        academic_year_id: createdClass.academic_year_id.toString(),
        name: createdClass.name,
        class_order: createdClass.class_order,
        sections,
      };
    });
  }

  /**
   * Retrieves class details with sections and subjects
   */
  public static async getClassDetails(classId: bigint, user: any) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        AcademicYear: {
          select: {
            id: true,
            start_year: true,
            end_year: true,
          },
        },
        Sections: {
          include: {
            Teacher: {
              select: {
                id: true,
                name: true,
                teacher_id: true,
              },
            },
          },
          orderBy: { section_name: 'asc' },
        },
        ClassSubjects: {
          include: {
            Subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    return {
      id: classData.id.toString(),
      name: classData.name,
      class_order: classData.class_order,
      academic_year: {
        id: classData.AcademicYear.id.toString(),
        start_year: classData.AcademicYear.start_year,
        end_year: classData.AcademicYear.end_year,
      },
      sections: classData.Sections.map((s) => ({
        id: s.id.toString(),
        section_name: s.section_name,
        strength: s.strength,
        class_teacher: s.Teacher
          ? {
              id: s.Teacher.id.toString(),
              name: s.Teacher.name,
              teacher_id: s.Teacher.teacher_id,
            }
          : null,
      })),
      subjects: classData.ClassSubjects.map((cs) => ({
        id: cs.Subject.id.toString(),
        class_subject_id: cs.id.toString(),
        name: cs.Subject.name,
        code: cs.Subject.code,
      })),
    };
  }

  /**
   * Updates class name or order
   */
  public static async updateClass(
    classId: bigint,
    user: any,
    data: { name?: string; class_order?: number }
  ) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    if (data.name && data.name !== classData.name) {
      const existing = await prisma.class.findFirst({
        where: {
          branch_id: classData.branch_id,
          academic_year_id: classData.academic_year_id,
          name: data.name,
          id: { not: classId },
        },
      });

      if (existing) {
        throw new AppError('Class name already exists in this academic year', 400);
      }
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        name: data.name,
        class_order: data.class_order,
      },
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      class_order: updated.class_order,
    };
  }

  /**
   * Deletes a class. Blocked if sections exist.
   */
  public static async deleteClass(classId: bigint, user: any) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: {
            Sections: true,
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    if (classData._count.Sections > 0) {
      throw new AppError('Cannot delete class: sections are linked to this class', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.classSubject.deleteMany({ where: { class_id: classId } });
      await tx.class.delete({ where: { id: classId } });
    });

    return { message: 'Class deleted successfully' };
  }
}
