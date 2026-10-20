import { AiGatewayService } from './aiGateway.service';
import { parseJsonValue } from '../utils/jsonParser';

export interface QuestionEvaluation {
  questionNo: string;
  questionText?: string;
  benchmarkKey: string;
  studentAnswerSnippet: string;
  marks: number;
  earnedMarks: number;
  scorePercent: number;
  status: 'Full Credit' | 'Partial Credit' | 'Unrelated / No Credit';
  reasoning: string;
  feedback: string;
}

export interface VisionEvaluationResult {
  ocrText: string;
  score: number;
  maxScore: number;
  excelledAreas: string[];
  knowledgeGaps: string[];
  feedback: string;
  socraticHint: string;
  questionEvaluations: QuestionEvaluation[];
}

/**
 * Dynamic Reasoning Refiner (Anti-Boilerplate Engine)
 * Replaces generic repeating LLM phrases with concrete, question-specific explanations.
 */
export function refineOrSynthesizeReasoning(
  existingReasoning: string | undefined,
  scorePercent: number,
  studentAnswerSnippet: string,
  benchmarkKey: string,
  questionText: string = ''
): string {
  const trimmed = typeof existingReasoning === 'string' ? existingReasoning.trim() : '';
  const isGenericBoilerplate =
    !trimmed ||
    /^(?:correct\s+answers?\s+extracted(\s+from(\s+the)?\s+student'?s?\s+paper)?|the\s+response\s+was\s+compared\s+with\s+the\s+assigned\s+benchmark\s+key|correct\s+response|correct\s+answer)\.?$/i.test(
      trimmed
    );

  if (!isGenericBoilerplate) {
    return trimmed;
  }

  const cleanSnippet = (studentAnswerSnippet || '').replace(/\s+/g, ' ').trim();
  const lowerQuestion = (questionText || '').toLowerCase();

  if (scorePercent === 0) {
    if (
      !cleanSnippet ||
      cleanSnippet === 'No answer detected in the scanned paper.' ||
      cleanSnippet === 'No answer written (blank box)'
    ) {
      return 'No handwritten response matching this question was detected on the answer sheet.';
    }
    return 'Student response did not match the benchmark requirement.';
  }

  if (scorePercent < 90) {
    return 'Partial credit awarded: the response includes relevant points but is incomplete compared to the benchmark key.';
  }

  // Full Credit (scorePercent >= 90) - Synthesize concrete explanation
  // 1. Letters & Applications
  if (
    /प्रार्थना|आवेदन|छुट्टी|letter|application/i.test(lowerQuestion) ||
    /सेवा\s*में|dear\s+sir|to\s+the\s+principal/i.test(cleanSnippet.toLowerCase())
  ) {
    return 'The student correctly followed the formal letter format: addressed the headmaster/principal with proper salutation, clearly stated the reason for leave, and concluded politely as required by the benchmark.';
  }

  // 2. MCQ option selection (supports 'B', 'b', '[Box: B]', '(b)')
  const optionMatch = cleanSnippet.match(/^(?:\[Box:\s*|\()?\s*([a-dA-D1-4])\s*(?:\]|\))?$/i);
  if (optionMatch) {
    const selectedOption = optionMatch[1].toUpperCase();
    return `The student correctly selected Option ${selectedOption}, which matches the benchmark key.`;
  }

  // 3. One-word / Fill in the blank
  const wordCount = cleanSnippet.split(' ').filter(Boolean).length;
  if (wordCount >= 1 && wordCount <= 6 && cleanSnippet.length <= 60) {
    return `The student correctly identified '${cleanSnippet}', which directly satisfies the benchmark requirement.`;
  }

  return 'The student accurately answered the question, addressing all essential points specified in the benchmark key.';
}

export class EvaluationService {
  /**
   * Evaluates student transcribed answers against question list and answer key rubric
   */
  public static async evaluateStudentSubmission(
    assignedQuestions: any[],
    answerKeyText: string,
    studentOcrText: string,
    reasoningModel: string = 'gemini-2.5-flash',
    language: string = 'English'
  ): Promise<VisionEvaluationResult> {
    const questionsBlock = assignedQuestions
      .map(
        (q) =>
          `[Q${q.questionNo || q.number || q.id}] Marks: ${q.marks || 1}\nQuestion: ${q.text || ''}\nBenchmark Key: ${q.correctAnswer || answerKeyText || 'Compare against curriculum standard'}`
      )
      .join('\n\n');

    const prompt = `You are an expert teacher evaluating a student's handwritten exam submission for ${language}.

QUESTIONS & BENCHMARK KEYS:
${questionsBlock}

OFFICIAL MARKING SCHEME / BENCHMARK KEY:
${answerKeyText || 'Evaluate using the benchmark keys specified per question above.'}

STUDENT HANDWRITTEN OCR TRANSCRIPTION (FULL PAPER):
${studentOcrText || 'No student OCR text available.'}

CRITICAL ANTI-HALLUCINATION & EVALUATION RULES:
1. STRICT STUDENT ANSWER EXTRACTION:
   - "studentAnswerSnippet" MUST contain ONLY text that the student actually wrote on their paper (from the OCR transcription).
   - NEVER copy, paraphrase, or quote the Benchmark Key or question text into "studentAnswerSnippet".
   - IF A QUESTION HAS AN ANSWER BOX [ ] OR FILL-IN LINE AND IT IS EMPTY / BLANK / [Box: EMPTY]:
     - The student DID NOT answer that question.
     - Set "studentAnswerSnippet": "No answer written (blank box)"
     - Set "scorePercent": 0
     - Set "reasoning": "Question was left blank by the student."

2. COMPREHENSIVE MULTIPLE CHOICE (MCQ) & OBJECTIVE RULES:
   - Option Letter Matching: Treat letter selections as case-insensitive ('a' == 'A', 'b' == 'B', etc.).
   - Option Boxes & Brackets: Formats like [Box: B], [B], (B), B. are all recognized as Option B.
   - Ticks, Checks & Circled Marks: If a student marked a tick (✓), checkmark, or circled a specific option letter/box (e.g. [Box: ✓]), award 100 if that option is correct.
   - Option Text Written (Letter Omitted): If a student wrote the correct answer text verbatim or semantically, award scorePercent: 100 even if the letter was omitted.
   - Crossed-out / Corrected Answers: If a student crossed out or scribbled over an answer, evaluate ONLY the final uncrossed answer.
   - Conflicting Selections: If a student selected multiple conflicting options without crossing one out, award scorePercent: 0.

3. ACCURATE SCORING & INFORMATIVE REASONING (MANDATORY):
   - Award scorePercent between 0 and 100 proportional to the essential marking points satisfied.
   - Award 100 when all essential marking points are accurately present.
   - Output unique, informative reasoning explaining WHY that score was awarded based on question content and student answer.
   - In "feedback", write constructive guidance specific to that question.
   - In "socraticHint", provide a thoughtful question that guides the student to self-correct their biggest mistake without simply giving the answer.

OUTPUT FORMAT:
Return valid JSON with NO markdown formatting:
{
  "excelledAreas": ["Area 1", "Area 2"],
  "knowledgeGaps": ["Gap 1"],
  "feedback": "Overall constructive summary feedback...",
  "socraticHint": "Socratic guidance question...",
  "questionEvaluations": [
    {
      "questionNo": "1",
      "questionText": "Question text...",
      "benchmarkKey": "Expected key...",
      "studentAnswerSnippet": "Extracted student text...",
      "marks": 2,
      "scorePercent": 100,
      "reasoning": "Detailed explanation...",
      "feedback": "Question feedback..."
    }
  ]
}`;

    const rawResponse = await AiGatewayService.callGeminiText(prompt, reasoningModel);
    const parsed = parseJsonValue<any>(rawResponse);

    const rawEvaluations: any[] = Array.isArray(parsed?.questionEvaluations)
      ? parsed.questionEvaluations
      : [];

    const normalizedEvaluations: QuestionEvaluation[] = assignedQuestions.map((q, idx) => {
      const qNo = String(q.questionNo || q.number || idx + 1);
      const evalMatch = rawEvaluations.find((e) => String(e.questionNo) === qNo) || rawEvaluations[idx];

      const maxMarks = Number(q.marks || 1);
      const scorePercent = Number(evalMatch?.scorePercent ?? 0);
      const earnedMarks = Math.round(((maxMarks * scorePercent) / 100) * 100) / 100;

      let status: 'Full Credit' | 'Partial Credit' | 'Unrelated / No Credit' = 'Unrelated / No Credit';
      if (scorePercent >= 90) status = 'Full Credit';
      else if (scorePercent > 0) status = 'Partial Credit';

      const studentSnippet = evalMatch?.studentAnswerSnippet || 'No answer detected';
      const benchmarkKey = evalMatch?.benchmarkKey || q.correctAnswer || 'Benchmark standard';
      const refinedReasoning = refineOrSynthesizeReasoning(
        evalMatch?.reasoning,
        scorePercent,
        studentSnippet,
        benchmarkKey,
        q.text
      );

      return {
        questionNo: qNo,
        questionText: q.text,
        benchmarkKey,
        studentAnswerSnippet: studentSnippet,
        marks: maxMarks,
        earnedMarks,
        scorePercent,
        status,
        reasoning: refinedReasoning,
        feedback: evalMatch?.feedback || (scorePercent === 100 ? 'Correct response.' : 'Review this topic.'),
      };
    });

    const totalMaxScore = normalizedEvaluations.reduce((sum, item) => sum + item.marks, 0);
    const totalEarnedScore =
      Math.round(normalizedEvaluations.reduce((sum, item) => sum + item.earnedMarks, 0) * 100) / 100;

    return {
      ocrText: studentOcrText || 'OCR transcription completed.',
      score: totalEarnedScore,
      maxScore: totalMaxScore,
      excelledAreas: Array.isArray(parsed?.excelledAreas) ? parsed.excelledAreas : ['General Concept Application'],
      knowledgeGaps: Array.isArray(parsed?.knowledgeGaps) ? parsed.knowledgeGaps : [],
      feedback: parsed?.feedback || 'Paper evaluation complete.',
      socraticHint: parsed?.socraticHint || 'Review intermediate calculation steps to self-correct mistakes.',
      questionEvaluations: normalizedEvaluations,
    };
  }
}
