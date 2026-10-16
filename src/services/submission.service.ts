import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { AcademicYearService } from './academicYear.service';

export interface AssignmentSubmissionsQuery {
  status?: string;
  cursor?: string;
  limit?: number;
}

export interface ApproveSubmissionBody {
  final_score?: number;
  final_feedback?: string;
  final_hint?: string;
}

export interface OverrideSubmissionBody {
  score: number;
  feedback?: string;
  question_breakdown?: any[];
}

export interface BulkSubmissionBody {
  assignment_id: string | number;
  bulk_mode?: string;
  total_files?: number;
  files?: any;
  sample_paper_urls?: string[];
  file_urls?: string[];
}

export class SubmissionService {
  /**
   * Lists student submissions for an assignment with filtering and cursor pagination
   */
  public static async getAssignmentSubmissions(
    user: any,
    assignmentIdStr: string,
    query: AssignmentSubmissionsQuery
  ) {
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 10) : 10;
    const cursor = query.cursor ? parseBigInt(query.cursor, 'cursor') : undefined;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Section: {
          include: {
            Class: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, assignment.Section.Class.branch_id);

    const whereClause: any = {
      assignment_id: assignmentId,
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      take: limit + 1,
      orderBy: { id: 'desc' },
      include: {
        Student: true,
      },
    });

    const hasNextPage = submissions.length > limit;
    const items = hasNextPage ? submissions.slice(0, limit) : submissions;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id.toString() : null;

