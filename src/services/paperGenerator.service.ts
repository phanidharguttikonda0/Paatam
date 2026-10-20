import { AiGatewayService } from './aiGateway.service';
import { SarvamService } from './sarvam.service';
import { S3Service } from './s3.service';
import { parseJsonValue } from '../utils/jsonParser';

export interface ChapterBlueprintItem {
  chapterTitle: string;
  subtopics?: string[];
  mcqCount: number;
  veryShortCount: number;
  shortCount: number;
  descriptiveCount: number;
}

export interface UnifiedExamParams {
  examTitle: string;
  className: string;
  subjectName: string;
  targetMarks: number;
  language?: string;
  difficulty?: string;
  selectedChapters?: string[];
  selectedSubtopics?: string[];
  questionCounts: {
    mcqCount: number;
    veryShortCount: number;
    shortCount: number;
    descriptiveCount: number;
  };
  marksConfig?: {
    mcq?: number;
    vsa?: number;
    sa?: number;
    long?: number;
  };
  blueprint?: ChapterBlueprintItem[];
  textbookContext?: string;
}

export interface GeneratedQuestion {
  number?: string | number;
  text: string;
  type: string;
  marks: number;
  section?: string;
  options?: string[] | null;
  correctAnswer?: string;
  rubricKey?: string;
  stem?: string;
  hasVisual?: boolean;
  imagePrompt?: string;
  imageUrl?: string;
  diagramSvg?: string;
}

