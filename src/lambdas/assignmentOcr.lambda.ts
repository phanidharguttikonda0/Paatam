import { processAssignmentOcrJob } from '../workers/assignmentOcr.worker';

export const handler = async (event: any) => {
  console.log(`[ASSIGNMENT OCR LAMBDA] Received ${event.Records?.length || 0} SQS record(s)`);

  for (const record of event.Records || []) {
    try {
      const payload = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
      console.log(`[ASSIGNMENT OCR LAMBDA] Processing assignment ${payload.assignment_id}`);
      await processAssignmentOcrJob(payload);
    } catch (err: any) {
      console.error(`❌ [ASSIGNMENT OCR LAMBDA] Error processing record:`, err);
      throw err; // SQS will retry or forward to DLQ
    }
  }

  return { statusCode: 200, body: 'Assignment OCR batch processed' };
};
