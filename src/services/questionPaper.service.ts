import { parseJsonValue } from '../utils/jsonParser';
import { AiGatewayService } from './aiGateway.service';
import { SarvamService } from './sarvam.service';
import { S3Service } from './s3.service';

export interface QuestionStimulus {
  page?: number;
  caption?: string;
  url?: string;
}

export interface Question {
  id: string;
  text: string;
  marks?: number;
  section?: string;
  options?: string[];
  correctAnswer?: string;
  rubricKey?: string;
  type?: string;
  number?: string;
  partLabel?: string;
  questionNo?: string;
  stem?: string;
  hasVisual?: boolean;
  stimulus?: QuestionStimulus[];
}

export const ENGLISH_STEM_QP_PROMPT = `You are an expert curriculum assistant. Perform high-precision Vision AI OCR on the provided Question Paper image(s).

STRUCTURE RULES (CRITICAL):
1. Preserve the paper's own hierarchy. A numbered question (1, 2, 3...) is ONE entry. Its lettered sub-parts ((a), (b), (c)...) go in its "parts" array. NEVER promote a sub-part into its own numbered question.
2. Any reading passage, dialogue, table, instruction line or shared context belongs in the parent's "stem" field EXACTLY ONCE. NEVER copy the stem, passage or instruction text into a part's "text". A part's "text" must contain ONLY that sub-part's own wording.
3. If a numbered question has no sub-parts, emit a single part with "label": "".
4. "marks" is per part. If the paper only prints a total for the parent, divide it evenly across the parts.
5. Use the paper's own numbering in "number" (e.g. "1", "2", "14"). Use the bare letter in "label" (e.g. "a", not "(a)").

VISUAL / IMAGE RULES (CRITICAL):
6. Many papers include images, signs, photos, diagrams, graphs, maps or tables that a student MUST see to answer. For every part that depends on such a visual, set "hasVisual": true, set "visualPage" to the 1-based page number of the paper where that visual appears, and put a short description in "visualCaption" (e.g. "Six shop signs labelled A-F").
7. If a part needs no visual, set "hasVisual": false, "visualPage": 0 and "visualCaption": "".

CONTENT RULES:
8. Extract ALL questions, printed or handwritten, line-by-line. Do not skip any.
9. For each part, extract or formulate its precise ground-truth reference answer key.
10. Preserve math symbols, scientific formulas and non-English text exactly.

Return ONLY a valid JSON object with NO markdown code block wrappers:
{
  "questions": [
    {
      "number": "1",
      "section": "Part - A - I",
      "stem": "Read the following passage and answer the questions below.",
      "parts": [
        { "label": "a", "text": "What is the primary function of mitochondria?", "marks": 2, "correctAnswer": "Cellular respiration and ATP generation", "hasVisual": false, "visualPage": 0, "visualCaption": "" },
        { "label": "b", "text": "Identify organelle X shown in Figure 1.", "marks": 2, "correctAnswer": "Chloroplast", "hasVisual": true, "visualPage": 1, "visualCaption": "Plant cell diagram" }
      ]
    }
  ]
}`;

