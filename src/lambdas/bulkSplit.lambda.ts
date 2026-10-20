import { processBulkSplitJob } from '../workers/bulkSplit.worker';

export const handler = async (event: any) => {
  console.log(`[BULK SPLIT LAMBDA] Received ${event.Records?.length || 0} SQS record(s)`);

  for (const record of event.Records || []) {
    try {
      const payload = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
      console.log(`[BULK SPLIT LAMBDA] Processing batch job ${payload.job_id}`);
      await processBulkSplitJob(payload);
    } catch (err: any) {
      console.error(`❌ [BULK SPLIT LAMBDA] Error processing record:`, err);
      throw err;
    }
  }

  return { statusCode: 200, body: 'Bulk split batch processed' };
};
