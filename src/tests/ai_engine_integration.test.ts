import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeIndicDigits, canonicalQuestionKey, extractRelevantOcrEvidence } from '../utils/aiUtils';
import { SarvamService } from '../services/sarvam.service';
import { PaperGeneratorService } from '../services/paperGenerator.service';
import { RagService } from '../services/rag.service';
import { AiGatewayService } from '../services/aiGateway.service';
import { S3Service } from '../services/s3.service';

describe('AI Engine & Production Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Indic Digit & OCR Evidence Utilities (Module 4)', () => {
    it('should normalize Devanagari numerals to Arabic digits', () => {
      expect(normalizeIndicDigits('प्रश्न १: हल कीजिए (२ + ३ = ५)')).toBe('प्रश्न 1: हल कीजिए (2 + 3 = 5)');
    });

    it('should normalize Telugu numerals to Arabic digits', () => {
      expect(normalizeIndicDigits('ప్రశ్న ౧: (౪ + ౬ = ౧౦)')).toBe('ప్రశ్న 1: (4 + 6 = 10)');
    });

    it('should resolve canonical question key consistently', () => {
      expect(canonicalQuestionKey('Question 1(a)')).toBe('1a');
      expect(canonicalQuestionKey('Q. 4')).toBe('4');
      expect(canonicalQuestionKey('प्रश्न २')).toBe('2');
      expect(canonicalQuestionKey('ప్రశ్న ౩')).toBe('3');
      expect(canonicalQuestionKey(null)).toBeNull();
    });

    it('should cap and filter OCR evidence to avoid context blowup', () => {
      const longText = Array.from({ length: 50 }, (_, i) => `Line ${i}: Student written answer`).join('\n');
      const filtered = extractRelevantOcrEvidence(longText, [], 300);
      expect(filtered.length).toBeLessThanOrEqual(350);
    });
  });

  describe('2. Sarvam Document AI & Indic Routing (Module 3)', () => {
    it('should correctly identify Hindi and Telugu language queries', () => {
      expect(SarvamService.isHindi('Hindi')).toBe(true);
      expect(SarvamService.isHindi('हिन्दी')).toBe(true);
      expect(SarvamService.isTelugu('Telugu')).toBe(true);
      expect(SarvamService.isTelugu('తెలుగు')).toBe(true);
      expect(SarvamService.isHindiOrTelugu('English', 'Physics')).toBe(false);
    });

    it('should return correct BCP-47 language codes for Sarvam', () => {
      expect(SarvamService.sarvamDocumentLanguageCode('Hindi')).toBe('hi-IN');
      expect(SarvamService.sarvamDocumentLanguageCode('Telugu')).toBe('te-IN');
      expect(SarvamService.sarvamDocumentLanguageCode('Tamil')).toBe('ta-IN');
      expect(SarvamService.sarvamDocumentLanguageCode('Klingon')).toBeNull();
    });
  });

  describe('3. AI Question Paper Generation Engine (Module 1)', () => {
    it('should generate a complete structured exam from blueprint parameters', async () => {
      const mockQuestions = [
        {
          number: 1,
          section: 'Section A',
          type: 'mcq',
          marks: 1,
          text: 'What is the SI unit of electric current?',
          options: ['A) Volt', 'B) Ampere', 'C) Ohm', 'D) Watt'],
          correctAnswer: 'B) Ampere',
          rubricKey: 'Current is measured in Amperes (A).',
          stem: 'Electricity',
          hasVisual: false,
        },
        {
          number: 2,
          section: 'Section B',
          type: 'short',
          marks: 3,
          text: 'State Ohm’s law and derive V = IR.',
          options: null,
          correctAnswer: 'Potential difference is directly proportional to current at constant temperature.',
          rubricKey: '1 mark for definition, 2 marks for derivation.',
          stem: 'Electricity',
          hasVisual: false,
        },
      ];

      vi.spyOn(AiGatewayService, 'callGeminiText').mockResolvedValueOnce(
        JSON.stringify(mockQuestions)
      );

      const result = await PaperGeneratorService.generateExamQuestionsUnified({
        examTitle: 'Term 1 Science Exam',
        className: 'Grade 10',
        subjectName: 'Physics',
        targetMarks: 25,
        questionCounts: {
          mcqCount: 1,
          veryShortCount: 0,
          shortCount: 1,
          descriptiveCount: 0,
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('mcq');
      expect(result[0].correctAnswer).toBe('B) Ampere');
      expect(result[1].marks).toBe(3);
    });

    it('should regenerate a single question for an exam slot', async () => {
      const mockReplacement = {
        text: 'Calculate the equivalent resistance of two 4 ohm resistors in parallel.',
        type: 'short',
        marks: 2,
        options: null,
        correctAnswer: '1/Req = 1/4 + 1/4 = 2/4 => Req = 2 ohms.',
        rubricKey: 'Formula 1m, Calculation 1m.',
        stem: 'Electricity',
        hasVisual: false,
      };

      vi.spyOn(AiGatewayService, 'callGeminiText').mockResolvedValueOnce(
        JSON.stringify(mockReplacement)
      );

      const replacement = await PaperGeneratorService.generateSingleQuestionReplacement({
        subjectName: 'Physics',
        className: 'Grade 10',
        chapterTitle: 'Electricity',
        questionType: 'short',
        marks: 2,
        currentQuestionText: 'Old question',
      });

      expect(replacement).not.toBeNull();
      expect(replacement?.text).toContain('equivalent resistance');
      expect(replacement?.marks).toBe(2);
    });

    it('should synthesize a responsive SVG diagram for geometry/physics questions', async () => {
      vi.spyOn(AiGatewayService, 'callGeminiText').mockResolvedValueOnce(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350"><circle cx="250" cy="175" r="100" fill="none" stroke="black"/></svg>'
      );

      const diagram = await PaperGeneratorService.generateQuestionImageOrDiagram(
        'Circuit with a 12V battery and 3 resistors in series',
        'Find the total voltage drop across each resistor.',
        'Physics'
      );

      expect(diagram.type).toBe('svg');
      expect(diagram.diagramSvg).toContain('<svg');
      expect(diagram.diagramSvg).toContain('circle');
    });
  });

  describe('4. RAG & Knowledge Graph Engine (Module 2)', () => {
    it('should create overlapping semantic paragraph chunks', () => {
      const sampleText = `Paragraph 1: Introduction to kinematics. Motion along a straight line with uniform acceleration.

Paragraph 2: Velocity-time graphs and calculation of displacement from the area under the curve.

Paragraph 3: Equations of motion v = u + at, s = ut + 0.5at^2, and v^2 = u^2 + 2as.

Paragraph 4: Relative velocity in one dimension with practical real-world problems.`;

      const chunks = RagService.createSemanticParagraphChunks(sampleText, 150, 40);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0]).toContain('kinematics');
    });

    it('should extract chapter metadata and subtopics using AI', async () => {
      const mockMetadata = {
        chapterNumber: 12,
        chapterTitle: 'Electricity and Circuits',
        subtopics: ["Ohm's Law", 'Resistors in Series', 'Electric Power'],
        learningOutcomes: ['Understand current and potential difference'],
        prerequisites: ['Basic atomic structure'],
      };

      vi.spyOn(AiGatewayService, 'callGeminiText').mockResolvedValueOnce(
        JSON.stringify(mockMetadata)
      );

      const metadata = await RagService.extractChapterMetadataWithAI(
        'Chapter content about electric charge and current...',
        'Electricity.pdf'
      );

      expect(metadata.chapterNumber).toBe(12);
      expect(metadata.chapterTitle).toBe('Electricity and Circuits');
      expect(metadata.subtopics).toHaveLength(3);
    });

    it('should generate standard vector embeddings with 1536 dimensions', async () => {
      const vector = await RagService.generateEmbedding('Force is mass times acceleration.');
      expect(vector).toHaveLength(1536);
    });
  });
});
