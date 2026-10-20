import AdmZip from 'adm-zip';
import { PDFDocument } from 'pdf-lib';

const SARVAM_API_BASE_URL = 'https://api.sarvam.ai';
const TERMINAL_JOB_STATES = new Set(['completed', 'partially_completed', 'failed', 'rejected']);
const RETRYABLE_READ_STATUSES = new Set([409, 425, 429, 500, 502, 503, 504]);

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) return Math.max(0, retryDate - Date.now());
  }
  return Math.min(10000, attempt * 2000);
}

async function fetchSarvamRead(
  url: string,
  init: RequestInit,
  operation: string,
  maxAttempts = 5
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || !RETRYABLE_READ_STATUSES.has(response.status) || attempt === maxAttempts) {
        return response;
      }
      const delay = retryDelayMs(response, attempt);
      console.warn(`⚠️ [SARVAM VISION] ${operation} returned ${response.status}; retrying in ${delay}ms (${attempt}/${maxAttempts}).`);
      await response.arrayBuffer().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      const delay = Math.min(10000, attempt * 2000);
      console.warn(`⚠️ [SARVAM VISION] ${operation} network failure; retrying in ${delay}ms (${attempt}/${maxAttempts}).`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${operation} failed after ${maxAttempts} attempts.`, { cause: lastError });
}

function getSarvamKey(): string {
  const key = process.env.SARVAM_API_KEY || '';
  if (!key) {
    throw new Error('SARVAM_API_KEY is required for Hindi/Telugu routing.');
  }
  return key;
}

function sarvamHeaders(): Record<string, string> {
  return { 'api-subscription-key': getSarvamKey() };
}

export interface SarvamChatOptions {
  reasoningEffort?: 'low' | 'medium' | 'high' | null;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
  temperature?: number;
  seed?: number;
}

export class SarvamService {
  public static async callSarvamChatApi(
    prompt: string,
    maxRetries = 3,
    options: SarvamChatOptions = {}
  ): Promise<string | null> {
    const modelName = process.env.SARVAM_CHAT_MODEL || 'sarvam-105b';
    console.log(`🤖 [SARVAM AI] Calling Chat Completions (${modelName})...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const reasoningEffort = options.reasoningEffort !== undefined
        ? options.reasoningEffort
        : (attempt === 1 ? 'medium' : 'low');
      const maxTokens = options.maxTokens || (attempt === 1 ? 4096 : 8192);

      try {
        const response = await fetch(`${SARVAM_API_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            ...sarvamHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature ?? 0.2,
            ...(options.seed !== undefined ? { seed: options.seed } : {}),
            ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
            max_tokens: maxTokens,
            ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const choice = data?.choices?.[0];
          const content = choice?.message?.content;
          if (typeof content === 'string' && content.trim()) {
            console.log(`✅ [SARVAM AI] Received successful response from ${modelName}`);
            return content;
          }

          if (attempt < maxRetries) {
            const nextReasoningEffort = options.reasoningEffort !== undefined ? options.reasoningEffort : 'low';
            const nextMaxTokens = options.maxTokens || 8192;
            console.log(`   └─ Retrying with reasoning=${nextReasoningEffort ?? 'disabled'}, max_tokens=${nextMaxTokens}...`);
            continue;
          }
          return null;
        }

        const errorBody = await response.text();
        console.warn(`⚠️ [SARVAM AI] Chat API notice (${response.status}): ${errorBody.substring(0, 300)}`);
        if (![429, 500, 503].includes(response.status) || attempt === maxRetries) return null;
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      } catch (err: any) {
        console.warn(`⚠️ [SARVAM AI] Chat attempt ${attempt} failed:`, err.message);
        if (attempt === maxRetries) return null;
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }

    return null;
  }

  public static isHindi(languageOrSubject?: string): boolean {
    if (!languageOrSubject) return false;
    const s = languageOrSubject.trim().toLowerCase();
    return /hindi|हिन्दी|हिंदी|\bhin\b|\bhi\b|hi-in|devanagari/i.test(s);
  }

  public static isTelugu(languageOrSubject?: string): boolean {
    if (!languageOrSubject) return false;
    const s = languageOrSubject.trim().toLowerCase();
    return /telugu|తెలుగు|\btel\b|\bte\b|te-in/i.test(s);
  }

  public static isHindiOrTelugu(language?: string, subject?: string): boolean {
    return this.isHindi(language) || this.isHindi(subject) || this.isTelugu(language) || this.isTelugu(subject);
  }

  public static sarvamDocumentLanguageCode(languageName?: string): string | null {
    if (!languageName) return null;
    if (this.isHindi(languageName)) return 'hi-IN';
    if (this.isTelugu(languageName)) return 'te-IN';

    const normalized = languageName.trim().toLowerCase();
    const codes: Record<string, string> = {
      hindi: 'hi-IN', bengali: 'bn-IN', tamil: 'ta-IN', telugu: 'te-IN',
      marathi: 'mr-IN', gujarati: 'gu-IN', kannada: 'kn-IN', malayalam: 'ml-IN', odia: 'od-IN',
      punjabi: 'pa-IN', assamese: 'as-IN', english: 'en-IN',
    };

    const found = Object.keys(codes).find((name) => normalized.includes(name));
    return found ? codes[found] : null;
  }

  public static shouldRouteOcrToSarvam(languageName?: string, subject?: string): boolean {
    if (!process.env.SARVAM_API_KEY) return false;
    if (this.isHindiOrTelugu(languageName, subject)) return true;
    if (process.env.PRIMARY_AI_PROVIDER?.toLowerCase() === 'sarvam') return true;

    const combined = `${languageName || ''} ${subject || ''}`.toLowerCase();
    return ['bengali', 'tamil', 'marathi', 'gujarati', 'kannada', 'malayalam', 'odia', 'punjabi', 'urdu'].some((lang) =>
      combined.includes(lang)
    );
  }

  /**
   * Performs high-precision document OCR via Sarvam Document AI with polling and zip extraction
   */
  public static async performSarvamVisionOcr(
    imageBuffer: Buffer | Buffer[],
    mimeType: string | string[],
    languageName: string
  ): Promise<string | null> {
    const buffers = Array.isArray(imageBuffer) ? imageBuffer : [imageBuffer];
    const mimeTypes = Array.isArray(mimeType) ? mimeType : buffers.map(() => mimeType);

    if (buffers.length === 0) {
      throw new Error('At least one document or image page is required for Sarvam Vision OCR.');
    }

    const documents: Array<{ buffer: Buffer; mimeType: string; name: string; pages: number }> = [];
    let pendingImages: Array<{ buffer: Buffer; mimeType: string }> = [];

    const flushImages = () => {
      if (pendingImages.length === 0) return;
      if (pendingImages.length === 1) {
        const image = pendingImages[0];
        const extension = image.mimeType.includes('png') ? 'png' : 'jpg';
        documents.push({ buffer: image.buffer, mimeType: image.mimeType, name: `page.${extension}`, pages: 1 });
        pendingImages = [];
        return;
      }
      const zip = new AdmZip();
      pendingImages.forEach((image, index) => {
        const extension = image.mimeType.includes('png') ? 'png' : 'jpg';
        zip.addFile(`page-${String(index + 1).padStart(3, '0')}.${extension}`, image.buffer);
      });
      documents.push({ buffer: zip.toBuffer(), mimeType: 'application/zip', name: 'pages.zip', pages: pendingImages.length });
      pendingImages = [];
    };

    for (let index = 0; index < buffers.length; index++) {
      const buffer = buffers[index];
      const currentMimeType = mimeTypes[index] || 'image/jpeg';
      if (!currentMimeType.includes('pdf')) {
        pendingImages.push({ buffer, mimeType: currentMimeType });
        if (pendingImages.length === 10) flushImages();
        continue;
      }

      flushImages();
      const sourcePdf = await PDFDocument.load(buffer);
      for (let pageStart = 0; pageStart < sourcePdf.getPageCount(); pageStart += 10) {
        const pageIndexes = Array.from(
          { length: Math.min(10, sourcePdf.getPageCount() - pageStart) },
          (_, pageOffset) => pageStart + pageOffset
        );
        const chunkPdf = await PDFDocument.create();
        const pages = await chunkPdf.copyPages(sourcePdf, pageIndexes);
        pages.forEach((page) => chunkPdf.addPage(page));
        documents.push({
          buffer: Buffer.from(await chunkPdf.save()),
          mimeType: 'application/pdf',
          name: `pages-${pageStart + 1}-${pageStart + pageIndexes.length}.pdf`,
          pages: pageIndexes.length,
        });
      }
    }
    flushImages();

    const langCode = this.sarvamDocumentLanguageCode(languageName);
    if (!langCode) throw new Error(`Sarvam Document AI does not support '${languageName}'. Use Gemini OCR.`);

    const transcriptions: string[] = [];
    let firstPage = 1;

    for (let documentIndex = 0; documentIndex < documents.length; documentIndex++) {
      const document = documents[documentIndex];
      const lastPage = firstPage + document.pages - 1;
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(document.buffer)], { type: document.mimeType }), document.name);
      formData.append('language', langCode);
      formData.append('language_code', langCode);
      formData.append('output_format', 'md');

      console.log(`🇮🇳 [SARVAM VISION OCR] Creating DocAI job ${documentIndex + 1}/${documents.length} (pages ${firstPage}-${lastPage})...`);
      const createResponse = await fetch(`${SARVAM_API_BASE_URL}/doc-ai/v1/job/digitise`, {
        method: 'POST',
        headers: sarvamHeaders(),
        body: formData,
      });

      if (!createResponse.ok) {
        const errorBody = await createResponse.text();
        throw new Error(`Sarvam Vision job failed (${createResponse.status}): ${errorBody.substring(0, 300)}`);
      }

      const job = (await createResponse.json()) as any;
      if (!job?.job_id) throw new Error('Sarvam Vision did not return a job ID.');

      let status = String(job.status || 'pending').toLowerCase();
      for (let poll = 0; poll < 30 && !TERMINAL_JOB_STATES.has(status); poll++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusResponse = await fetchSarvamRead(
          `${SARVAM_API_BASE_URL}/doc-ai/v1/job/${job.job_id}/status`,
          { headers: sarvamHeaders() },
          'status check',
          4
        );
        if (!statusResponse.ok) throw new Error(`Sarvam Vision status check failed (${statusResponse.status}).`);
        const statusData = (await statusResponse.json()) as any;
        status = String(statusData.status || '').toLowerCase();
        console.log(`   ├─ Job ${documentIndex + 1}/${documents.length}: ${status}`);
      }

      if (!['completed', 'partially_completed'].includes(status)) {
        throw new Error(`Sarvam Vision job ended with status: ${status || 'timeout'}.`);
      }

      const downloadResponse = await fetchSarvamRead(
        `${SARVAM_API_BASE_URL}/doc-ai/v1/job/${job.job_id}/download-url`,
        { headers: sarvamHeaders() },
        'download URL lookup',
        6
      );
      if (!downloadResponse.ok) throw new Error(`Sarvam Vision download lookup failed (${downloadResponse.status}).`);
      const downloadData = (await downloadResponse.json()) as any;
      if (!downloadData?.url) throw new Error('Sarvam Vision did not return a download URL.');

      const outputResponse = await fetchSarvamRead(downloadData.url, { method: downloadData.method || 'GET' }, 'artifact download', 4);
      if (!outputResponse.ok) throw new Error(`Sarvam Vision output download failed (${outputResponse.status}).`);

      const outputZip = new AdmZip(Buffer.from(await outputResponse.arrayBuffer()));
      const markdownEntry = outputZip.getEntries().find((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.md'));
      if (!markdownEntry) throw new Error('Sarvam Vision output did not contain a Markdown transcription.');

      transcriptions.push(`--- PAGES ${firstPage}-${lastPage} ---\n${markdownEntry.getData().toString('utf-8').trim()}`);
      firstPage = lastPage + 1;
    }

    return transcriptions.join('\n\n') || null;
  }
}
