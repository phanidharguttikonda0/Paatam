import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiGatewayService } from '../services/aiGateway.service';
import { RagService } from '../services/rag.service';
import { SqsService } from '../services/sqs.service';
import { handler as bulkSplitHandler } from '../lambdas/bulkSplit.lambda';
import { handler as paperOcrHandler } from '../lambdas/paperOcr.lambda';
import { handler as paperEvaluationHandler } from '../lambdas/paperEvaluation.lambda';
import * as bulkWorker from '../workers/bulkSplit.worker';
import * as ocrWorker from '../workers/paperOcr.worker';
import * as evalWorker from '../workers/paperEvaluation.worker';
import request from 'supertest';
import { app } from '../../server';

describe('RAG & Asynchronous AI Pipeline Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Runtime Model Configuration & Health Endpoint', () => {
    it('should report active runtime models in /health and /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.geminiModel).toBe('gemini-3.6-flash');
      expect(res.body.sarvamChatModel).toBe('sarvam-105b');
      expect(res.body.primaryProvider).toBeDefined();
    });

    it('should default to gemini-3.6-flash for standard reasoning', () => {
      const model = AiGatewayService.determineReasoningModel('General Science', 'What is water?', 'English');
      expect(model).toBe('gemini-3.6-flash');
    });

    it('should route Indic languages to sarvam when configured', () => {
      const originalKey = process.env.SARVAM_API_KEY;
      process.env.SARVAM_API_KEY = 'test-sarvam-key';
      const model = AiGatewayService.determineReasoningModel('Hindi Literature', 'कबीर के दोहे का अर्थ बताइए', 'Hindi');
      expect(model).toBe('sarvam');
      process.env.SARVAM_API_KEY = originalKey;
    });

    it('should route STEM questions with formulas to gemini-1.5-pro', () => {
      const stemPrompt = 'Compute the integral \\int_{0}^{\\pi} \\sin(x) dx';
      const model = AiGatewayService.determineReasoningModel('Mathematics', stemPrompt, 'English');
      expect(model).toBe('gemini-1.5-pro');
    });
  });

  describe('2. RAG Knowledge Base & Chunking Logic', () => {
    it('should create overlapping semantic paragraph chunks with custom target size', () => {
      const paragraphA = 'Photosynthesis is the process by which green plants transform light energy into chemical energy.';
      const paragraphB = 'During photosynthesis in green plants, light energy is captured and used to convert water and carbon dioxide into oxygen and energy-rich organic compounds.';
      const fullText = `${paragraphA}\n\n${paragraphB}`;

      const chunks = RagService.createSemanticParagraphChunks(fullText, 100, 30);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0]).toContain('Photosynthesis');
    });

    it('should produce multiple chunks from text formatted with single newlines', () => {
      const singleNewlineText = [
        'Major nutrients in our food are named carbohydrates, proteins, fats, vitamins and minerals.',
        'In addition, food contains dietary fibres and water which are also needed by our body.',
        'Carbohydrates and fats mainly provide energy to our body.',
        'Proteins and minerals are needed for the growth and the maintenance of our body.',
        'Vitamins help in protecting our body against diseases.',
        'Balanced diet provides all the nutrients that our body needs in right quantities.',
        'Deficiency of one or more nutrients in our food for a long time may cause certain diseases.',
      ].join('\n');

      const chunks = RagService.createSemanticParagraphChunks(singleNewlineText, 180, 40);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((c) => c.length <= 220)).toBe(true);
    });

    it('should split an oversized single paragraph into multiple chunks via sentence boundaries', () => {
      const longSentenceBlock = 'Chemical reactions involve breaking and making of bonds between atoms. '.repeat(20);
      const chunks = RagService.createSemanticParagraphChunks(longSentenceBlock, 300, 50);
      expect(chunks.length).toBeGreaterThan(2);
    });

    it('should extract canonical chapter title and reject raw filenames or codes', async () => {
      vi.spyOn(AiGatewayService, 'callGeminiText').mockResolvedValueOnce(
        JSON.stringify({
          chapterNumber: 1,
          chapterTitle: 'Chemical Reactions and Equations',
          subtopics: ['Combination Reactions', 'Oxidation and Reduction', 'Corrosion'],
        })
      );

      const metadata = await RagService.extractChapterMetadataWithAI(
        'Chapter 1 text content...',
        'gecu101.pdf',
        'gecu101'
      );

      expect(metadata.chapterNumber).toBe(1);
      expect(metadata.chapterTitle).toBe('Chemical Reactions and Equations');
      expect(metadata.chapterTitle).not.toBe('gecu101');
      expect(metadata.subtopics).toContain('Combination Reactions');
    });

    it('should prune textbook chunks using keyword relevance scoring', () => {
      const chunks = [
        'Chemical reactions involve breaking and making of bonds between atoms to produce new substances.',
        'The heating effect of electric current depends on resistance and time.',
        'Combination reactions occur when two or more reactants combine to form a single product.',
        'Magnets have two poles: north and south.',
      ];

      const subtopics = ['Chemical reactions', 'Combination reactions'];
      const pruned = RagService.pruneTextbookChunks(chunks, subtopics, 300, 1, 2);

      expect(pruned.selectedChunksCount).toBeLessThanOrEqual(2);
      expect(pruned.context).toContain('Chemical reactions');
    });

    it('should generate 1536-dimensional embeddings with deterministic mock fallback', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const vector = await RagService.generateEmbedding('Test curriculum concept');
      expect(vector).toHaveLength(1536);
      expect(typeof vector[0]).toBe('number');

      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  describe('3. Asynchronous AI Pipeline (SQS Dispatchers & Lambda Workers)', () => {
    it('should dispatch messages through SqsService in mock/test mode', async () => {
      const resultOcr = await SqsService.dispatchAssignmentOcr({
        assignment_id: '1001',
        section_id: '2001',
        class_subject_id: '3001',
        question_paper_url: 'https://s3.aws.com/paper.pdf',
        timestamp: Date.now(),
      });
      expect(resultOcr).toMatch(/^mock-sqs-/);

      const resultBulk = await SqsService.dispatchBulkSplit({
        job_id: '5001',
        assignment_id: '1001',
        section_id: '2001',
        master_pdf_url: 'https://s3.aws.com/master.pdf',
        timestamp: Date.now(),
      });
      expect(resultBulk).toMatch(/^mock-sqs-/);

      const resultPaperOcr = await SqsService.dispatchPaperOcr({
        submission_id: '6001',
        assignment_id: '1001',
        student_id: '7001',
        paper_urls: ['https://s3.aws.com/student.pdf'],
        timestamp: Date.now(),
      });
      expect(resultPaperOcr).toMatch(/^mock-sqs-/);

      const resultEvaluation = await SqsService.dispatchPaperEvaluation({
        submission_id: '6001',
        assignment_id: '1001',
        student_id: '7001',
        ocr_text: 'Student answers',
        timestamp: Date.now(),
      });
      expect(resultEvaluation).toMatch(/^mock-sqs-/);
    });

    it('should handle bulk split Lambda events and invoke bulk worker', async () => {
      const spy = vi.spyOn(bulkWorker, 'processBulkSplitJob').mockResolvedValueOnce({
        job_id: '5001',
        total_split: 5,
        created_submissions_count: 5,
      });

      const event = {
        Records: [
          {
            body: JSON.stringify({
              job_id: '5001',
              assignment_id: '1001',
              section_id: '2001',
              master_pdf_url: 'https://s3.aws.com/master.pdf',
            }),
          },
        ],
      };

      const result = await bulkSplitHandler(event);
      expect(result.statusCode).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle paper OCR Lambda events and invoke OCR worker', async () => {
      const spy = vi.spyOn(ocrWorker, 'processPaperOcrJob').mockResolvedValueOnce({
        submission_id: '6001',
        ocr_length: 500,
        status: 'ocr_completed',
      });

      const event = {
        Records: [
          {
            body: JSON.stringify({
              submission_id: '6001',
              assignment_id: '1001',
              student_id: '7001',
              paper_urls: ['https://s3.aws.com/student.pdf'],
            }),
          },
        ],
      };

      const result = await paperOcrHandler(event);
      expect(result.statusCode).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle paper evaluation Lambda events and invoke evaluation worker', async () => {
      const spy = vi.spyOn(evalWorker, 'processPaperEvaluationJob').mockResolvedValueOnce({
        submission_id: '6001',
        score: 18,
        max_score: 20,
        status: 'graded',
      });

      const event = {
        Records: [
          {
            body: JSON.stringify({
              submission_id: '6001',
              assignment_id: '1001',
              student_id: '7001',
              ocr_text: 'Student answer sheet text',
            }),
          },
        ],
      };

      const result = await paperEvaluationHandler(event);
      expect(result.statusCode).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});

