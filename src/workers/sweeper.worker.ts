import { prisma } from '../config/prisma';
import { SqsService } from '../services/sqs.service';
import { idGenerator } from '../utils/idGenerator';

export interface SweeperRunResult {
  timestamp: string;
  stuck_submissions_evaluated: number;
  stuck_submissions_retried: number;
  stuck_submissions_failed: number;
  stuck_batch_jobs_failed: number;
  stuck_assignments_rescued: number;
}

/**
 * Sweeper Worker: Rescues zombie/stuck jobs across the async AI evaluation pipeline.
 * Triggered periodically via EventBridge (e.g., every 15 minutes).
 */
export async function runSweeperJob(): Promise<SweeperRunResult> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  let retriedSubmissions = 0;
  let failedSubmissions = 0;
  let failedBatchJobs = 0;
  let rescuedAssignments = 0;

  console.log(`🧹 [SWEEPER] Running sweeper job at ${new Date().toISOString()}`);

  // ==========================================================
  // 1. Rescue Stuck Submissions (OCR or Evaluation)
  // ==========================================================
  const stuckSubmissions = await prisma.submission.findMany({
    where: {
      status: { in: ['submitted', 'ocr_processing'] },
      submitted_at: { lt: thirtyMinutesAgo },
    },
    include: {
      Assignment: true,
    },
    take: 50,
  });

  for (const sub of stuckSubmissions) {
    const isVeryOld = sub.submitted_at < twoHoursAgo;

    if (isVeryOld) {
      // Mark as failed so UI doesn't spin forever
      await prisma.submission.update({
        where: { id: sub.id },
        data: {
          status: 'failed',
          evaluation_status: 'failed',
          fallback_reason: 'Automated evaluation timed out. Please contact teacher or re-upload.',
        },
      });

      // Notify student
      await prisma.notification.create({
        data: {
          id: idGenerator.nextId(),
          type: 'SUBMISSION_FAILED',
          title: 'Evaluation Timeout',
          message: `Your paper evaluation for "${sub.Assignment?.title || 'Assignment'}" timed out and requires review.`,
          submission_id: sub.id,
          delivery_status: 'delivered',
        },
      });

      failedSubmissions++;
    } else {
      // Retry: Re-enqueue to the appropriate stage
      if (sub.ocr_text && sub.ocr_text.trim().length > 0) {
        // OCR succeeded but Evaluation hung -> Re-enqueue to Evaluation Queue
        await SqsService.dispatchPaperEvaluation({
          submission_id: sub.id.toString(),
          assignment_id: sub.assignment_id ? sub.assignment_id.toString() : '',
          student_id: sub.student_id.toString(),
          reasoning_model: sub.Assignment?.reasoning_model || 'gemini-2.5-flash',
          ocr_text: sub.ocr_text,
          language: 'English',
          timestamp: Date.now(),
        });
      } else {
        // OCR never finished -> Re-enqueue to OCR Queue
        const paperUrls = Array.isArray(sub.sample_paper_urls) && (sub.sample_paper_urls as string[]).length > 0
          ? (sub.sample_paper_urls as string[])
          : sub.sample_paper_url
            ? [sub.sample_paper_url]
            : [];

        if (paperUrls.length > 0) {
          await SqsService.dispatchPaperOcr({
            submission_id: sub.id.toString(),
            assignment_id: sub.assignment_id ? sub.assignment_id.toString() : '',
            student_id: sub.student_id.toString(),
            paper_urls: paperUrls,
            timestamp: Date.now(),
          });
        }
      }
      retriedSubmissions++;
    }
  }

  // ==========================================================
  // 2. Rescue Stuck Batch Jobs (Bulk Paper Stacks)
  // ==========================================================
  const stuckBatchJobs = await prisma.batchJob.findMany({
    where: {
      status: { in: ['queued', 'processing'] },
      created_at: { lt: thirtyMinutesAgo },
    },
    take: 20,
  });

  for (const job of stuckBatchJobs) {
    await prisma.batchJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        stage: 'error',
        status_message: 'Batch splitting timed out. Rescued by Sweeper Lambda.',
      },
    });
    failedBatchJobs++;
  }

  // ==========================================================
  // 3. Rescue Stuck Assignments (Question Paper Ingestion)
  // ==========================================================
  const stuckAssignments = await prisma.assignment.findMany({
    where: {
      status: 'processing',
      created_at: { lt: thirtyMinutesAgo },
    },
    take: 20,
  });

  for (const asgn of stuckAssignments) {
    if (asgn.question_paper_url) {
      // Re-enqueue to Assignment Ingestion Queue
      await SqsService.dispatchAssignmentOcr({
        assignment_id: asgn.id.toString(),
        section_id: asgn.section_id.toString(),
        class_subject_id: asgn.class_subject_id.toString(),
        question_paper_url: asgn.question_paper_url,
        answer_key_url: asgn.answer_key_url || undefined,
        subject_name: 'General',
        language: 'English',
        timestamp: Date.now(),
      });
      rescuedAssignments++;
    } else {
      await prisma.assignment.update({
        where: { id: asgn.id },
        data: {
          status: 'draft',
        },
      });
    }
  }

  const result: SweeperRunResult = {
    timestamp: new Date().toISOString(),
    stuck_submissions_evaluated: stuckSubmissions.length,
    stuck_submissions_retried: retriedSubmissions,
    stuck_submissions_failed: failedSubmissions,
    stuck_batch_jobs_failed: failedBatchJobs,
    stuck_assignments_rescued: rescuedAssignments,
  };

  console.log(`✅ [SWEEPER] Completed run:`, JSON.stringify(result));
  return result;
}
