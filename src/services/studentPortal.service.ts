import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';
import { parseBigInt } from '../utils/bigint';
import { formatPaginatedResponse } from '../utils/pagination';
import { AppError } from '../exceptions/AppError';

export class StudentPortalService {
  /**
   * Primary landing dashboard for authenticated student
   */
  public static async getDashboard(studentUserId: string) {
    const studentId = parseBigInt(studentUserId, 'userId');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        Section: {
          include: {
            Class: {
              include: {
                ClassSubjects: {
                  include: {
                    Subject: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Retrieve class teacher details if assigned
    let classTeacher = null;
    if (student.Section.class_teacher_id) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: student.Section.class_teacher_id },
        select: {
          id: true,
          name: true,
          contact_email: true,
        },
      });

      if (teacher) {
        classTeacher = {
          id: teacher.id.toString(),
          name: teacher.name,
          email: teacher.contact_email,
        };
      }
    }

    // List active subjects in the class
    const subjects = student.Section.Class.ClassSubjects.map((cs: any) => ({
      id: cs.Subject.id.toString(),
      name: cs.Subject.name,
      code: cs.Subject.code || null,
    }));

    // Assignment counts
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        section_id: student.section_id,
        status: { in: ['published', 'ready', 'dispatched'] },
      },
      select: { id: true },
    });

    const activeAssignmentIds = activeAssignments.map((a: any) => a.id);

    const completedSubmissions = await prisma.submission.findMany({
      where: {
        student_id: studentId,
        assignment_id: { in: activeAssignmentIds },
      },
      select: { assignment_id: true },
    });

    const completedAssignmentIds = new Set(
      completedSubmissions.map((s: any) => s.assignment_id?.toString())
    );

    const completedCount = completedAssignmentIds.size;
    const pendingCount = Math.max(0, activeAssignments.length - completedCount);

    return {
      class_name: student.Section.Class.name,
      section_name: student.Section.section_name,
      class_teacher: classTeacher,
      subjects,
      assignments_summary: {
        pending_count: pendingCount,
        completed_count: completedCount,
      },
    };
  }

  /**
   * Retrieves assignments available for the student's section
   */
  public static async getAssignments(
    studentUserId: string,
    filterStatus?: string,
    cursor?: string,
    limitNum?: number
  ) {
    const studentId = parseBigInt(studentUserId, 'userId');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { section_id: true },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const limit = limitNum ? Math.min(limitNum, 10) : 10;

    let cursorObj = undefined;
    if (cursor) {
      cursorObj = { id: parseBigInt(cursor, 'cursor') };
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        section_id: student.section_id,
        status: { in: ['published', 'ready', 'dispatched'] },
      },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      orderBy: { id: 'desc' },
      include: {
        ClassSubject: {
          include: {
            Subject: true,
          },
        },
        Submissions: {
          where: { student_id: studentId },
          select: { id: true },
        },
      },
    });

    const mapped = assignments.map((a: any) => {
      const isSubmitted = a.Submissions.length > 0;
      const submissionId = isSubmitted ? a.Submissions[0].id.toString() : null;

      return {
        id: a.id.toString(),
        title: a.title,
        subject_name: a.ClassSubject?.Subject?.name || 'Subject',
        duration_minutes: a.duration_minutes,
        due_date: a.due_date,
        is_submitted: isSubmitted,
        submission_id: submissionId,
      };
    });

    const filtered = filterStatus
      ? mapped.filter((item: any) =>
          filterStatus === 'completed' ? item.is_submitted : !item.is_submitted
        )
      : mapped;

    return formatPaginatedResponse(filtered, limit);
  }

  /**
   * Retrieves assignment details for student to review and take exam
   */
  public static async getAssignmentDetails(studentUserId: string, assignmentIdStr: string) {
    const studentId = parseBigInt(studentUserId, 'userId');
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { section_id: true },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        ClassSubject: {
          include: {
            Subject: true,
          },
        },
      },
    });

    if (!assignment || assignment.section_id !== student.section_id) {
      throw new AppError('Assignment not found', 404);
    }

    return {
      id: assignment.id.toString(),
      title: assignment.title,
      subject: assignment.ClassSubject?.Subject?.name || 'Subject',
      duration_minutes: assignment.duration_minutes,
      question_paper_url: assignment.question_paper_url,
      due_date: assignment.due_date,
      questions: assignment.questions_json,
    };
  }

  /**
   * Submits student handwritten answer sheets for an assignment
   */
  public static async submitAssignment(
    studentUserId: string,
    assignmentIdStr: string,
    body: any
  ) {
    const studentId = parseBigInt(studentUserId, 'userId');
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, section_id: true },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.section_id !== student.section_id) {
      throw new AppError('Assignment not found', 404);
    }

    const rawUrls =
      body.sample_paper_urls ||
      (body.sample_paper_url ? [body.sample_paper_url] : ['https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/sheet-1.pdf']);

    const samplePaperUrls = Array.isArray(rawUrls) ? rawUrls : [String(rawUrls)];
    const samplePaperUrl = samplePaperUrls[0];

    const submissionId = idGenerator.nextId();

    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        assignment_id: assignment.id,
        student_id: studentId,
        sample_paper_url: samplePaperUrl,
        sample_paper_urls: samplePaperUrls,
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    // Generate student confirmation notification
    const notificationId = idGenerator.nextId();
    await prisma.notification.create({
      data: {
        id: notificationId,
        type: 'SUBMISSION_RECEIVED',
        title: 'Assignment Submitted',
        message: `Your answer sheets for "${assignment.title}" have been submitted successfully.`,
        submission_id: submission.id,
        delivery_status: 'delivered',
      },
    });

    return {
      submission_id: submission.id.toString(),
      assignment_id: assignment.id.toString(),
      student_id: student.id.toString(),
      status: submission.status,
      submitted_at: submission.submitted_at,
      files_uploaded_count: samplePaperUrls.length,
    };
  }

  /**
   * Retrieves graded scorecard and teacher feedback for student
   */
  public static async getSubmissionScorecard(
    studentUserId: string,
    submissionIdStr: string
  ) {
    const studentId = parseBigInt(studentUserId, 'userId');
    const submissionId = parseBigInt(submissionIdStr, 'submission_id');

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Assignment: true,
      },
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (submission.student_id !== studentId) {
      throw new AppError('Forbidden: Access denied to this submission', 403);
    }

    const score =
      submission.final_score !== null
        ? Number(submission.final_score)
        : submission.score !== null
        ? Number(submission.score)
        : null;

    const maxScore =
      submission.max_score !== null ? Number(submission.max_score) : null;

    return {
      id: submission.id.toString(),
      assignment_title: submission.Assignment?.title || 'Assignment',
      status: submission.status,
      score,
      max_score: maxScore,
      feedback: submission.final_feedback || submission.feedback || null,
      socratic_hint: submission.final_hint || submission.socratic_hint || null,
      submitted_at: submission.submitted_at,
    };
  }

  /**
   * Retrieves notification feed for authenticated student
   */
  public static async getNotifications(studentUserId: string) {
    const studentId = parseBigInt(studentUserId, 'userId');

    const notifications = await prisma.notification.findMany({
      where: {
        Submission: {
          student_id: studentId,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return notifications.map((n: any) => ({
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: false,
    }));
  }
}