export const HINDI_DEVANAGARI_QP_PROMPT = `You are an expert curriculum assistant for Hindi question paper extraction. Perform high-precision Vision AI OCR and question structuring on the provided Hindi Question Paper in Devanagari script.

STRUCTURE RULES (CRITICAL):
1. Preserve the paper's own hierarchy. A numbered question (e.g. "1", "2", "प्रश्न 1", "प्र. 1", "१", "२") is ONE entry. Its sub-parts (e.g. "क", "ख", "ग", "घ", "ङ" or "a", "b", "c" or "i", "ii") go in its "parts" array. NEVER promote a sub-part into its own numbered question.
2. Any reading passage (गद्यांश), poem (पद्यांश), dialogue, table, or instruction line belongs in the parent's "stem" field EXACTLY ONCE. NEVER copy the passage into a part's "text". A part's "text" must contain ONLY that sub-part's own question wording.
3. If a numbered question has no sub-parts, emit a single part with "label": "".
4. "marks" is per part. If the paper prints total marks for the parent question, divide it evenly across the parts.
5. In "number", use the paper's question number (e.g. "1", "2", "14"). In "label", use the sub-part letter (e.g. "क", "ख" or "a", "b", not "(क)").

CONTENT & SCRIPT RULES:
6. Transcribe in authentic Devanagari Hindi script with full orthographic fidelity (preserve all matras, halant, anusvara, and punctuation).
7. Extract ALL questions line-by-line across all sections.
8. For each part, formulate its precise ground-truth reference answer key ("correctAnswer") in fluent, grammatically sound Hindi.
9. For questions requiring diagrams, pictures or maps, set "hasVisual": true, "visualPage": 1, and describe it in "visualCaption".

Return ONLY a valid JSON object with NO markdown code block wrappers:
{
  "questions": [
    {
      "number": "1",
      "section": "खंड क (अपठित गद्यांश)",
      "stem": "निम्नलिखित गद्यांश को ध्यानपूर्वक पढ़कर पूछे गए प्रश्नों के उत्तर लिखिए...",
      "parts": [
        { "label": "क", "text": "मनुष्य के जीवन में परिश्रम का क्या महत्व है?", "marks": 2, "correctAnswer": "परिश्रम से ही मनुष्य अपने लक्ष्य को प्राप्त करता है।", "hasVisual": false, "visualPage": 0, "visualCaption": "" }
      ]
    }
  ]
}`;