    const data = items.map((s) => ({
      id: s.id.toString(),
      student_id: s.student_id.toString(),
      student_name: s.Student.name,
      roll_no: s.Student.roll_no,
      score:
        s.final_score !== null
          ? Number(s.final_score)
          : s.score !== null
            ? Number(s.score)
            : null,
      max_score: s.max_score !== null ? Number(s.max_score) : 40,
      status: s.status,
      submitted_at: s.submitted_at.toISOString(),
    }));

    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Retrieves complete submission details, OCR transcript, score breakdown, and feedback
   */
  public static async getSubmissionById(user: any, submissionIdStr: string) {
    const submissionId = parseBigInt(submissionIdStr, 'submission_id');

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Student: true,
        Assignment: {
          include: {
            Section: {
              include: {
                Class: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (submission.Assignment) {
      await AcademicYearService.assertBranchAccess(
        user,
        submission.Assignment.Section.Class.branch_id
      );
    }

    const samplePaperUrls =
      Array.isArray(submission.sample_paper_urls) &&
      (submission.sample_paper_urls as any[]).length > 0
        ? (submission.sample_paper_urls as string[])
        : submission.sample_paper_url
          ? [submission.sample_paper_url]
          : [];

    const questionBreakdown =
      (submission.final_evaluation_json as any) ||
      (submission.ai_evaluation_json as any) || [
        {
          question_number: 1,
          marks_awarded: Number(submission.final_score ?? submission.score ?? 0),
          max_marks: Number(submission.max_score ?? 40),
          verdict:
            Number(submission.final_score ?? submission.score ?? 0) > 0 ? 'correct' : 'incorrect',
        },
      ];

    return {
      id: submission.id.toString(),
      assignment_id: submission.assignment_id ? submission.assignment_id.toString() : null,
      student: {
        id: submission.Student.id.toString(),
        name: submission.Student.name,
        roll_no: submission.Student.roll_no,
      },
      sample_paper_urls: samplePaperUrls,
      ocr_text: submission.ocr_text || 'Sample answer sheet text extracted.',
      score:
        submission.final_score !== null
          ? Number(submission.final_score)
          : submission.score !== null
            ? Number(submission.score)
            : 0,
      max_score: submission.max_score !== null ? Number(submission.max_score) : 40,
      feedback: submission.final_feedback || submission.feedback || '',
      socratic_hint: submission.final_hint || submission.socratic_hint || '',
      status: submission.status,
      question_breakdown: questionBreakdown,
    };
  }

  /**
   * Teacher approves the graded submission, locks the score and notifies student
   */
  public static async approveSubmission(
    user: any,
    submissionIdStr: string,
    body: ApproveSubmissionBody
  ) {
    const submissionId = parseBigInt(submissionIdStr, 'submission_id');

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Assignment: {
          include: {
            Section: {
              include: {
                Class: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (submission.Assignment) {
      await AcademicYearService.assertBranchAccess(
        user,
        submission.Assignment.Section.Class.branch_id
      );
    }

    const finalScore =
      body.final_score !== undefined
        ? body.final_score
        : submission.final_score !== null
          ? submission.final_score
          : submission.score;

    const finalFeedback =
      body.final_feedback !== undefined
        ? body.final_feedback
        : submission.final_feedback || submission.feedback;

    const finalHint =
      body.final_hint !== undefined
        ? body.final_hint
        : submission.final_hint || submission.socratic_hint;

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'approved',
        ...(finalScore !== undefined && finalScore !== null && { final_score: finalScore }),
        ...(finalFeedback !== undefined && { final_feedback: finalFeedback }),
        ...(finalHint !== undefined && { final_hint: finalHint }),
      },
      include: {
        Assignment: true,
        Student: true,
      },
    });

    // Create student grade notification
    const notificationId = idGenerator.nextId();
    await prisma.notification.create({
      data: {
        id: notificationId,
        type: 'GRADE_RELEASED',
        title: 'Scorecard Released',
        message: `Your scorecard for "${updated.Assignment?.title || 'Assignment'}" has been approved and released.`,
        submission_id: updated.id,
      },
    });

    return {
      id: updated.id.toString(),
      status: 'approved',
      final_score:
        updated.final_score !== null
          ? Number(updated.final_score)
          : updated.score !== null
            ? Number(updated.score)
            : null,
      final_feedback: updated.final_feedback || updated.feedback || null,
    };
  }

  /**
   * Teacher manually overrides submission score, feedback and question marks
   */
  public static async overrideSubmission(
    user: any,
    submissionIdStr: string,
    body: OverrideSubmissionBody
  ) {
    const submissionId = parseBigInt(submissionIdStr, 'submission_id');

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Assignment: {
          include: {
            Section: {
              include: {
                Class: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (submission.Assignment) {
      await AcademicYearService.assertBranchAccess(
        user,
        submission.Assignment.Section.Class.branch_id
      );
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: body.score,
        final_score: body.score,
        status: 'approved',
        ...(body.feedback && { final_feedback: body.feedback, feedback: body.feedback }),
        ...(body.question_breakdown && { final_evaluation_json: body.question_breakdown }),
      },
    });

    return {
      id: updated.id.toString(),
      score: Number(updated.final_score ?? updated.score),
      status: 'approved',
    };
  }

  /**
   * Teacher bulk uploads physical answer sheets stack for whole section (initiates BatchJob)
   */
  public static async bulkUploadSubmissions(user: any, body: BulkSubmissionBody) {
    const assignmentId = parseBigInt(body.assignment_id, 'assignment_id');

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Section: {
          include: {
            Class: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, assignment.Section.Class.branch_id);

    const rawFiles = body.file_urls || body.sample_paper_urls || body.files;
    let totalFiles = 1;
    if (body.total_files && typeof body.total_files === 'number' && body.total_files > 0) {
      totalFiles = body.total_files;
    } else if (Array.isArray(rawFiles) && rawFiles.length > 0) {
      totalFiles = rawFiles.length;
    }

    const jobId = idGenerator.nextId();
    const batchJob = await prisma.batchJob.create({
      data: {
        id: jobId,
        assignment_id: assignmentId,
        bulk_mode: body.bulk_mode || 'combined_pdf',
        status: 'queued',
        stage: 'splitting',
        total_files: totalFiles,
        processed_count: 0,
        successful_count: 0,
        failed_count: 0,
        status_message: 'Batch paper stack queued for splitting and evaluation',
      },
    });

    return {
      job_id: batchJob.id.toString(),
      status: batchJob.status,
      stage: batchJob.stage,
      total_files: batchJob.total_files,
      poll_url: `/api/submissions/batch/${batchJob.id.toString()}`,
    };
  }

  /**
   * Polls batch paper splitting and evaluation job status
   */
  public static async getBatchJobStatus(user: any, jobIdStr: string) {
    const jobId = parseBigInt(jobIdStr, 'job_id');

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: jobId },
      include: {
        Assignment: {
          include: {
            Section: {
              include: {
                Class: true,
              },
            },
          },
        },
      },
    });

    if (!batchJob) {
      throw new AppError('Batch job not found', 404);
    }

    await AcademicYearService.assertBranchAccess(
      user,
      batchJob.Assignment.Section.Class.branch_id
    );

    const createdSubmissions = Array.isArray(batchJob.split_progress_json)
      ? batchJob.split_progress_json
      : [];

    return {
      job_id: batchJob.id.toString(),
      status: batchJob.status,
      stage: batchJob.stage,
      total_files: batchJob.total_files,
      processed_count: batchJob.processed_count,
      successful_count: batchJob.successful_count,
      failed_count: batchJob.failed_count,
      created_submissions: createdSubmissions,
    };
  }
}
