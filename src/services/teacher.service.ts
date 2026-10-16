import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';
import { UserRole } from '../enums/role.enum';

export class TeacherService {
  /**
   * Onboards a new teacher for a branch with salted password hash
   */
  public static async createTeacher(
    branchId: bigint,
    user: any,
    data: {
      name: string;
      teacher_id: string;
      contact_email: string;
      contact_mobile: string;
      password: string;
    }
  ) {
    await AcademicYearService.assertBranchAccess(user, branchId);

    // Check for existing teacher with duplicate teacher_id in branch, or duplicate email globally, or mobile
    const existing = await prisma.teacher.findFirst({
      where: {
        OR: [
          {
            branch_id: branchId,
            teacher_id: data.teacher_id,
          },
          {
            contact_email: data.contact_email,
          },
          {
            branch_id: branchId,
            contact_mobile: data.contact_mobile,
          },
        ],
      },
    });

    if (existing) {
      throw new AppError('Teacher with this teacher_id, email, or mobile already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const teacherId = idGenerator.nextId();

    const teacher = await prisma.teacher.create({
      data: {
        id: teacherId,
        branch_id: branchId,
        name: data.name,
        teacher_id: data.teacher_id,
        password_hash: passwordHash,
        contact_email: data.contact_email,
        contact_mobile: data.contact_mobile,
      },
    });

    return {
      id: teacher.id.toString(),
      branch_id: teacher.branch_id.toString(),
      name: teacher.name,
      teacher_id: teacher.teacher_id,
      contact_email: teacher.contact_email,
      contact_mobile: teacher.contact_mobile,
    };
  }

  /**
   * Fast autocomplete search for teachers in a branch by name or teacher_id
   */
  public static async searchTeachers(branchId: bigint, user: any, query: string) {
    await AcademicYearService.assertBranchAccess(user, branchId);

    const teachers = await prisma.teacher.findMany({
      where: {
        branch_id: branchId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { teacher_id: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        Sections: { select: { id: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    return teachers.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      teacher_id: t.teacher_id,
      contact_email: t.contact_email,
      is_class_teacher: t.Sections.length > 0,
    }));
  }

  /**
   * Retrieves full profile for a teacher with assigned subjects and class teacher sections
   */
  public static async getTeacherById(teacherId: bigint, user: any) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        TeacherSubjects: {
          include: {
            Subject: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        Sections: {
          include: {
            Class: { select: { name: true } },
          },
          orderBy: { section_name: 'asc' },
        },
      },
    });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    if (user.role === UserRole.TEACHER) {
      if (user.userId !== teacherId.toString()) {
        throw new AppError('Forbidden: Insufficient permissions', 403);
      }
    } else {
      await AcademicYearService.assertBranchAccess(user, teacher.branch_id);
    }

    return {
      id: teacher.id.toString(),
      branch_id: teacher.branch_id.toString(),
      name: teacher.name,
      teacher_id: teacher.teacher_id,
      contact_email: teacher.contact_email,
      contact_mobile: teacher.contact_mobile,
      assigned_subjects: teacher.TeacherSubjects.map((ts) => ({
        id: ts.Subject.id.toString(),
        name: ts.Subject.name,
        code: ts.Subject.code,
      })),
      class_teacher_sections: teacher.Sections.map((s) => ({
        id: s.id.toString(),
        section_name: s.section_name,
        class_name: s.Class.name,
      })),
    };
  }

  /**
   * Updates teacher contact and personal details
   */
  public static async updateTeacher(
    teacherId: bigint,
    user: any,
    data: { name?: string; contact_email?: string; contact_mobile?: string }
  ) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, teacher.branch_id);

    if (data.contact_email && data.contact_email !== teacher.contact_email) {
      const emailTaken = await prisma.teacher.findUnique({
        where: { contact_email: data.contact_email },
      });
      if (emailTaken) {
        throw new AppError('Email already in use by another teacher', 409);
      }
    }

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        name: data.name ?? undefined,
        contact_email: data.contact_email ?? undefined,
        contact_mobile: data.contact_mobile ?? undefined,
      },
    });

    return {
      id: updated.id.toString(),
      branch_id: updated.branch_id.toString(),
      name: updated.name,
      teacher_id: updated.teacher_id,
      contact_email: updated.contact_email,
      contact_mobile: updated.contact_mobile,
    };
  }

  /**
   * Deletes a teacher. Blocked if class teacher or actively assigned to subjects.
   */
  public static async deleteTeacher(teacherId: bigint, user: any) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, teacher.branch_id);

    const classTeacherSections = await prisma.section.findMany({
      where: { class_teacher_id: teacherId },
      include: { Class: { select: { name: true } } },
    });

    const teacherSubjectsCount = await prisma.teacherSubject.count({
      where: { teacher_id: teacherId },
    });

    if (classTeacherSections.length > 0 || teacherSubjectsCount > 0) {
      const dependencies: string[] = [];
      if (classTeacherSections.length > 0) {
        const sectionsStr = classTeacherSections
          .map((s) => `${s.Class.name}-${s.section_name}`)
          .join(', ');
        dependencies.push(`actively assigned as Class Teacher for ${sectionsStr}`);
      }
      if (teacherSubjectsCount > 0) {
        dependencies.push(
          `teaches ${teacherSubjectsCount} subject${teacherSubjectsCount > 1 ? 's' : ''}`
        );
      }
      throw new AppError(`Cannot delete teacher: ${dependencies.join(' and ')}`, 400);
    }

    await prisma.teacher.delete({ where: { id: teacherId } });

    return { message: 'Teacher deleted successfully' };
  }

  /**
   * Retrieves all subjects mapped to a teacher
   */
  public static async getTeacherSubjects(teacherId: bigint, user: any) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    if (user.role === UserRole.TEACHER) {
      if (user.userId !== teacherId.toString()) {
        throw new AppError('Forbidden: Insufficient permissions', 403);
      }
    } else {
      await AcademicYearService.assertBranchAccess(user, teacher.branch_id);
    }

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacher_id: teacherId },
      include: { Subject: true },
      orderBy: { created_at: 'asc' },
    });

    return teacherSubjects.map((ts) => ({
      teacher_subject_id: ts.id.toString(),
      subject_id: ts.subject_id.toString(),
      subject_name: ts.Subject.name,
      code: ts.Subject.code,
    }));
  }

  /**
   * Maps a teacher to a curriculum subject
   */
  public static async mapSubjectToTeacher(teacherId: bigint, user: any, subjectId: bigint) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, teacher.branch_id);

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.branch_id !== teacher.branch_id) {
      throw new AppError('Subject not found or does not belong to this branch', 404);
    }

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacher_id_subject_id: {
          teacher_id: teacherId,
          subject_id: subjectId,
        },
      },
    });

    if (existing) {
      throw new AppError('Subject is already mapped to this teacher', 409);
    }

    const ts = await prisma.teacherSubject.create({
      data: {
        id: idGenerator.nextId(),
        teacher_id: teacherId,
        subject_id: subjectId,
      },
    });

    return {
      id: ts.id.toString(),
      teacher_id: ts.teacher_id.toString(),
      subject_id: ts.subject_id.toString(),
    };
  }

  /**
   * Removes subject assignment from a teacher
   */
  public static async unmapSubjectFromTeacher(teacherId: bigint, user: any, subjectId: bigint) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, teacher.branch_id);

    const ts = await prisma.teacherSubject.findUnique({
      where: {
        teacher_id_subject_id: {
          teacher_id: teacherId,
          subject_id: subjectId,
        },
      },
    });

    if (!ts) {
      throw new AppError('Teacher subject mapping not found', 404);
    }

    const assignmentsCount = await prisma.assignment.count({
      where: { teacher_subject_id: ts.id },
    });

    if (assignmentsCount > 0) {
      throw new AppError(
        'Cannot remove subject: active assignments are linked to this teacher-subject mapping',
        400
      );
    }

    await prisma.teacherSubject.delete({ where: { id: ts.id } });

    return { message: 'Subject removed from teacher successfully' };
  }

  /**
   * Retrieves all sections where the teacher is designated as Class Teacher
   */
  public static async getTeacherSections(teacherId: bigint, user: any) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    if (user.role === UserRole.TEACHER) {
      if (user.userId !== teacherId.toString()) {
        throw new AppError('Forbidden: Insufficient permissions', 403);
      }
    } else {
      await AcademicYearService.assertBranchAccess(user, teacher.branch_id);
    }

    const sections = await prisma.section.findMany({
      where: { class_teacher_id: teacherId },
      include: {
        Class: { select: { id: true, name: true } },
        _count: { select: { Students: true } },
      },
      orderBy: { section_name: 'asc' },
    });

    return sections.map((s) => ({
      section_id: s.id.toString(),
      section_name: s.section_name,
      class_id: s.Class.id.toString(),
      class_name: s.Class.name,
      enrolled_count: s._count.Students,
    }));
  }

  /**
   * Retrieves self profile for logged-in teacher
   */
  public static async getTeacherProfile(teacherId: bigint) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    return {
      id: teacher.id.toString(),
      name: teacher.name,
      teacher_id: teacher.teacher_id,
      email: teacher.contact_email,
      mobile: teacher.contact_mobile,
      branch_id: teacher.branch_id.toString(),
    };
  }

  /**
   * Retrieves Teacher Home Page dashboard: teaching allocations and class teacher sections
   */
  public static async getTeacherDashboard(teacherId: bigint) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        TeacherSubjects: {
          include: {
            Subject: {
              include: {
                ClassSubjects: {
                  include: {
                    Class: {
                      include: {
                        Sections: {
                          include: {
                            _count: { select: { Students: true } },
                          },
                          orderBy: { section_name: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Sections: {
          include: {
            Class: { select: { id: true, name: true } },
            _count: { select: { Students: true } },
          },
          orderBy: { section_name: 'asc' },
        },
      },
    });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    const teachingAllocations: any[] = [];
    for (const ts of teacher.TeacherSubjects) {
      for (const cs of ts.Subject.ClassSubjects) {
        for (const s of cs.Class.Sections) {
          teachingAllocations.push({
            section_id: s.id.toString(),
            section_name: s.section_name,
            class_id: cs.Class.id.toString(),
            class_name: cs.Class.name,
            subject_id: ts.Subject.id.toString(),
            subject_name: ts.Subject.name,
            class_subject_id: cs.id.toString(),
            teacher_subject_id: ts.id.toString(),
            students_count: s._count.Students || s.strength,
          });
        }
      }
    }

    const classTeacherSections = teacher.Sections.map((s) => ({
      section_id: s.id.toString(),
      section_name: s.section_name,
      class_name: s.Class.name,
      students_count: s._count.Students || s.strength,
    }));

    return {
      teaching_allocations: teachingAllocations,
      class_teacher_sections: classTeacherSections,
    };
  }

  /**
   * Retrieves specific subjects that the authenticated teacher teaches in the designated section
   */
  public static async getTeacherSectionSubjects(sectionId: bigint, teacherId: bigint) {
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
                      where: { teacher_id: teacherId },
                    },
                  },
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

    const matchedSubjects = section.Class.ClassSubjects.filter(
      (cs) => cs.Subject.TeacherSubjects.length > 0
    ).map((cs) => {
      const ts = cs.Subject.TeacherSubjects[0];
      return {
        class_subject_id: cs.id.toString(),
        teacher_subject_id: ts.id.toString(),
        subject_name: cs.Subject.name,
        subject_code: cs.Subject.code,
      };
    });

    return matchedSubjects;
  }
}
