import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { parseBigInt } from '../utils/bigint';
import { AcademicYearService } from './academicYear.service';
import { UserRole, BRANCH_ADMIN_ROLES } from '../enums/role.enum';

export class AnalyticsService {
  /**
   * Helper to derive branch ID and tenant scope for analytics queries
   */
  private static async getTenantScope(user: any, queryBranchId?: string) {
    if (user.role === UserRole.TEACHER) {
      const teacherId = parseBigInt(user.userId, 'userId');
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          TeacherSubjects: true,
          Sections: true,
        },
      });
      if (!teacher) {
        throw new AppError('Teacher not found', 404);
      }
      return {
        branchId: teacher.branch_id,
        teacherSectionIds: teacher.Sections.map((s) => s.id),
        teacherSubjectIds: teacher.TeacherSubjects.map((ts) => ts.id),
      };
    }

    if (BRANCH_ADMIN_ROLES.includes(user.role)) {
      const adminId = parseBigInt(user.userId, 'userId');
      const accesses = await prisma.adminBranchAccess.findMany({
        where: { admin_id: adminId },
        select: { branch_id: true },
      });
      const branchIds = accesses.map((a) => a.branch_id);
      if (queryBranchId) {
        const reqBranchId = parseBigInt(queryBranchId, 'branch_id');
        if (!branchIds.some((b) => b === reqBranchId)) {
          throw new AppError('Forbidden: Access denied to requested branch', 403);
        }
        return { branchId: reqBranchId, branchIds: [reqBranchId] };
      }
      return { branchId: branchIds[0], branchIds };
    }

    if (user.role === UserRole.CORPORATE_ADMIN) {
      if (queryBranchId) {
        const reqBranchId = parseBigInt(queryBranchId, 'branch_id');
        await AcademicYearService.assertBranchAccess(user, reqBranchId);
        return { branchId: reqBranchId };
      }
      return {};
    }

    throw new AppError('Forbidden', 403);
  }

  /**
   * GET /api/analytics/overview
   */
  public static async getOverview(user: any, query: any) {
    const scope = await this.getTenantScope(user, query.branch_id);

    const assignmentWhere: any = {};
    if (scope.branchId) {
      assignmentWhere.Section = {
        Class: {
          branch_id: scope.branchId,
        },
      };
    }

    if (scope.teacherSectionIds && scope.teacherSubjectIds) {
      assignmentWhere.OR = [
        { section_id: { in: scope.teacherSectionIds } },
        { teacher_subject_id: { in: scope.teacherSubjectIds } },
      ];
    }

    if (query.class_id) {
      const classId = parseBigInt(query.class_id, 'class_id');
      assignmentWhere.Section = {
        ...(assignmentWhere.Section || {}),
        class_id: classId,
      };
    }

    if (query.section_id) {
      const sectionId = parseBigInt(query.section_id, 'section_id');
      assignmentWhere.section_id = sectionId;
    }

    if (query.subject_id) {
      const subjectId = parseBigInt(query.subject_id, 'subject_id');
      assignmentWhere.ClassSubject = {
        subject_id: subjectId,
      };
    }

    if (query.assignment_id) {
      assignmentWhere.id = parseBigInt(query.assignment_id, 'assignment_id');
    }

    // Fetch assignments with subjects and evaluated submissions
    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        ClassSubject: {
          include: {
            Subject: true,
          },
        },
        Submissions: {
          select: {
            id: true,
            score: true,
            final_score: true,
            max_score: true,
            status: true,
            student_id: true,
          },
        },
        Section: {
          select: {
            id: true,
            strength: true,
          },
        },
      },
    });

    const totalAssignments = assignments.length;
    let totalSubmissions = 0;
    let evaluatedCount = 0;
    let totalPercentageSum = 0;
    let passCount = 0;

    const gradeDistribution = {
      A: 0, // >= 85%
      B: 0, // 70-84%
      C: 0, // 50-69%
      D: 0, // 35-49%
      F: 0, // < 35%
    };

    const scoreBuckets = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0,
    };

    const subjectStatsMap = new Map<string, { subject_name: string; totalScore: number; count: number }>();
    const evaluatedStudentIds = new Set<string>();

    for (const assignment of assignments) {
      const subjectName = assignment.ClassSubject?.Subject?.name || 'General';

      for (const sub of assignment.Submissions) {
        totalSubmissions++;
        const effectiveScore = sub.final_score !== null ? Number(sub.final_score) : sub.score !== null ? Number(sub.score) : null;
        const maxScore = sub.max_score !== null ? Number(sub.max_score) : 40;

        if (effectiveScore !== null && maxScore > 0) {
          evaluatedCount++;
          evaluatedStudentIds.add(sub.student_id.toString());
          const percentage = Math.min(100, Math.max(0, (effectiveScore / maxScore) * 100));
          totalPercentageSum += percentage;

          if (percentage >= 35) {
            passCount++;
          }

          // Grade distribution
          if (percentage >= 85) gradeDistribution.A++;
          else if (percentage >= 70) gradeDistribution.B++;
          else if (percentage >= 50) gradeDistribution.C++;
          else if (percentage >= 35) gradeDistribution.D++;
          else gradeDistribution.F++;

          // Score buckets
          if (percentage <= 20) scoreBuckets['0-20%']++;
          else if (percentage <= 40) scoreBuckets['21-40%']++;
          else if (percentage <= 60) scoreBuckets['41-60%']++;
          else if (percentage <= 80) scoreBuckets['61-80%']++;
          else scoreBuckets['81-100%']++;

          // Subject stats
          const existing = subjectStatsMap.get(subjectName) || { subject_name: subjectName, totalScore: 0, count: 0 };
          existing.totalScore += percentage;
          existing.count++;
          subjectStatsMap.set(subjectName, existing);
        }
      }
    }

    const averageScore = evaluatedCount > 0 ? Math.round((totalPercentageSum / evaluatedCount) * 10) / 10 : 0;
    const passPercentage = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 1000) / 10 : 0;

    const subjectPerformance = Array.from(subjectStatsMap.values()).map((s) => ({
      subject_name: s.subject_name,
      average_score: Math.round((s.totalScore / s.count) * 10) / 10,
      total_evaluations: s.count,
    }));

    return {
      total_assignments: totalAssignments,
      total_submissions: totalSubmissions,
      evaluated_submissions: evaluatedCount,
      unique_students_evaluated: evaluatedStudentIds.size,
      average_score_percentage: averageScore,
      pass_percentage: passPercentage,
      grade_distribution: gradeDistribution,
      score_distribution: scoreBuckets,
      subject_performance: subjectPerformance,
    };
  }

  /**
   * GET /api/analytics/students
   */
  public static async getStudentsAnalytics(user: any, query: any) {
    const scope = await this.getTenantScope(user, query.branch_id);
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const cursor = query.cursor ? parseBigInt(query.cursor, 'cursor') : undefined;

    const studentWhere: any = {};
    if (scope.branchId) {
      studentWhere.Section = {
        Class: {
          branch_id: scope.branchId,
        },
      };
    }

    if (query.class_id) {
      const classId = parseBigInt(query.class_id, 'class_id');
      studentWhere.Section = {
        ...(studentWhere.Section || {}),
        class_id: classId,
      };
    }

    if (query.section_id) {
      const sectionId = parseBigInt(query.section_id, 'section_id');
      studentWhere.section_id = sectionId;
    }

    if (cursor) {
      studentWhere.id = { lt: cursor };
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      take: limit + 1,
      orderBy: { id: 'desc' },
      include: {
        Section: {
          include: {
            Class: true,
          },
        },
        Submissions: {
          select: {
            score: true,
            final_score: true,
            max_score: true,
            status: true,
          },
        },
      },
    });

    const hasNextPage = students.length > limit;
    const items = hasNextPage ? students.slice(0, limit) : students;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id.toString() : null;

    const data = items.map((student) => {
      let totalScorePercentage = 0;
      let evaluatedCount = 0;
      let highest = 0;
      let lowest = 100;

      for (const sub of student.Submissions) {
        const effScore = sub.final_score !== null ? Number(sub.final_score) : sub.score !== null ? Number(sub.score) : null;
        const maxScore = sub.max_score !== null ? Number(sub.max_score) : 40;

        if (effScore !== null && maxScore > 0) {
          evaluatedCount++;
          const pct = Math.min(100, Math.max(0, (effScore / maxScore) * 100));
          totalScorePercentage += pct;
          if (pct > highest) highest = pct;
          if (pct < lowest) lowest = pct;
        }
      }

      const avg = evaluatedCount > 0 ? Math.round((totalScorePercentage / evaluatedCount) * 10) / 10 : null;
      let grade = 'N/A';
      if (avg !== null) {
        if (avg >= 85) grade = 'A';
        else if (avg >= 70) grade = 'B';
        else if (avg >= 50) grade = 'C';
        else if (avg >= 35) grade = 'D';
        else grade = 'F';
      }

      return {
        id: student.id.toString(),
        name: student.name,
        roll_no: student.roll_no,
        admission_no: student.admission_no,
        class_name: student.Section?.Class?.name || '',
        section_name: student.Section?.section_name || '',
        total_submissions: student.Submissions.length,
        evaluated_submissions: evaluatedCount,
        average_score: avg,
        grade,
        highest_score: evaluatedCount > 0 ? Math.round(highest * 10) / 10 : null,
        lowest_score: evaluatedCount > 0 ? Math.round(lowest * 10) / 10 : null,
      };
    });

    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }
}
