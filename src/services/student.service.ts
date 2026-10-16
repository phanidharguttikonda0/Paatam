import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';
import { UserRole } from '../enums/role.enum';
import { formatPaginatedResponse } from '../utils/pagination';

export class StudentService {
  /**
   * Fetches paginated list of students enrolled in a specific section
   */
  public static async getStudentsForSection(
    sectionId: bigint,
    user: any,
    cursor?: bigint,
    limit: number = 10,
    search?: string
  ) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const whereClause: any = { section_id: sectionId };

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { admission_no: { contains: search, mode: 'insensitive' } },
        { roll_no: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cursor) {
      whereClause.id = { gte: cursor };
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      take: limit + 1,
      orderBy: { id: 'asc' },
    });

    const serialized = students.map((s) => ({
      id: s.id.toString(),
      section_id: s.section_id.toString(),
      name: s.name,
      admission_no: s.admission_no,
      roll_no: s.roll_no,
      contact_email: s.contact_email,
      contact_mobile: s.contact_mobile,
    }));

    return formatPaginatedResponse(serialized, limit);
  }

  /**
   * Searches students across the branch by name or admission number
   */
  public static async searchStudents(
    branchId: bigint,
    user: any,
    query: string,
    sectionId?: bigint
  ) {
    await AcademicYearService.assertBranchAccess(user, branchId);

    const whereClause: any = {
      Section: {
        Class: {
          branch_id: branchId,
        },
      },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { admission_no: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (sectionId) {
      whereClause.section_id = sectionId;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        Section: {
          select: {
            section_name: true,
            Class: { select: { name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return students.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      admission_no: s.admission_no,
      roll_no: s.roll_no,
      section_name: s.Section.section_name,
      class_name: s.Section.Class.name,
    }));
  }

  /**
   * Enrolls a single student into a section
   */
  public static async createStudent(
    sectionId: bigint,
    user: any,
    data: {
      name: string;
      admission_no: string;
      roll_no: string;
      password?: string;
      contact_email?: string;
      contact_mobile?: string;
      parent?: { name?: string; mobile?: string; email?: string };
    }
  ) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    // Verify admission_no uniqueness globally
    const existingAdmission = await prisma.student.findUnique({
      where: { admission_no: data.admission_no },
    });
    if (existingAdmission) {
      throw new AppError(
        `A student with admission number ${data.admission_no} already exists`,
        409
      );
    }

    // Verify roll_no uniqueness in this section
    const existingRoll = await prisma.student.findUnique({
      where: {
        section_id_roll_no: {
          section_id: sectionId,
          roll_no: data.roll_no,
        },
      },
    });
    if (existingRoll) {
      throw new AppError(
        `Student with roll number ${data.roll_no} already exists in this section`,
        409
      );
    }

    const rawPassword = data.password || 'StudentPassword123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const studentId = idGenerator.nextId();

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          id: studentId,
          section_id: sectionId,
          name: data.name,
          admission_no: data.admission_no,
          roll_no: data.roll_no,
          password_hash: passwordHash,
          contact_email: data.contact_email ?? (data.parent?.email || null),
          contact_mobile: data.contact_mobile ?? (data.parent?.mobile || null),
        },
      });

      await tx.section.update({
        where: { id: sectionId },
        data: { strength: { increment: 1 } },
      });

      return created;
    });

    return {
      id: student.id.toString(),
      section_id: student.section_id.toString(),
      name: student.name,
      admission_no: student.admission_no,
      roll_no: student.roll_no,
    };
  }

  /**
   * Bulk onboards students into a section
   */
  public static async bulkCreateStudents(
    sectionId: bigint,
    user: any,
    studentsList: Array<{
      name: string;
      admission_no: string;
      roll_no: string;
      password?: string;
      contact_email?: string;
      contact_mobile?: string;
      parent_mobile?: string;
    }>
  ) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: { select: { branch_id: true } } },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const failedRows: Array<{ row: number; admission_no: string | null; reason: string }> = [];
    let successfulCount = 0;
    const seenBatchAdmissionNos = new Set<string>();
    const seenBatchRollNos = new Set<string>();

    for (let i = 0; i < studentsList.length; i++) {
      const rowNum = i + 1;
      const s = studentsList[i];

      if (!s.name || !s.admission_no || !s.roll_no) {
        failedRows.push({
          row: rowNum,
          admission_no: s.admission_no || null,
          reason: 'Missing name, admission_no, or roll_no',
        });
        continue;
      }

      if (seenBatchAdmissionNos.has(s.admission_no)) {
        failedRows.push({
          row: rowNum,
          admission_no: s.admission_no,
          reason: `Duplicate admission number ${s.admission_no} in upload batch`,
        });
        continue;
      }

      if (seenBatchRollNos.has(s.roll_no)) {
        failedRows.push({
          row: rowNum,
          admission_no: s.admission_no,
          reason: `Duplicate roll number ${s.roll_no} in upload batch`,
        });
        continue;
      }

      const existingAdmission = await prisma.student.findUnique({
        where: { admission_no: s.admission_no },
      });
      if (existingAdmission) {
        failedRows.push({
          row: rowNum,
          admission_no: s.admission_no,
          reason: `Admission number ${s.admission_no} already exists in system`,
        });
        continue;
      }

      const existingRoll = await prisma.student.findUnique({
        where: {
          section_id_roll_no: {
            section_id: sectionId,
            roll_no: s.roll_no,
          },
        },
      });
      if (existingRoll) {
        failedRows.push({
          row: rowNum,
          admission_no: s.admission_no,
          reason: `Roll number ${s.roll_no} already exists in this section`,
        });
        continue;
      }

      const rawPassword = s.password || 'StudentPassword123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const studentId = idGenerator.nextId();

      await prisma.student.create({
        data: {
          id: studentId,
          section_id: sectionId,
          name: s.name,
          admission_no: s.admission_no,
          roll_no: s.roll_no,
          password_hash: passwordHash,
          contact_email: s.contact_email || null,
          contact_mobile: s.contact_mobile || s.parent_mobile || null,
        },
      });

      seenBatchAdmissionNos.add(s.admission_no);
      seenBatchRollNos.add(s.roll_no);
      successfulCount++;
    }

    if (successfulCount > 0) {
      await prisma.section.update({
        where: { id: sectionId },
        data: { strength: { increment: successfulCount } },
      });
    }

    return {
      total_processed: studentsList.length,
      successful_count: successfulCount,
      failed_count: failedRows.length,
      failed_rows: failedRows,
    };
  }

  /**
   * Retrieves full profile for a student including class and section details
   */
  public static async getStudentById(studentId: bigint, user: any) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        Section: {
          include: {
            Class: { select: { id: true, name: true, branch_id: true } },
          },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (user.role === UserRole.STUDENT) {
      if (user.userId !== studentId.toString()) {
        throw new AppError('Forbidden: Insufficient permissions', 403);
      }
    } else {
      await AcademicYearService.assertBranchAccess(user, student.Section.Class.branch_id);
    }

    return {
      id: student.id.toString(),
      name: student.name,
      admission_no: student.admission_no,
      roll_no: student.roll_no,
      contact_email: student.contact_email,
      contact_mobile: student.contact_mobile,
      class: {
        id: student.Section.Class.id.toString(),
        name: student.Section.Class.name,
      },
      section: {
        id: student.Section.id.toString(),
        name: student.Section.section_name,
      },
    };
  }

  /**
   * Updates student demographic or contact details
   */
  public static async updateStudent(
    studentId: bigint,
    user: any,
    data: { name?: string; roll_no?: string; contact_email?: string; contact_mobile?: string }
  ) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { Section: { include: { Class: { select: { branch_id: true } } } } },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, student.Section.Class.branch_id);

    if (data.roll_no && data.roll_no !== student.roll_no) {
      const existingRoll = await prisma.student.findUnique({
        where: {
          section_id_roll_no: {
            section_id: student.section_id,
            roll_no: data.roll_no,
          },
        },
      });
      if (existingRoll) {
        throw new AppError(
          `Roll number ${data.roll_no} already exists in this section`,
          409
        );
      }
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: data.name ?? undefined,
        roll_no: data.roll_no ?? undefined,
        contact_email: data.contact_email ?? undefined,
        contact_mobile: data.contact_mobile ?? undefined,
      },
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      admission_no: updated.admission_no,
      roll_no: updated.roll_no,
      contact_email: updated.contact_email,
      contact_mobile: updated.contact_mobile,
    };
  }

  /**
   * Deletes a student. Blocked if past exam submissions exist.
   */
  public static async deleteStudent(studentId: bigint, user: any) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { Section: { include: { Class: { select: { branch_id: true } } } } },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, student.Section.Class.branch_id);

    const submissionsCount = await prisma.submission.count({
      where: { student_id: studentId },
    });

    if (submissionsCount > 0) {
      throw new AppError(
        `Cannot delete student: ${submissionsCount} evaluated test submissions exist on record`,
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id: studentId } });
      if (student.Section.strength > 0) {
        await tx.section.update({
          where: { id: student.section_id },
          data: { strength: { decrement: 1 } },
        });
      }
    });

    return { message: 'Student deleted successfully' };
  }

  /**
   * Fetches test submissions, scorecards, and evaluation history for a student
   */
  public static async getStudentSubmissions(
    studentId: bigint,
    user: any,
    cursor?: bigint,
    limit: number = 10
  ) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { Section: { include: { Class: { select: { branch_id: true } } } } },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (user.role === UserRole.STUDENT) {
      if (user.userId !== studentId.toString()) {
        throw new AppError('Forbidden: Insufficient permissions', 403);
      }
    } else {
      await AcademicYearService.assertBranchAccess(user, student.Section.Class.branch_id);
    }

    const whereClause: any = { student_id: studentId };
    if (cursor) {
      whereClause.id = { gte: cursor };
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      take: limit + 1,
      include: {
        Assignment: {
          include: {
            ClassSubject: {
              include: {
                Subject: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const serialized = submissions.map((sub) => ({
      id: sub.id.toString(),
      assignment_title: sub.Assignment ? sub.Assignment.title : 'Assignment',
      subject_name: sub.Assignment?.ClassSubject?.Subject?.name || 'General',
      score: sub.score ? Number(sub.score) : null,
      max_score: sub.max_score ? Number(sub.max_score) : null,
      status: sub.status,
      submitted_at: sub.submitted_at.toISOString(),
    }));

    return formatPaginatedResponse(serialized, limit);
  }

  /**
   * Retrieves self profile for logged-in student
   */
  public static async getStudentProfile(studentId: bigint) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return {
      id: student.id.toString(),
      name: student.name,
      admission_no: student.admission_no,
      roll_no: student.roll_no,
      email: student.contact_email,
      mobile: student.contact_mobile,
      section_id: student.section_id.toString(),
    };
  }
}
