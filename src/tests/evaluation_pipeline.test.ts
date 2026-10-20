import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseJsonValue } from '../utils/jsonParser';
import { AiGatewayService } from '../services/aiGateway.service';
import { QuestionPaperService } from '../services/questionPaper.service';
import { refineOrSynthesizeReasoning } from '../services/evaluation.service';
import { cleanName, isSameStudent } from '../services/studentBoundary.service';
import { StudentPortalService } from '../services/studentPortal.service';
import { prisma } from '../config/prisma';

describe('Evaluation & AI Ingestion Pipeline Tests', () => {
  describe('Universal JSON Parser (Module 6.3)', () => {
    it('should parse clean JSON correctly', () => {
      const json = '{"status": "success", "score": 100}';
      expect(parseJsonValue(json)).toEqual({ status: 'success', score: 100 });
    });

    it('should strip markdown code block fences', () => {
      const wrapped = '```json\n{"questions": [{"number": "1"}]}\n```';
      expect(parseJsonValue(wrapped)).toEqual({ questions: [{ number: '1' }] });
    });

    it('should auto-repair unquoted parenthesized option values', () => {
      const unquoted = '{"questionNo": "1", "correctAnswer": (a) Photosynthesis}';
      const parsed = parseJsonValue(unquoted);
      expect(parsed).toEqual({ questionNo: '1', correctAnswer: '(a) Photosynthesis' });
    });

    it('should recover valid JSON despite trailing commas and raw newlines inside strings', () => {
      const broken = '{"feedback": "Line 1\nLine 2", "score": 10,}';
      const parsed = parseJsonValue(broken);
      expect(parsed?.score).toBe(10);
      expect(parsed?.feedback).toContain('Line 1');
    });

    it('should return null for completely unrecoverable non-JSON text', () => {
      expect(parseJsonValue('Random gibberish without brackets')).toBeNull();
    });
  });

  describe('Dynamic Model Determination (Module 2)', () => {
    it('should select advanced reasoning model when STEM / LaTeX formulas are present', () => {
      const stemQuestions = 'Calculate the velocity using \\frac{dv}{dt} = -kv^2';
      const model = AiGatewayService.determineReasoningModel('Physics', stemQuestions, 'English');
      expect(model).toBe('gemini-1.5-pro');
    });

    it('should select high-throughput gemini-2.5-flash for standard humanities/general questions', () => {
      const generalQuestions = 'Explain the main causes of the French Revolution.';
      const model = AiGatewayService.determineReasoningModel('History', generalQuestions, 'English');
      expect(model).toBe('gemini-2.5-flash');
    });
  });

  describe('Question Paper Normalization (Module 1.2)', () => {
    it('should preserve parent stem and flatten subparts without duplicating stem text', () => {
      const rawAiResponse = JSON.stringify({
        questions: [
          {
            number: '1',
            section: 'Part A',
            stem: 'Read the experiment details carefully.',
            parts: [
              {
                label: 'a',
                text: 'State the independent variable.',
                marks: 2,
                correctAnswer: 'Temperature',
                hasVisual: false,
              },
              {
                label: 'b',
                text: 'State the observed color change in test tube 2.',
                marks: 3,
                correctAnswer: 'Blue to Green',
                hasVisual: true,
                visualPage: 2,
                visualCaption: 'Test tube rack diagram',
              },
            ],
          },
        ],
      });

      const normalized = QuestionPaperService.normalizeQuestionPaper(rawAiResponse);
      expect(normalized).toHaveLength(2);

      expect(normalized![0].questionNo).toBe('1(a)');
      expect(normalized![0].stem).toBe('Read the experiment details carefully.');
      expect(normalized![0].text).toBe('State the independent variable.');
      expect(normalized![0].marks).toBe(2);
      expect(normalized![0].correctAnswer).toBe('Temperature');

      expect(normalized![1].questionNo).toBe('1(b)');
      expect(normalized![1].hasVisual).toBe(true);
      expect(normalized![1].stimulus?.[0].page).toBe(2);
    });
  });

  describe('Anti-Boilerplate Reasoning Refiner (Module 5.2)', () => {
    it('should replace generic boilerplate with concrete MCQ explanation', () => {
      const refined = refineOrSynthesizeReasoning(
        'Correct answer extracted from the student paper.',
        100,
        '[Box: B]',
        '(B) Mitochondria',
        'Which organelle is responsible for respiration?'
      );

      expect(refined).toBe('The student correctly selected Option B, which matches the benchmark key.');
    });

    it('should explain zero marks when student left box empty', () => {
      const refined = refineOrSynthesizeReasoning(
        'The response was compared with the assigned benchmark key',
        0,
        'No answer written (blank box)',
        'Mitochondria'
      );

      expect(refined).toBe('No handwritten response matching this question was detected on the answer sheet.');
    });

    it('should explain partial credit accurately', () => {
      const refined = refineOrSynthesizeReasoning(
        undefined,
        60,
        'Cell produces energy',
        'Cell generates ATP via cellular respiration in mitochondria'
      );

      expect(refined).toContain('Partial credit awarded');
    });
  });

  describe('Student Name & Fuzzy Boundary Matching (Module 3.2)', () => {
    it('should clean student names by stripping honorifics and non-alphanumeric chars', () => {
      expect(cleanName('Master Aarav Sharma (Roll 101)')).toBe('aarav sharma roll 101');
      expect(cleanName('Miss Ananya Patel')).toBe('ananya patel');
    });

    it('should accurately match same student despite minor OCR spelling variations', () => {
      expect(isSameStudent('Aarav Sharma', 'Aarav Shrama')).toBe(true);
      expect(isSameStudent('Priya Verma', 'Rohan Gupta')).toBe(false);
    });
  });

  describe('Anti-Duplicate Submission Guard', () => {
    it('should reject student upload with 403 Forbidden when assignment.submission_mode is TEACHER_UPLOAD', async () => {
      vi.spyOn(prisma.student, 'findUnique').mockResolvedValueOnce({
        id: BigInt('101'),
        section_id: BigInt('501'),
      } as any);

      vi.spyOn(prisma.assignment, 'findUnique').mockResolvedValueOnce({
        id: BigInt('1001'),
        section_id: BigInt('501'),
        title: 'Midterm Science Exam',
        submission_mode: 'TEACHER_UPLOAD', // Teacher uploaded physical stack
      } as any);

      await expect(
        StudentPortalService.submitAssignment('101', '1001', {
          sample_paper_urls: ['https://example.com/sheet.pdf'],
        })
      ).rejects.toThrow(
        'Submissions for this assignment are collected physically and uploaded exclusively by the teacher'
      );
    });

    it('should reject student upload with 403 Forbidden when a submission already exists for this student', async () => {
      vi.spyOn(prisma.student, 'findUnique').mockResolvedValueOnce({
        id: BigInt('101'),
        section_id: BigInt('501'),
      } as any);

      vi.spyOn(prisma.assignment, 'findUnique').mockResolvedValueOnce({
        id: BigInt('1001'),
        section_id: BigInt('501'),
        title: 'Midterm Science Exam',
        submission_mode: 'STUDENT_UPLOAD',
      } as any);

      vi.spyOn(prisma.submission, 'findFirst').mockResolvedValueOnce({
        id: BigInt('2001'),
        assignment_id: BigInt('1001'),
        student_id: BigInt('101'),
      } as any);

      await expect(
        StudentPortalService.submitAssignment('101', '1001', {
          sample_paper_urls: ['https://example.com/sheet.pdf'],
        })
      ).rejects.toThrow('Answer sheets have already been submitted for this assignment');
    });
  });

  describe('Sweeper Worker (Rescue Stuck AI Jobs)', () => {
    it('should identify and rescue stuck submissions older than 30 minutes', async () => {
      const { runSweeperJob } = await import('../workers/sweeper.worker');
      const { SqsService } = await import('../services/sqs.service');

      const dispatchSpy = vi.spyOn(SqsService, 'dispatchPaperEvaluation').mockResolvedValueOnce('msg-123' as any);

      vi.spyOn(prisma.submission, 'findMany').mockResolvedValueOnce([
        {
          id: BigInt('5001'),
          assignment_id: BigInt('1001'),
          student_id: BigInt('101'),
          status: 'submitted',
          ocr_text: 'Student answer sheet transcription ready',
          submitted_at: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
          Assignment: { reasoning_model: 'gemini-2.5-flash', title: 'Science Exam' },
        },
      ] as any);

      vi.spyOn(prisma.batchJob, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.assignment, 'findMany').mockResolvedValueOnce([]);

      const result = await runSweeperJob();
      expect(result.stuck_submissions_evaluated).toBe(1);
      expect(result.stuck_submissions_retried).toBe(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });
  });
});

