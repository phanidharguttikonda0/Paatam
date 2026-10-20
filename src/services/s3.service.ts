import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.S3_BUCKET_NAME || process.env.ASSIGNMENTS_S3_BUCKET || 'paatam-uploads-dev';
const region = process.env.AWS_REGION || 'ap-south-2';

const s3Client = new S3Client({
  region,
});

export class S3Service {
  public static getBucketName(): string {
    return bucket;
  }

  public static getRegion(): string {
    return region;
  }

  /**
   * Generates AWS S3 SigV4 pre-signed PUT URL for direct browser uploads
   */
  public static async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl, key };
  }

  /**
   * Generates AWS S3 SigV4 pre-signed GET URL for temporary download access
   */
  public static async generatePresignedDownloadUrl(
    keyOrUrl: string,
    expiresIn = 3600
  ): Promise<string> {
    const key = this.extractKeyFromUrl(keyOrUrl);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Directly uploads a binary buffer to S3 (used by Lambda / Splitter workers)
   */
  public static async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType = 'application/pdf'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Downloads an S3 object and returns it as a Buffer
   */
  public static async downloadBuffer(keyOrUrl: string): Promise<Buffer> {
    const key = this.extractKeyFromUrl(keyOrUrl);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const byteArray = await response.Body?.transformToByteArray();
    if (!byteArray) {
      throw new Error(`Failed to download object from S3 key: ${key}`);
    }

    return Buffer.from(byteArray);
  }

  /**
   * Helper to strip S3 URL or URI into a clean relative key
   */
  public static extractKeyFromUrl(urlOrKey: string): string {
    if (!urlOrKey) return '';
    if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
      return urlOrKey;
    }

    try {
      const parsed = new URL(urlOrKey);
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    } catch {
      return urlOrKey;
    }
  }

  /**
   * Canonical directory naming helpers
   */
  public static getAssignmentQuestionPaperKey(assignmentId: string, ext = 'pdf'): string {
    return `assignments/${assignmentId}/question-paper.${ext}`;
  }

  public static getAssignmentAnswerKeyKey(assignmentId: string, ext = 'pdf'): string {
    return `assignments/${assignmentId}/answer-key.${ext}`;
  }

  public static getBulkStackKey(jobId: string, ext = 'pdf'): string {
    return `bulk-uploads/${jobId}/master-stack.${ext}`;
  }

  public static getStudentSubmissionKey(assignmentId: string, studentId: string, ext = 'pdf'): string {
    return `submissions/${assignmentId}/${studentId}/answer-sheet.${ext}`;
  }

  public static getStudentSubmissionPageKey(
    assignmentId: string,
    studentId: string,
    pageNumber: number,
    ext = 'png'
  ): string {
    return `submissions/${assignmentId}/${studentId}/pages/page-${pageNumber}.${ext}`;
  }
}