export class PaperGeneratorService {
  /**
   * Generates a complete exam question paper from blueprint and syllabus parameters
   */
  public static async generateExamQuestionsUnified(
    params: UnifiedExamParams
  ): Promise<GeneratedQuestion[]> {
    const {
      examTitle,
      className,
      subjectName,
      targetMarks,
      language = 'English',
      difficulty = 'Standard',
      selectedChapters = [],
      selectedSubtopics = [],
      questionCounts,
      marksConfig,
      blueprint,
      textbookContext,
    } = params;

    const mcqMarks = Number(marksConfig?.mcq) || 1;
    const vsaMarks = Number(marksConfig?.vsa) || 2;
    const saMarks = Number(marksConfig?.sa) || 3;
    const longMarks = Number(marksConfig?.long) || 5;

    const totalQuestions =
      (questionCounts.mcqCount || 0) +
      (questionCounts.veryShortCount || 0) +
      (questionCounts.shortCount || 0) +
      (questionCounts.descriptiveCount || 0);

    if (totalQuestions <= 0) return [];

    console.log(`🎯 [PAPER GENERATOR] Generating ${totalQuestions} questions for "${examTitle}" (${targetMarks} marks)`);

    const snippetToUse = textbookContext ? textbookContext.substring(0, 24000) : '';

    const blueprintPromptSection =
      blueprint && blueprint.length > 0
        ? `\nMANDATORY TOPIC-BY-TOPIC BLUEPRINT SPECIFICATION:
${blueprint
  .map((b, idx) => {
    const bTotal =
      (b.mcqCount || 0) * mcqMarks +
      (b.veryShortCount || 0) * vsaMarks +
      (b.shortCount || 0) * saMarks +
      (b.descriptiveCount || 0) * longMarks;
    const subs = b.subtopics && b.subtopics.length > 0 ? b.subtopics.join(', ') : 'All chapter concepts';
    return `[TOPIC ${idx + 1}: "${b.chapterTitle}"] (Target: ${bTotal} Marks)
  - Focus Subtopics: ${subs}
  - Section A (MCQs ${mcqMarks}m each): EXACTLY ${b.mcqCount || 0} question(s)
  - Section B (Very Short ${vsaMarks}m each): EXACTLY ${b.veryShortCount || 0} question(s)
  - Section C (Short Answer ${saMarks}m each): EXACTLY ${b.shortCount || 0} question(s)
  - Section D (Long / Case ${longMarks}m each): EXACTLY ${b.descriptiveCount || 0} question(s)`;
  })
  .join('\n\n')}\n`
        : '';

    const prompt = `You are a premier senior school examination board setter (CBSE, ICSE, State Boards).
Create a complete, rigorous, and balanced question paper for "${examTitle}" (${className}, Subject: ${subjectName}).
Language: ${language}. Difficulty Level: ${difficulty}.
Target Total Marks: ${targetMarks}.
${blueprintPromptSection}
SELECTED CHAPTERS & SYLLABUS SCOPE:
Chapters: ${selectedChapters.length > 0 ? selectedChapters.join(', ') : 'All prescribed chapters'}
Key Subtopics / Concepts to cover: ${selectedSubtopics.length > 0 ? selectedSubtopics.join(', ') : 'All core syllabus concepts'}

KNOWLEDGE BASE CONTEXT FROM TEXTBOOK CHAPTERS:
${snippetToUse || `Subject: ${subjectName}. Class: ${className}. Core syllabus principles and chapter concepts.`}

REQUIRED QUESTION BREAKDOWN (YOU MUST GENERATE EXACTLY THIS MANY QUESTIONS):
1. EXACTLY ${questionCounts.mcqCount || 0} Multiple Choice Questions (Section A - ${mcqMarks} Mark${mcqMarks === 1 ? '' : 's'} each):
   - Provide 4 distinct options: ["A) ...", "B) ...", "C) ...", "D) ..."]
   - Provide "correctAnswer" (e.g. "B) ...")
   - Provide "rubricKey" citing the textbook principle.
2. EXACTLY ${questionCounts.veryShortCount || 0} Very Short Answer Questions (Section B - ${vsaMarks} Mark${vsaMarks === 1 ? '' : 's'} each):
   - Crisp direct conceptual, definition, or formula questions.
   - Provide "correctAnswer" with clear key points corresponding to marks.
3. EXACTLY ${questionCounts.shortCount || 0} Short Answer Questions (Section C - ${saMarks} Mark${saMarks === 1 ? '' : 's'} each):
   - Conceptual explanation, numerical, or reasoning questions.
   - Provide "correctAnswer" with clear step-by-step points/steps.
4. EXACTLY ${questionCounts.descriptiveCount || 0} Long Answer / Descriptive / Case Questions (Section D - ${longMarks} Mark${longMarks === 1 ? '' : 's'} each):
   - Detailed comprehensive questions, derivations, or scenario applications.
   - Provide complete step-by-step model answer and explicit marking scheme breakdown in "rubricKey".

OUTPUT FORMAT:
Return a JSON array of question objects adhering to this schema:
[
  {
    "number": 1,
    "section": "Section A",
    "type": "mcq",
    "marks": ${mcqMarks},
    "text": "Question text here",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "rubricKey": "Marking scheme principle",
    "stem": "Chapter name or passage",
    "hasVisual": false,
    "imagePrompt": ""
  }
]`;

    let rawJsonText: string | null = null;
    const isIndic = SarvamService.isHindiOrTelugu(language, subjectName);

    if (isIndic && process.env.SARVAM_API_KEY) {
      rawJsonText = await SarvamService.callSarvamChatApi(prompt);
    } else {
      rawJsonText = await AiGatewayService.callGeminiText(prompt);
    }

    if (!rawJsonText) return [];

    const parsed = parseJsonValue(rawJsonText, '[');
    if (!Array.isArray(parsed)) return [];

    let questionSeq = 1;
    return parsed.map((item: any) => ({
      number: item.number || questionSeq++,
      section: item.section || (item.type === 'mcq' ? 'Section A' : 'Section B'),
      type: (item.type || 'short').toLowerCase(),
      marks: Number(item.marks) || 1,
      text: item.text || item.question || '',
      options: Array.isArray(item.options) ? item.options : null,
      correctAnswer: item.correctAnswer || item.answer || '',
      rubricKey: item.rubricKey || item.markingScheme || '',
      stem: item.stem || item.chapterTitle || '',
      hasVisual: Boolean(item.hasVisual),
      imagePrompt: item.imagePrompt || '',
    }));
  }

