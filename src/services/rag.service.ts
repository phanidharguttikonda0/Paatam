import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { AiGatewayService } from './aiGateway.service';
import { parseJsonValue } from '../utils/jsonParser';

export interface ChapterMetadataResult {
  chapterNumber: number;
  chapterTitle: string;
  subtopics: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
}

export class RagService {
  /**
   * Generates a 1536-dimensional or 768-dimensional vector embedding via Google Gemini API
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      // Mock deterministic embedding vector for local testing if no key provided
      return Array.from({ length: 1536 }, (_, i) => Math.sin(i + text.length) * 0.05);
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: text.substring(0, 8000) }] },
          }),
        }
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        const values: number[] = data?.embedding?.values || [];
        // Pad or truncate to 1536 dimensions if needed
        if (values.length < 1536) {
          const padded = [...values];
          while (padded.length < 1536) padded.push(0);
          return padded;
        }
        return values.slice(0, 1536);
      }
    } catch (err: any) {
      console.warn('⚠️ [RAG EMBEDDING] Embedding call failed:', err.message);
    }

    return Array.from({ length: 1536 }, (_, i) => Math.sin(i + text.length) * 0.05);
  }

  /**
   * Slices full chapter text into overlapping semantic paragraph chunks
   */
  public static createSemanticParagraphChunks(
    fullText: string,
    targetChunkSize = 700,
    overlapSize = 250
  ): string[] {
    if (!fullText) return [];
    const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if ((currentChunk + '\n\n' + cleanPara).length > targetChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Add overlap from previous chunk
        const overlap = currentChunk.slice(-overlapSize);
        currentChunk = overlap + '\n\n' + cleanPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Uses Gemini AI to analyze raw textbook text and extract chapter metadata & key subtopics
   */
  public static async extractChapterMetadataWithAI(
    chapterText: string,
    fileName = 'Chapter.pdf',
    preferredTitle?: string,
    preferredNumber?: number
  ): Promise<ChapterMetadataResult> {
    const snippet = chapterText.substring(0, 7000);
    const prompt = `You are a curriculum specialist. Analyze this textbook chapter document and extract structured metadata.
File name: "${fileName}"
Preferred title: "${preferredTitle || 'Auto-detect'}"
Preferred number: ${preferredNumber || 'Auto-detect'}

Document Excerpt:
${snippet}

Output JSON schema ONLY:
{
  "chapterNumber": 1,
  "chapterTitle": "Electricity and Magnetism",
  "subtopics": ["Electric Current", "Ohm's Law", "Resistance in Series and Parallel", "Heating Effect of Current"],
  "learningOutcomes": ["Understand electric potential", "Apply Ohm's law to circuits"],
  "prerequisites": ["Basic atomic structure"]
}`;

    const raw = await AiGatewayService.callGeminiText(prompt);
    const parsed = parseJsonValue(raw, '{');

    return {
      chapterNumber: Number(parsed?.chapterNumber) || preferredNumber || 1,
      chapterTitle: preferredTitle || parsed?.chapterTitle || `Chapter ${preferredNumber || 1}`,
      subtopics: Array.isArray(parsed?.subtopics) ? parsed.subtopics : ['Core Concepts'],
      learningOutcomes: Array.isArray(parsed?.learningOutcomes) ? parsed.learningOutcomes : [],
      prerequisites: Array.isArray(parsed?.prerequisites) ? parsed.prerequisites : [],
    };
  }

  /**
   * Ingests a textbook chapter into PostgreSQL (CurriculumChapter & TextbookEmbedding models)
   */
  public static async ingestChapter(params: {
    classSubjectId: string;
    chapterText: string;
    pdfUrl?: string;
    chapterTitle?: string;
    chapterNumber?: number;
    fileName?: string;
  }) {
    const classSubjectIdBigInt = parseBigInt(params.classSubjectId, 'class_subject_id');

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectIdBigInt },
      include: { Subject: true, Class: true },
    });

    if (!classSubject) {
      throw new Error(`ClassSubject ${params.classSubjectId} not found`);
    }

    // 1. Resolve chapter metadata
    const metadata = await this.extractChapterMetadataWithAI(
      params.chapterText,
      params.fileName || 'Chapter.pdf',
      params.chapterTitle,
      params.chapterNumber
    );

    // 2. Upsert CurriculumChapter in DB
    const chapterId = idGenerator.nextId();
    const chapter = await prisma.curriculumChapter.create({
      data: {
        id: chapterId,
        class_subject_id: classSubjectIdBigInt,
        chapter_number: metadata.chapterNumber,
        chapter_title: metadata.chapterTitle,
        subtopics: metadata.subtopics as any,
        pdf_url: params.pdfUrl || null,
        chunk_count: 0,
      },
    });

    // 3. Create semantic chunks
    const chunks = this.createSemanticParagraphChunks(params.chapterText, 700, 250);

