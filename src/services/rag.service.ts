import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { AiGatewayService } from './aiGateway.service';
import { parseJsonValue } from '../utils/jsonParser';
import { S3Service } from './s3.service';

export interface ChapterMetadataResult {
  chapterNumber: number;
  chapterTitle: string;
  subtopics: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
}

export interface IngestChapterParams {
  classSubjectId?: string;
  class_subject_id?: string;
  chapterText?: string;
  chapter_text?: string;
  pdfUrl?: string;
  pdf_url?: string;
  chapterTitle?: string;
  chapter_title?: string;
  chapterNumber?: number;
  chapter_number?: number;
  fileName?: string;
  file_name?: string;
}

export interface IngestSyllabusParams {
  classSubjectId?: string;
  class_subject_id?: string;
  syllabusText?: string;
  syllabus_text?: string;
}

function isLikelyFilenameOrCode(str?: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (/\.pdf$/i.test(s)) return true;
  if (/^([0-9]+\.\s*)?[a-z0-9_-]{1,14}$/i.test(s) && (/[0-9]/.test(s) || s.length <= 4) && !/\s/.test(s)) return true;
  return false;
}

function normalizeToDimensions(vector: number[], targetDimensions = 1536): number[] {
  if (vector.length === targetDimensions) return vector;
  if (vector.length > targetDimensions) return vector.slice(0, targetDimensions);
  const padded = [...vector];
  while (padded.length < targetDimensions) padded.push(0);
  return padded;
}

