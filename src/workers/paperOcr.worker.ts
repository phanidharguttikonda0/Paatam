import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { S3Service } from '../services/s3.service';
import { OcrService } from '../services/ocr.service';
import { SqsService, PaperOcrMessagePayload } from '../services/sqs.service';

export async function processPaperOcrJob(payload: PaperOcrMessagePayload) {
  const submissionId = parseBigInt(payload.submission_id, 'submission_id');

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      Assignment: true,
    },
  });

  if (!submission) {
    throw new Error(`Submission ${payload.submission_id} not found`);
  }

  // 1. Update status to ocr_processing
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: 'ocr_processing',
      evaluation_status: 'transcribing_handwriting',
    },
  });

  try {
    // 2. Download paper pages from S3 in parallel
    const urls =
      payload.paper_urls && payload.paper_urls.length > 0
        ? payload.paper_urls
        : submission.sample_paper_url
          ? [submission.sample_paper_url]
          : [];

    const buffers = await Promise.all(urls.map((url) => S3Service.downloadBuffer(url)));

    // 3. Execute Handwriting OCR extraction
    const { ocrText } = await OcrService.performOcrPages(
      buffers,
      payload.language || 'English',
      payload.subject_name || 'General'
    );

    // 4. Update Submission with transcribed text
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ocr_text: ocrText,
        status: 'ocr_completed',
        evaluation_status: 'ready_for_evaluation',
      },
    });

    // 5. Forward dispatch to Queue 2: Rubric Evaluation Queue
    const reasoningModel =
      submission.Assignment?.reasoning_model && !submission.Assignment.reasoning_model.includes('3.8')
        ? submission.Assignment.reasoning_model
        : (process.env.GEMINI_MODEL && !process.env.GEMINI_MODEL.includes('3.8'))
          ? process.env.GEMINI_MODEL
          : 'gemini-3.6-flash';

    await SqsService.dispatchPaperEvaluation({
      submission_id: payload.submission_id,
      assignment_id: payload.assignment_id,
      student_id: payload.student_id,
      reasoning_model: reasoningModel,
      ocr_text: ocrText,
      language: payload.language || 'English',
      timestamp: Date.now(),
    });

    return {
      submission_id: payload.submission_id,
      ocr_length: ocrText.length,
      status: 'ocr_completed',
    };
  } catch (ocrErr: any) {
    console.error(`❌ [PAPER OCR WORKER] OCR job failed for submission ${payload.submission_id}:`, ocrErr.message);
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'failed',
        evaluation_status: 'failed',
      },
    });
    throw ocrErr;
  }
}