    // 4. Insert chunks & embeddings
    let insertedCount = 0;
    for (const chunkText of chunks) {
      const embedding = await this.generateEmbedding(chunkText);
      const embeddingId = idGenerator.nextId();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "TextbookEmbedding" ("id", "chapter_id", "class_subject_id", "content_chunk", "subtopics", "embedding_dimensions")
         VALUES ($1, $2, $3, $4, $5, 1536)`,
        embeddingId,
        chapter.id,
        classSubjectIdBigInt,
        chunkText,
        JSON.stringify(metadata.subtopics)
      );
      insertedCount++;
    }

    // 5. Update chunk_count
    await prisma.curriculumChapter.update({
      where: { id: chapter.id },
      data: { chunk_count: insertedCount },
    });

    return {
      chapter_id: chapter.id.toString(),
      chapter_number: chapter.chapter_number,
      chapter_title: chapter.chapter_title,
      subtopics: metadata.subtopics,
      chunks_count: insertedCount,
    };
  }

  /**
   * Ingests a syllabus structure and creates CurriculumTopic records
   */
  public static async ingestSyllabus(params: {
    classSubjectId: string;
    syllabusText: string;
  }) {
    const classSubjectIdBigInt = parseBigInt(params.classSubjectId, 'class_subject_id');

    const prompt = `You are a curriculum framework analyst.
Extract units, topics, subtopics, and mark weightages from this syllabus text:
${params.syllabusText.substring(0, 10000)}

Output JSON schema ONLY:
[
  {
    "unitNumber": 1,
    "unitName": "Unit 1: Chemical Substances",
    "topicName": "Chemical Reactions and Equations",
    "subtopics": ["Types of chemical reactions", "Oxidation and reduction", "Corrosion and rancidity"],
    "prescribedWeightage": 25
  }
]`;

    const raw = await AiGatewayService.callGeminiText(prompt);
    const parsed = parseJsonValue(raw, '[');

    if (!Array.isArray(parsed)) return [];

    const createdTopics = [];
    for (const item of parsed) {
      const topicId = idGenerator.nextId();
      const topic = await prisma.curriculumTopic.create({
        data: {
          id: topicId,
          class_subject_id: classSubjectIdBigInt,
          unit_number: Number(item.unitNumber) || 1,
          unit_name: item.unitName || `Unit ${item.unitNumber || 1}`,
          topic_name: item.topicName || 'General Topic',
          subtopics: (item.subtopics || []) as any,
          prescribed_weightage: Number(item.prescribedWeightage) || 0,
        },
      });
      createdTopics.push(topic);
    }

    return createdTopics.map((t) => ({
      id: t.id.toString(),
      unit_number: t.unit_number,
      unit_name: t.unit_name,
      topic_name: t.topic_name,
      subtopics: t.subtopics,
      prescribed_weightage: t.prescribed_weightage,
    }));
  }

  /**
   * Retrieves relevant textbook context for a class subject and chapters
   */
  public static async getChapterContext(
    classSubjectId: string,
    chapterIds?: string[]
  ): Promise<string> {
    const classSubjectIdBigInt = parseBigInt(classSubjectId, 'class_subject_id');

    const whereClause: any = {
      class_subject_id: classSubjectIdBigInt,
    };

    if (chapterIds && chapterIds.length > 0) {
      const chapterBigInts = chapterIds.map((id) => parseBigInt(id, 'chapter_id'));
      whereClause.chapter_id = { in: chapterBigInts };
    }

    const embeddings = await prisma.textbookEmbedding.findMany({
      where: whereClause,
      take: 20,
      select: {
        content_chunk: true,
      },
    });

    return embeddings.map((e) => e.content_chunk).join('\n\n');
  }

  /**
   * Performs semantic similarity search using pgvector cosine distance (<=>)
   */
  public static async searchSimilarChunks(
    classSubjectId: string,
    queryText: string,
    topK: number = 5
  ): Promise<Array<{ id: string; content_chunk: string; similarity: number }>> {
    const classSubjectIdBigInt = parseBigInt(classSubjectId, 'class_subject_id');
    const queryEmbedding = await this.generateEmbedding(queryText);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    try {
      const results: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, content_chunk, 1 - (embedding <=> $1::vector) AS similarity
         FROM "TextbookEmbedding"
         WHERE class_subject_id = $2 AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector ASC
         LIMIT $3`,
        vectorString,
        classSubjectIdBigInt,
        topK
      );

      return results.map((r) => ({
        id: r.id.toString(),
        content_chunk: r.content_chunk,
        similarity: Number(r.similarity),
      }));
    } catch (err: any) {
      console.warn('⚠️ [RAG PGVECTOR] Vector similarity query notice (fallback to text chunk retrieval):', err.message);
      const fallback = await prisma.textbookEmbedding.findMany({
        where: { class_subject_id: classSubjectIdBigInt },
        take: topK,
        select: { id: true, content_chunk: true },
      });
      return fallback.map((f) => ({ id: f.id.toString(), content_chunk: f.content_chunk, similarity: 1.0 }));
    }
  }
}
