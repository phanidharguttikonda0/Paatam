import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { S3Service } from '../services/s3.service';
import { QuestionPaperService } from '../services/questionPaper.service';
import { AssignmentOcrMessagePayload } from '../services/sqs.service';

export async function processAssignmentOcrJob(payload: AssignmentOcrMessagePayload) {
  const assignmentId = parseBigInt(payload.assignment_id, 'assignment_id');

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new Error(`Assignment ${payload.assignment_id} not found`);
  }

  // 1. Download question paper PDF buffer from S3
  const paperBuffer = await S3Service.downloadBuffer(payload.question_paper_url);

  // 2. Extract questions and dynamic reasoning model
  const { questions, reasoning_model } = await QuestionPaperService.extractQuestionsFromPaper(
    paperBuffer,
    payload.subject_name || 'General',
    payload.language || 'English'
  );

  // 3. Extract answer key if provided
  let answerKeyText: string | null = null;
  if (payload.answer_key_url) {
    try {
      const keyBuffer = await S3Service.downloadBuffer(payload.answer_key_url);
      answerKeyText = await QuestionPaperService.extractAnswerKey(
        keyBuffer,
        payload.subject_name || 'General'
      );
    } catch (err: any) {
      console.warn(`⚠️ [ASSIGNMENT OCR WORKER] Failed to extract answer key:`, err.message);
    }
  }

  // 4. Update database
  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      questions_json: questions as any,
      reasoning_model,
      ...(answerKeyText && { answer_key_text: answerKeyText }),
      status: 'ready',
    },
  });

  return {
    assignment_id: updated.id.toString(),
    questions_count: questions.length,
    reasoning_model: updated.reasoning_model,
    status: updated.status,
  };
}