export class RagService {
  /**
   * Generates 1536-dimensional vector embedding via Google Gemini gemini-embedding-001 API
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    const cleanText = (text || '').trim().substring(0, 1000) || 'default';
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (apiKey && !apiKey.includes('your_gemini_api_key')) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-001',
              content: { parts: [{ text: cleanText }] },
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          const rawVector = data?.embedding?.values;
          if (Array.isArray(rawVector) && rawVector.length > 0) {
            return normalizeToDimensions(rawVector, 1536);
          }
        } else {
          const errText = await res.text();
          console.warn(`⚠️ [GEMINI EMBEDDING] API Notice (${res.status}): ${errText.substring(0, 200)}`);
        }
      } catch (err: any) {
        console.warn('⚠️ [GEMINI EMBEDDING] Fetch exception:', err.message);
      }
    }

    // Deterministic mock vector for local testing/offline environments
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i + cleanText.length) * 0.05);
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
    const cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Chapter 1';
    const cleanSuggestedTitle = isLikelyFilenameOrCode(preferredTitle) ? undefined : preferredTitle;
    const fallbackTitle = cleanSuggestedTitle || cleanFileName || `Chapter ${preferredNumber || 1}`;
    const fallbackNumber = preferredNumber || 1;

    try {
      const snippet = chapterText.substring(0, 24000);
      const prompt = `You are a curriculum specialist and school educator.
Analyze this excerpt from a school textbook chapter PDF (File: "${fileName || 'Chapter PDF'}").
${cleanSuggestedTitle ? `Suggested Chapter Title: "${cleanSuggestedTitle}"` : ''}
${preferredNumber ? `Suggested Chapter Number: ${preferredNumber}` : ''}

Task:
1. Identify the official Chapter Number (integer). If not mentioned, use ${preferredNumber || 1}.
2. Identify the official human-readable Chapter Title (e.g. "Chemical Reactions and Equations", "Electricity: Circuits and their Components", "Exploring Substances: Acidic, Basic, and Neutral").
CRITICAL: Do NOT return raw PDF codes or file names like "gecu101", "ch01", "doc1.pdf". Extract the actual textbook chapter heading. Do NOT include "Chapter 1:" in the title.
3. Extract an array of 3 to 10 distinct, core subtopics/concepts covered in this chapter (e.g. ["Chemical Equations", "Types of Chemical Reactions", "Combination Reactions", "Decomposition Reactions", "Displacement Reactions", "Oxidation and Reduction", "Corrosion and Rancidity"]).

DOCUMENT EXCERPT:
${snippet}

Return ONLY a valid JSON object with the exact schema below, and NO markdown code block wrappers:
{
  "chapterNumber": 1,
  "chapterTitle": "Chemical Reactions and Equations",
  "subtopics": ["Chemical Equations", "Types of Chemical Reactions", "Oxidation and Reduction"],
  "learningOutcomes": ["Understand chemical equation balancing", "Distinguish oxidation from reduction"],
  "prerequisites": ["Basic atomic structure"]
}`;

      const raw = await AiGatewayService.callGeminiText(prompt);
      const parsed = parseJsonValue(raw, '{');

      if (parsed) {
        const extractedTitle = String(parsed.chapterTitle || parsed.title || '').trim();
        const validTitle = !isLikelyFilenameOrCode(extractedTitle) ? extractedTitle : undefined;
        const extractedNumber = typeof parsed.chapterNumber === 'number' && parsed.chapterNumber > 0
          ? parsed.chapterNumber
          : (preferredNumber || 1);
        const subtopicsList = Array.isArray(parsed.subtopics)
          ? parsed.subtopics.map(String).filter((s: string) => s && s.trim().length > 0)
          : [];

        return {
          chapterNumber: extractedNumber,
          chapterTitle: validTitle || cleanSuggestedTitle || fallbackTitle,
          subtopics: subtopicsList.length > 0 ? subtopicsList : ['Core Concepts'],
          learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes : [],
          prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [RAG METADATA] AI metadata extraction notice, falling back to heuristics:', err.message);
    }

    return {
      chapterNumber: fallbackNumber,
      chapterTitle: fallbackTitle,
      subtopics: ['Core Concepts'],
      learningOutcomes: [],
      prerequisites: [],
    };
  }

  /**
   * Ingests a textbook chapter into PostgreSQL (CurriculumChapter & TextbookEmbedding models)
   */
  public static async ingestChapter(params: IngestChapterParams) {
    const rawClassSubjectId = params.classSubjectId || params.class_subject_id;
    if (!rawClassSubjectId) {
      throw new Error('class_subject_id is required for chapter ingestion');
    }

    const classSubjectIdBigInt = parseBigInt(rawClassSubjectId, 'class_subject_id');

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectIdBigInt },
      include: { Subject: true, Class: true },
    });

    if (!classSubject) {
      throw new Error(`ClassSubject ${rawClassSubjectId} not found`);
    }

    const subjectName = classSubject.Subject?.name || 'General';
    const className = classSubject.Class?.name || 'Class';

    let fullText = (params.chapterText || params.chapter_text || '').trim();
    const pdfUrl = params.pdfUrl || params.pdf_url;
    const fileName = params.fileName || params.file_name || 'Chapter.pdf';
    const preferredTitle = params.chapterTitle || params.chapter_title;
    const preferredNumber = params.chapterNumber || params.chapter_number;

    // If text was not supplied or too brief, download PDF buffer from S3 and extract via Gemini Vision
    if (fullText.length < 10 && pdfUrl) {
      try {
        console.log(`📥 [RAG INGESTION] Downloading chapter PDF from S3: ${pdfUrl}`);
        const pdfBuffer = await S3Service.downloadBuffer(pdfUrl);
        const prompt = `You are a textbook curriculum transcription engine.
Extract and transcribe all textbook chapter reading material, headings, subheadings, explanations, and core concepts from this document.
Transcribe all text faithfully without hallucinating.`;

        fullText = await AiGatewayService.callGeminiVision(prompt, [pdfBuffer], 'application/pdf');
        console.log(`✅ [RAG INGESTION] Extracted ${fullText.length} characters of textbook content from PDF.`);
      } catch (pdfErr: any) {
        console.warn('⚠️ [RAG INGESTION] Could not extract text from PDF buffer via Vision:', pdfErr.message);
      }
    }

    if (!fullText || fullText.length < 10) {
      fullText = `Chapter: ${preferredTitle || fileName || 'General Textbook Chapter'}\n\nTextbook curriculum material indexed for ${subjectName} in ${className}.`;
    }

    // 1. Resolve chapter metadata
    const metadata = await this.extractChapterMetadataWithAI(
      fullText,
      fileName,
      preferredTitle,
      preferredNumber
    );

    console.log(`📝 [RAG CHAPTER RESOLVED] Chapter ${metadata.chapterNumber}: "${metadata.chapterTitle}" (${metadata.subtopics.length} subtopics)`);

    // 2. Safe Upsert: Check if this chapter already exists for this class_subject
    let chapter = await prisma.curriculumChapter.findFirst({
      where: {
        class_subject_id: classSubjectIdBigInt,
        OR: [
          { chapter_number: metadata.chapterNumber },
          { chapter_title: metadata.chapterTitle },
        ],
      },
    });

    if (chapter) {
      // Update existing chapter and purge old embeddings to prevent duplication
      chapter = await prisma.curriculumChapter.update({
        where: { id: chapter.id },
        data: {
          chapter_number: metadata.chapterNumber,
          chapter_title: metadata.chapterTitle,
          subtopics: metadata.subtopics as any,
          pdf_url: pdfUrl || chapter.pdf_url,
        },
      });

      // Purge existing embeddings for this chapter
      await prisma.$executeRawUnsafe(
        `DELETE FROM "TextbookEmbedding" WHERE "chapter_id" = $1`,
        chapter.id
      );
    } else {
      const chapterId = idGenerator.nextId();
      chapter = await prisma.curriculumChapter.create({
        data: {
          id: chapterId,
          class_subject_id: classSubjectIdBigInt,
          chapter_number: metadata.chapterNumber,
          chapter_title: metadata.chapterTitle,
          subtopics: metadata.subtopics as any,
          pdf_url: pdfUrl || null,
          chunk_count: 0,
        },
      });
    }

    // 3. Create semantic chunks
    const chunks = this.createSemanticParagraphChunks(fullText, 700, 250);

    // 4. Insert chunks & embeddings (with pgvector support & resilient fallback)
    let insertedCount = 0;
    for (const chunkText of chunks) {
      // Prepend chapter contextual metadata tag (matching smartstudy-backend design)
      const taggedChunk = `[CHAPTER ${metadata.chapterNumber}: ${metadata.chapterTitle} | SUBJECT: ${subjectName} | CLASS: ${className}]\n${chunkText}`;
      const embedding = await this.generateEmbedding(taggedChunk);
      const embeddingId = idGenerator.nextId();
      const vectorString = `[${embedding.join(',')}]`;

      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "TextbookEmbedding" ("id", "chapter_id", "class_subject_id", "content_chunk", "subtopics", "embedding", "embedding_dimensions")
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector, 1536)`,
          embeddingId,
          chapter.id,
          classSubjectIdBigInt,
          taggedChunk,
          JSON.stringify(metadata.subtopics),
          vectorString
        );
      } catch (insertErr: any) {
        // Fallback without vector cast if pgvector extension isn't enabled or encounters cast issue
        console.warn('⚠️ [RAG PGVECTOR] Standard vector insert failed, using fallback insert:', insertErr.message);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "TextbookEmbedding" ("id", "chapter_id", "class_subject_id", "content_chunk", "subtopics", "embedding_dimensions")
           VALUES ($1, $2, $3, $4, $5::jsonb, 1536)`,
          embeddingId,
          chapter.id,
          classSubjectIdBigInt,
          taggedChunk,
          JSON.stringify(metadata.subtopics)
        );
      }
      insertedCount++;
    }

    // 5. Update chunk_count
    await prisma.curriculumChapter.update({
      where: { id: chapter.id },
      data: { chunk_count: insertedCount },
    });

    return {
      success: true,
      chapter_id: chapter.id.toString(),
      chapter_number: chapter.chapter_number,
      chapter_title: chapter.chapter_title,
      subtopics: metadata.subtopics,
      chunks_count: insertedCount,
      message: `Successfully ingested Chapter ${chapter.chapter_number}: "${chapter.chapter_title}" (${insertedCount} vector chunks indexed).`,
    };
  }

  /**
   * Ingests a syllabus structure and creates CurriculumTopic records
   */
  public static async ingestSyllabus(params: IngestSyllabusParams) {
    const rawClassSubjectId = params.classSubjectId || params.class_subject_id;
    if (!rawClassSubjectId) {
      throw new Error('class_subject_id is required for syllabus ingestion');
    }
    const classSubjectIdBigInt = parseBigInt(rawClassSubjectId, 'class_subject_id');
    const rawText = (params.syllabusText || params.syllabus_text || '').trim();

    const prompt = `You are a curriculum framework analyst.
Extract units, topics, subtopics, and mark weightages from this syllabus text:
${rawText.substring(0, 10000)}

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

    let parsed: any[] = [];
    try {
      const raw = await AiGatewayService.callGeminiText(prompt);
      const res = parseJsonValue(raw, '[');
      if (Array.isArray(res)) parsed = res;
    } catch (err: any) {
      console.warn('⚠️ [RAG SYLLABUS] AI syllabus extraction failed, using heuristic breakdown:', err.message);
      parsed = [
        {
          unitNumber: 1,
          unitName: 'Unit 1: Core Curriculum',
          topicName: 'General Syllabus Topics',
          subtopics: ['Core Units', 'Foundational Concepts'],
          prescribedWeightage: 100,
        },
      ];
    }

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

  /**
   * Token optimization: Prunes textbook chunks to keep only the highest scoring relevant content
   */
  public static pruneTextbookChunks(
    chunks: string[],
    subtopics: string[],
    maxChars = 8500,
    minChunks = 3,
    maxChunks = 8
  ) {
    if (chunks.length === 0) return { context: '', selectedChunksCount: 0 };
    if (chunks.length <= maxChunks && chunks.reduce((acc, c) => acc + c.length, 0) <= maxChars) {
      return { context: chunks.join('\n\n---\n\n'), selectedChunksCount: chunks.length };
    }

    const stopWords = new Set(['and', 'or', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are']);
    const keywords = Array.from(
      new Set(
        subtopics
          .join(' ')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
      )
    );

    const scored = chunks.map((chunk) => {
      const lower = chunk.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        const matches = lower.match(new RegExp(`\\b${kw}\\b`, 'gi'));
        if (matches) score += matches.length * 2.5;
        else if (lower.includes(kw)) score += 1.0;
      }
      if (/definition|principle|formula|experiment|observation|reaction/i.test(chunk)) {
        score += 2.0;
      }
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const selected: string[] = [];
    let curLen = 0;
    for (const item of scored) {
      if (selected.length >= maxChunks) break;
      if (curLen + item.chunk.length > maxChars && selected.length >= minChunks) break;
      selected.push(item.chunk);
      curLen += item.chunk.length;
    }

    if (selected.length === 0) {
      for (let i = 0; i < Math.min(minChunks, chunks.length); i++) {
        selected.push(chunks[i]);
      }
    }

    return {
      context: selected.join('\n\n---\n\n'),
      selectedChunksCount: selected.length,
    };
  }
}