export class QuestionPaperService {
  /**
   * Normalizes raw LLM output into flat Question array with IDs and visual stimuli
   */
  public static normalizeQuestionPaper(rawText: string | null): Question[] | null {
    if (!rawText) return null;

    const parsed = parseJsonValue<any>(rawText);
    const source = Array.isArray(parsed) ? parsed : parsed?.questions;

    if (!Array.isArray(source)) {
      console.warn(`⚠️ [QUESTION NORMALIZER] No questions array found in response.`);
      return null;
    }

    const flattened: Question[] = [];

    source.forEach((parent: any, parentIndex: number) => {
      const rawNumberStr = String(
        parent?.number ?? parent?.questionNumber ?? parentIndex + 1
      )
        .trim()
        .replace(/[.)]+$/, '');
      const number = rawNumberStr;
      const section = String(parent?.section || parent?.part || 'Questions');
      const stem = String(parent?.stem || parent?.passage || '').trim();
      const rawParts =
        Array.isArray(parent?.parts) && parent.parts.length > 0 ? parent.parts : [parent];

      rawParts.forEach((part: any, partIndex: number) => {
        const partLabel = String(part?.label ?? part?.partLabel ?? '')
          .trim()
          .replace(/[^\p{L}\p{M}\p{N}]/gu, '');
        const text = String(part?.text || part?.question || '')
          .replace(/^\s*\(?[\p{L}\p{M}\p{N}]+\)?[.)]\s*/u, '')
          .trim();

        if (!text) return;

        const rawMarks = Number(part?.marks);
        const marks = Number.isFinite(rawMarks) && rawMarks > 0 ? rawMarks : 1;
        const correctAnswer =
          String(part?.correctAnswer || part?.answerKey || '').trim() ||
          'Benchmark key not printed on the paper — teacher review required.';
        const page = Number(part?.visualPage ?? parent?.visualPage);
        const caption = String(part?.visualCaption || parent?.visualCaption || '').trim();
        const hasVisual = Boolean(part?.hasVisual ?? parent?.hasVisual);

        flattened.push({
          id: `q${number}-${partLabel || partIndex + 1}`,
          number,
          partLabel: partLabel || undefined,
          questionNo: partLabel ? `${number}(${partLabel})` : `${number}`,
          section,
          stem: stem || undefined,
          text,
          marks,
          correctAnswer,
          hasVisual,
          stimulus: hasVisual
            ? [
                {
                  page: Number.isFinite(page) && page > 0 ? page : undefined,
                  caption: caption || undefined,
                },
              ]
            : undefined,
        });
      });
    });

    return flattened;
  }

  /**
   * Attaches pre-signed S3 page URLs to questions that require visual stimulus
   */
  public static attachStimulusImages(questions: Question[], pageUrls: string[]): Question[] {
    if (pageUrls.length === 0) return questions;
    return questions.map((question) => {
      if (!question.hasVisual) return question;
      const stimulus = (question.stimulus || [{}]).map((item) => {
        const index = Number(item.page) - 1;
        const url = index >= 0 && index < pageUrls.length ? pageUrls[index] : undefined;
        return { ...item, url };
      });
      const resolved = stimulus.filter((item) => item.url);
      return {
        ...question,
        stimulus:
          resolved.length > 0
            ? resolved
            : pageUrls.map((url, index) => ({ page: index + 1, url })),
      };
    });
  }

  /**
   * Ingests and processes a question paper PDF buffer or S3 URL
   */
  public static async extractQuestionsFromPaper(
    paperBuffer: Buffer,
    subject: string = 'General',
    language: string = 'English'
  ): Promise<{ questions: Question[]; reasoning_model: string; raw_text: string }> {
    const isHindi = language.toLowerCase().includes('hindi') || subject.toLowerCase().includes('hindi');
    const prompt = isHindi ? HINDI_DEVANAGARI_QP_PROMPT : ENGLISH_STEM_QP_PROMPT;

    let rawOcr = '';

    // If Indic language and Sarvam is configured, try Sarvam Document AI first
    if (SarvamService.shouldRouteOcrToSarvam(language, subject)) {
      try {
        const sarvamText = await SarvamService.performSarvamVisionOcr(
          paperBuffer,
          'application/pdf',
          language
        );
        if (sarvamText && sarvamText.trim()) {
          rawOcr = sarvamText.trim();
        }
      } catch (err: any) {
        console.warn('⚠️ [QUESTION PAPER] Sarvam DocAI extraction failed; falling back to Gemini Vision:', err.message);
      }
    }

    if (!rawOcr) {
      // Call Gemini Multimodal Vision API
      rawOcr = await AiGatewayService.callGeminiVision(prompt, [paperBuffer], 'application/pdf');
    }

    const questions = this.normalizeQuestionPaper(rawOcr) || [];

    // Combine questions text for dynamic routing
    const allQuestionsText = questions.map((q) => `${q.questionNo}: ${q.text}`).join('\n');
    const reasoningModel = AiGatewayService.determineReasoningModel(subject, allQuestionsText, language);

    return {
      questions,
      reasoning_model: reasoningModel,
      raw_text: rawOcr,
    };
  }

  /**
   * Extracts benchmark answer key from an uploaded answer key document
   */
  public static async extractAnswerKey(
    keyBuffer: Buffer,
    subject: string = 'General',
    language: string = 'English'
  ): Promise<string> {
    if (SarvamService.shouldRouteOcrToSarvam(language, subject)) {
      try {
        const sarvamText = await SarvamService.performSarvamVisionOcr(
          keyBuffer,
          'application/pdf',
          language
        );
        if (sarvamText && sarvamText.trim()) {
          return sarvamText.trim();
        }
      } catch (err: any) {
        console.warn('⚠️ [ANSWER KEY] Sarvam DocAI extraction failed; falling back to Gemini Vision:', err.message);
      }
    }

    const prompt = `This is a printed teacher answer key / marking scheme document in ${subject}. Perform high-precision OCR and return ONLY the transcribed text, preserving question numbers, benchmark answers, and marks allocation exactly as printed.`;
    return await AiGatewayService.callGeminiVision(prompt, [keyBuffer], 'application/pdf');
  }
}
