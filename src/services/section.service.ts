import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';

export class SectionService {
  /**
   * Lists all sections belonging to a specific class
   */
  public static async getSectionsForClass(classId: bigint, user: any) {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    const sections = await prisma.section.findMany({
      where: { class_id: classId },
      include: {
        Teacher: {
          select: { id: true, name: true },
        },
      },
      orderBy: { section_name: 'asc' },
    });

    return sections.map((s) => ({
      id: s.id.toString(),
      class_id: s.class_id.toString(),
      section_name: s.section_name,
      strength: s.strength,
      class_teacher_id: s.class_teacher_id ? s.class_teacher_id.toString() : null,
      class_teacher_name: s.Teacher ? s.Teacher.name : null,
    }));
  }

  /**
   * Adds a new section to an existing class
   */
  public static async createSection(
    classId: bigint,
    user: any,
    data: { section_name: string; strength?: number; class_teacher_id?: bigint }
  ) {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      throw new AppError('Class not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classData.branch_id);

    const existing = await prisma.section.findUnique({
      where: {
        class_id_section_name: {
          class_id: classId,
          section_name: data.section_name,
        },
      },
    });

    if (existing) {
      throw new AppError('Section name already exists in this class', 400);
    }

    if (data.class_teacher_id) {
      const teacher = await prisma.teacher.findFirst({
        where: { id: data.class_teacher_id, branch_id: classData.branch_id },
      });
      if (!teacher) {
        throw new AppError('Teacher not found or does not belong to this branch', 400);
      }
    }

    const sectionId = idGenerator.nextId();
    const section = await prisma.section.create({
      data: {
        id: sectionId,
        class_id: classId,
        section_name: data.section_name,
        strength: data.strength ?? 0,
        class_teacher_id: data.class_teacher_id ?? null,
      },
    });

    return {
      id: section.id.toString(),
      class_id: section.class_id.toString(),
      section_name: section.section_name,
      strength: section.strength,
      class_teacher_id: section.class_teacher_id ? section.class_teacher_id.toString() : null,
    };
  }

  /**
   * Returns complete section details
   */
  public static async getSectionDetails(sectionId: bigint, user: any) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        Class: {
          select: { id: true, name: true, branch_id: true },
        },
        Teacher: {
          select: {
            id: true,
            name: true,
            teacher_id: true,
            contact_email: true,
            contact_mobile: true,
          },
        },
        _count: {
          select: { Students: true },
        },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    return {
      id: section.id.toString(),
      section_name: section.section_name,
      strength: section.strength,
      enrolled_students_count: section._count.Students,
      class: {
        id: section.Class.id.toString(),
        name: section.Class.name,
      },
      class_teacher: section.Teacher
        ? {
            id: section.Teacher.id.toString(),
            name: section.Teacher.name,
            teacher_id: section.Teacher.teacher_id,
            contact_email: section.Teacher.contact_email,
            contact_mobile: section.Teacher.contact_mobile,
          }
        : null,
    };
  }

  /**
   * Updates section name or capacity strength
   */
  public static async updateSection(
    sectionId: bigint,
    user: any,
    data: { section_name?: string; strength?: number }
  ) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    if (data.section_name && data.section_name !== section.section_name) {
      const existing = await prisma.section.findFirst({
        where: {
          class_id: section.class_id,
          section_name: data.section_name,
          id: { not: sectionId },
        },
      });
      if (existing) {
        throw new AppError('Section name already exists in this class', 400);
      }
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: {
        section_name: data.section_name,
        strength: data.strength,
      },
    });

    return {
      id: updated.id.toString(),
      section_name: updated.section_name,
      strength: updated.strength,
    };
  }

  /**
   * Deletes a section. Blocked if students enrolled.
   */
  public static async deleteSection(sectionId: bigint, user: any) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        Class: { select: { branch_id: true } },
        _count: { select: { Students: true } },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    if (section._count.Students > 0) {
      throw new AppError(
        `Cannot delete section: ${section._count.Students} students are currently enrolled in this section`,
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { section_id: sectionId } });
      await tx.section.delete({ where: { id: sectionId } });
    });

    return { message: 'Section deleted successfully' };
  }

  /**
   * Assigns or replaces the class teacher for a section
   */
  public static async assignClassTeacher(sectionId: bigint, user: any, teacherId: bigint) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, branch_id: section.Class.branch_id },
    });

    if (!teacher) {
      throw new AppError('Teacher not found or does not belong to this branch', 404);
    }

    await prisma.section.update({
      where: { id: sectionId },
      data: { class_teacher_id: teacherId },
    });

    return {
      section_id: section.id.toString(),
      class_teacher_id: teacher.id.toString(),
      teacher_name: teacher.name,
    };
  }

  /**
   * Removes designated class teacher from section
   */
  public static async removeClassTeacher(sectionId: bigint, user: any) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    await prisma.section.update({
      where: { id: sectionId },
      data: { class_teacher_id: null },
    });

    return { message: 'Class teacher unassigned from section' };
  }

  /**
   * Retrieves matrix of class subjects and assigned instructors for a section
   */
  public static async getSectionSubjectsTeachers(sectionId: bigint, user: any) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        Class: {
          include: {
            ClassSubjects: {
              include: {
                Subject: {
                  include: {
                    TeacherSubjects: {
                      include: {
                        Teacher: {
                          select: { id: true, name: true, teacher_id: true },
                        },
                      },
                    },
                  },
                },
                Assignments: {
                  where: { section_id: sectionId },
                  include: {
                    TeacherSubject: {
                      include: {
                        Teacher: {
                          select: { id: true, name: true, teacher_id: true },
                        },
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    return section.Class.ClassSubjects.map((cs) => {
      const assignmentTeacher = cs.Assignments[0]?.TeacherSubject?.Teacher;
      const catalogTeacher = cs.Subject.TeacherSubjects[0]?.Teacher;
      const teacher = assignmentTeacher || catalogTeacher || null;

      return {
        class_subject_id: cs.id.toString(),
        subject_name: cs.Subject.name,
        subject_code: cs.Subject.code,
        assigned_teacher: teacher
          ? {
              id: teacher.id.toString(),
              name: teacher.name,
              teacher_id: teacher.teacher_id,
            }
          : null,
      };
    });
  }
}
