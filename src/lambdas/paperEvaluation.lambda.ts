import { processPaperEvaluationJob } from '../workers/paperEvaluation.worker';

export const handler = async (event: any) => {
  console.log(`[PAPER EVALUATION LAMBDA] Received ${event.Records?.length || 0} SQS record(s)`);

  for (const record of event.Records || []) {
    try {
      const payload = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
      console.log(`[PAPER EVALUATION LAMBDA] Processing submission ${payload.submission_id}`);
      await processPaperEvaluationJob(payload);
    } catch (err: any) {
      console.error(`❌ [PAPER EVALUATION LAMBDA] Error processing record:`, err);
      throw err;
    }
  }

  return { statusCode: 200, body: 'Paper evaluation batch processed' };
};
