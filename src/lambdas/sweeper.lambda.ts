import { runSweeperJob } from '../workers/sweeper.worker';

/**
 * AWS Lambda entrypoint triggered periodically by AWS EventBridge (e.g. rate(15 minutes)).
 * Rescues stuck, failed, or timed-out jobs across the SQS/Lambda AI pipeline.
 */
export const handler = async (event: any) => {
  console.log(`[SWEEPER LAMBDA] Invoked by EventBridge at ${new Date().toISOString()}`);

  try {
    const summary = await runSweeperJob();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Sweeper completed successfully',
        summary,
      }),
    };
  } catch (err: any) {
    console.error(`❌ [SWEEPER LAMBDA] Fatal error during sweep:`, err);
    throw err;
  }
};