  /**
   * Generates a single replacement question for an exam slot
   */
  public static async generateSingleQuestionReplacement(params: {
    subjectName: string;
    className: string;
    chapterTitle: string;
    subtopics?: string[];
    questionType: string;
    marks: number;
    currentQuestionText?: string;
    language?: string;
    difficulty?: string;
    textbookContext?: string;
  }): Promise<GeneratedQuestion | null> {
    const {
      subjectName,
      className,
      chapterTitle,
      subtopics = [],
      questionType,
      marks,
      currentQuestionText,
      language = 'English',
      difficulty = 'Standard',
      textbookContext,
    } = params;

    const isMcq = questionType.toLowerCase() === 'mcq';
    const prompt = `You are an elite school examination board setter (CBSE, ICSE, State Boards).
Generate EXACTLY 1 high-quality question to replace an existing question.
Subject: ${subjectName}
Class: ${className}
Topic/Chapter: ${chapterTitle}
${subtopics.length > 0 ? `Subtopics: ${subtopics.join(', ')}` : ''}
Language: ${language}
Difficulty: ${difficulty}
Question Typology: ${questionType.toUpperCase()}
Marks: ${marks} Marks

${currentQuestionText ? `The teacher wants to replace this previous question:\n"${currentQuestionText}"\nGenerate a completely fresh alternative question testing the same concept.` : ''}

${textbookContext ? `Textbook Context Reference:\n${textbookContext.substring(0, 6000)}` : ''}

Output MUST be a single valid JSON object adhering to this schema:
{
  "text": "Question text here",
  "type": "${questionType}",
  "marks": ${marks},
  "options": ${isMcq ? '["A) ...", "B) ...", "C) ...", "D) ..."]' : 'null'},
  "correctAnswer": "Model answer",
  "rubricKey": "Marking scheme",
  "stem": "${chapterTitle}",
  "hasVisual": false,
  "imagePrompt": ""
}`;

    const raw = await AiGatewayService.callGeminiText(prompt);
    if (!raw) return null;

    const parsed = parseJsonValue(raw, '{');
    if (!parsed) return null;

    return {
      text: parsed.text || '',
      type: (parsed.type || questionType).toLowerCase(),
      marks: Number(parsed.marks) || marks,
      options: Array.isArray(parsed.options) ? parsed.options : null,
      correctAnswer: parsed.correctAnswer || '',
      rubricKey: parsed.rubricKey || '',
      stem: parsed.stem || chapterTitle,
      hasVisual: Boolean(parsed.hasVisual),
      imagePrompt: parsed.imagePrompt || '',
    };
  }

  /**
   * Generates question diagrams or visual stimulus images (geometry, circuits, ray optics)
   * Saves image buffer directly to AWS S3 bucket.
   */
  public static async generateQuestionImageOrDiagram(
    imagePrompt: string,
    questionText: string,
    subject = 'General'
  ): Promise<{ imageUrl?: string; diagramSvg?: string; type: 'svg' | 'image' }> {
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (apiKey) {
      try {
        const enhancedPrompt = `Technical educational textbook diagram for school exam question. Clean line drawing, white background, black annotations. No answers revealed.
Subject: ${subject}
Question: ${questionText}
Diagram details: ${imagePrompt}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: enhancedPrompt }] }],
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          const candidates = data?.candidates?.[0]?.content?.parts || [];
          for (const part of candidates) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const buffer = Buffer.from(part.inlineData.data, 'base64');
              const fileName = `diagrams/diagram-${Date.now()}.png`;

              // Upload to S3
              const s3Url = await S3Service.uploadBuffer(fileName, buffer, mime);
              return {
                imageUrl: s3Url,
                type: 'image',
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('⚠️ [DIAGRAM GENERATOR] Gemini Image call failed, generating vector SVG fallback:', err.message);
      }
    }

    // Fallback: Generate crisp SVG vector code via Gemini Text
    const svgPrompt = `Generate a clean, standalone, responsive SVG diagram code for this exam question.
Question: ${questionText}
Visual: ${imagePrompt}
Return ONLY valid <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">...</svg> markup with clean black lines, labels, and white background.`;

    const svgText = await AiGatewayService.callGeminiText(svgPrompt);
    const svgMatch = svgText.match(/<svg[\s\S]*?<\/svg>/i);

    if (svgMatch) {
      return {
        diagramSvg: svgMatch[0],
        type: 'svg',
      };
    }

    return {
      type: 'svg',
      diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="100%" height="100%" fill="#f8fafc"/><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-family="sans-serif">${imagePrompt.substring(0, 40)}</text></svg>`,
    };
  }
}
