import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

const region = process.env.AWS_REGION || 'ap-south-2';

const sqsClient = new SQSClient({
  region,
});

export interface AssignmentOcrMessagePayload {
  assignment_id: string;
  section_id: string;
  class_subject_id: string;
  question_paper_url: string;
  answer_key_url?: string;
  subject_name?: string;
  language?: string;
  timestamp: number;
}

export interface BulkSplitMessagePayload {
  job_id: string;
  assignment_id: string;
  section_id: string;
  master_pdf_url: string;
  bulk_mode?: string;
  fixed_page_count?: number;
  timestamp: number;
}

export interface PaperOcrMessagePayload {
  submission_id: string;
  assignment_id: string;
  student_id: string;
  paper_urls: string[];
  subject_name?: string;
  language?: string;
  timestamp: number;
}

export interface PaperEvaluationMessagePayload {
  submission_id: string;
  assignment_id: string;
  student_id: string;
  reasoning_model?: string;
  ocr_text?: string;
  language?: string;
  timestamp: number;
}

export class SqsService {
  public static getQueueUrl(queueEnvVar: string, fallbackName: string): string {
    const fromEnv = process.env[queueEnvVar];
    if (fromEnv) return fromEnv;

    const accountId = process.env.AWS_ACCOUNT_ID || '123456789012';
    return `https://sqs.${region}.amazonaws.com/${accountId}/${fallbackName}`;
  }

  public static async sendMessage(queueUrl: string, payload: any): Promise<string | null> {
    // If mock or disabled, log and return mock ID
    if (process.env.MOCK_SQS === 'true' || process.env.NODE_ENV === 'test') {
      return `mock-sqs-${Date.now()}`;
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payload),
      });

      const result = await sqsClient.send(command);
      return result.MessageId || null;
    } catch (err: any) {
      console.error(`⚠️ [SQS SERVICE] Failed to send message to queue (${queueUrl}):`, err.message);
      // We do not crash the caller; we throw or log based on environment
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      return null;
    }
  }

  /**
   * Dispatches question paper & answer key OCR job
   */
  public static async dispatchAssignmentOcr(payload: AssignmentOcrMessagePayload) {
    const queueUrl = this.getQueueUrl(
      'ASSIGNMENT_OCR_QUEUE_URL',
      'paatam-assignment-ocr-queue'
    );
    return await this.sendMessage(queueUrl, payload);
  }

  /**
   * Dispatches bulk master PDF stack splitting job
   */
  public static async dispatchBulkSplit(payload: BulkSplitMessagePayload) {
    const queueUrl = this.getQueueUrl(
      'BULK_SPLIT_QUEUE_URL',
      'paatam-bulk-split-queue'
    );
    return await this.sendMessage(queueUrl, payload);
  }

  /**
   * Stage 1: Dispatches student handwritten answer sheets for OCR
   */
  public static async dispatchPaperOcr(payload: PaperOcrMessagePayload) {
    const queueUrl = this.getQueueUrl(
      'PAPER_OCR_QUEUE_URL',
      'paatam-paper-ocr-queue'
    );
    return await this.sendMessage(queueUrl, payload);
  }

  /**
   * Stage 2: Dispatches transcribed paper for rubric evaluation & Socratic hint
   */
  public static async dispatchPaperEvaluation(payload: PaperEvaluationMessagePayload) {
    const queueUrl = this.getQueueUrl(
      'PAPER_EVALUATION_QUEUE_URL',
      'paatam-paper-evaluation-queue'
    );
    return await this.sendMessage(queueUrl, payload);
  }
}
