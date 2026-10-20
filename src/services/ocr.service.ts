import { AiGatewayService } from './aiGateway.service';
import { SarvamService } from './sarvam.service';

export const HANDWRITING_OCR_PROMPT = `Perform high-precision OCR on this handwritten student answer-sheet page.
Transcribe all printed text, student handwriting, tables, and diagrams line by line.

CRITICAL TRANSCRIBING RULES:
1. ANSWER BOXES, TICKS & OBJECTIVE MARKINGS:
   - For questions with answer boxes [ ], checkboxes, letter boxes, or fill-in blank lines:
     - If a student wrote a letter or word inside the box/line, transcribe it as: [Box: <handwritten_text>] (e.g. [Box: B], [Box: H], [Box: Photosynthesis]).
     - If a student marked a tick mark (✓) or checkmark, transcribe: [Box: ✓] or [Tick: <option>].
     - If a student circled an option or letter, transcribe: [Circled: <option>].
     - If a student crossed out / scribbled over an answer and wrote another, transcribe: [Crossed-out: <old>] [Box: <new>].
     - If the box/line is COMPLETELY BLANK or UNANSWERED (nothing written inside), transcribe it explicitly as: [Box: EMPTY].
   - Do NOT guess, invent, or infer answers. Transcribe ONLY what is physically written on the page.

2. TABLES & DATA GRIDS:
   - If any answer or question contains a table or grid (e.g. difference tables, experimental data, matrices, truth tables):
     - Transcribe it faithfully as a GitHub Markdown table (| Column 1 | Column 2 |).
     - Preserve every row, column header, and student handwritten cell entry.
     - If any cell is blank, transcribe it as | [EMPTY] |.
     - Never flatten tables into unstructured sentences.

3. DIAGRAMS, FIGURES & DRAWINGS:
   - If the student drew a diagram, graph, circuit, ray diagram, flow chart, chemical structure, or geometric figure:
     - Explicitly transcribe it with the tag:
       [Diagram / Drawing: <type of drawing, labeled components, student annotations, axes names/units, arrows, measured values>]
     - Do NOT omit drawings or treat them as blank space!`;

export class OcrService {
  /**
   * Transcribes multi-page handwritten student answer sheets line-by-line
   */
  public static async performOcrPages(
    buffers: Buffer[],
    languageName: string = 'English',
    subject: string = 'General'
  ): Promise<{ ocrText: string; confidence: number; langCode: string }> {
    if (buffers.length === 0) {
      throw new Error('No answer-sheet pages were provided for OCR.');
    }

    const isIndic = ['hindi', 'telugu', 'tamil', 'marathi', 'kannada', 'bengali'].some(
      (l) => languageName.toLowerCase().includes(l) || subject.toLowerCase().includes(l)
    );

    const langCode = isIndic ? 'indic' : 'en';

    if (SarvamService.shouldRouteOcrToSarvam(languageName, subject)) {
      try {
        const sarvamText = await SarvamService.performSarvamVisionOcr(
          buffers,
          'image/jpeg',
          languageName
        );
        if (sarvamText && sarvamText.trim()) {
          return {
            ocrText: sarvamText.trim(),
            confidence: 0.98,
            langCode,
          };
        }
      } catch (err: any) {
        console.warn('⚠️ [OCR SERVICE] Sarvam multi-page OCR failed; falling back to Gemini Vision:', err.message);
      }
    }

    // Call Gemini Multimodal Vision API across buffers
    const pageOcrResults: string[] = [];

    for (let i = 0; i < buffers.length; i++) {
      const pageBuffer = buffers[i];
      try {
        const text = await AiGatewayService.callGeminiVision(
          HANDWRITING_OCR_PROMPT,
          [pageBuffer],
          'application/pdf'
        );
        pageOcrResults.push(`--- PAGE ${i + 1} ---\n${text.trim()}`);
      } catch (err: any) {
        console.warn(`⚠️ [OCR SERVICE] Error reading page ${i + 1}:`, err.message);
        pageOcrResults.push(`--- PAGE ${i + 1} ---\n[OCR read error on this page]`);
      }
    }

    return {
      ocrText: pageOcrResults.join('\n\n'),
      confidence: 0.95,
      langCode,
    };
  }
}
