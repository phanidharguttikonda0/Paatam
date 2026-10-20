import { processPaperOcrJob } from '../workers/paperOcr.worker';

export const handler = async (event: any) => {
  console.log(`[PAPER OCR LAMBDA] Received ${event.Records?.length || 0} SQS record(s)`);

  for (const record of event.Records || []) {
    try {
      const payload = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
      console.log(`[PAPER OCR LAMBDA] Processing submission ${payload.submission_id}`);
      await processPaperOcrJob(payload);
    } catch (err: any) {
      console.error(`❌ [PAPER OCR LAMBDA] Error processing record:`, err);
      throw err;
    }
  }

  return { statusCode: 200, body: 'Paper OCR batch processed' };
};
