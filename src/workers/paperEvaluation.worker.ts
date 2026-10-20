import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { EvaluationService } from '../services/evaluation.service';
import { PaperEvaluationMessagePayload } from '../services/sqs.service';

export async function processPaperEvaluationJob(payload: PaperEvaluationMessagePayload) {
  const submissionId = parseBigInt(payload.submission_id, 'submission_id');
  const assignmentId = parseBigInt(payload.assignment_id, 'assignment_id');

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      Assignment: true,
    },
  });

  if (!submission) {
    throw new Error(`Submission ${payload.submission_id} not found`);
  }

  // 1. Mark status as evaluating
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: 'evaluating',
      evaluation_status: 'running_rubric_evaluation',
    },
  });

  const assignment = submission.Assignment;
  if (!assignment) {
    throw new Error(`Assignment not linked for submission ${payload.submission_id}`);
  }

  const questions = Array.isArray(assignment.questions_json)
    ? (assignment.questions_json as any[])
    : [];

  const answerKeyText = assignment.answer_key_text || '';
  const ocrText = payload.ocr_text || submission.ocr_text || '';
  const reasoningModel =
    payload.reasoning_model || assignment.reasoning_model || 'gemini-2.5-flash';

  // 2. Execute rubric evaluation, scoring, and Socratic hint synthesis
  const result = await EvaluationService.evaluateStudentSubmission(
    questions,
    answerKeyText,
    ocrText,
    reasoningModel,
    payload.language || 'English'
  );

  // 3. Persist evaluation results into PostgreSQL
  const updatedSubmission = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      score: result.score,
      max_score: result.maxScore,
      feedback: result.feedback,
      socratic_hint: result.socraticHint,
      ai_evaluation_json: result.questionEvaluations as any,
      status: 'graded',
      evaluation_status: 'completed',
    },
  });

  // 4. Trigger student notification
  const notificationId = idGenerator.nextId();
  await prisma.notification.create({
    data: {
      id: notificationId,
      type: 'GRADE_RELEASED',
      title: 'Scorecard Available',
      message: `Your exam "${assignment.title}" has been evaluated with a score of ${result.score}/${result.maxScore}.`,
      submission_id: updatedSubmission.id,
      delivery_status: 'delivered',
    },
  });

  return {
    submission_id: updatedSubmission.id.toString(),
    score: Number(updatedSubmission.score),
    max_score: Number(updatedSubmission.max_score),
    status: updatedSubmission.status,
  };
}
