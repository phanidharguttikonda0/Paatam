import { PDFDocument } from 'pdf-lib';
import { AiGatewayService } from './aiGateway.service';
import { parseJsonValue } from '../utils/jsonParser';

export interface DetectedStudentBatch {
  studentName: string;
  rollNo?: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  pageNumbers: number[];
  pdfBuffer: Buffer;
  confidence: number;
}

export function cleanName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(mr|miss|ms|master|student|candidate|name)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function isSameStudent(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const a = cleanName(nameA);
  const b = cleanName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (/^student\s+\d+$/i.test(a) || /^student\s+\d+$/i.test(b)) return a === b;

  const tokensA = a.split(/\s+/).filter((t) => t.length > 1);
  const tokensB = b.split(/\s+/).filter((t) => t.length > 1);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const fnA = tokensA[0];
  const fnB = tokensB[0];

  if (tokensA.length > 1 && tokensB.length > 1) {
    const fnDist = levenshteinDistance(fnA, fnB);
    const fnClose = fnDist === 0 || (Math.max(fnA.length, fnB.length) >= 5 && fnDist <= 1);
    if (!fnClose) return false;
    if (fnDist === 0 && tokensA[1][0] === tokensB[1][0]) return true;
    return true;
  }
  return false;
}

export class StudentBoundaryService {
  /**
   * Splits a multi-student master PDF stack into individual student PDFs
   */
  public static async detectAndSplitStudentSubmissions(
    pdfBuffer: Buffer,
    options?: {
      language?: string;
      fixedPageCount?: number;
      rosterStudents?: Array<{ name: string; roll_no: string }>;
    }
  ): Promise<DetectedStudentBatch[]> {
    const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();

    if (totalPages <= 1) {
      return [
        {
          studentName: 'Student 1',
          startPage: 1,
          endPage: 1,
          pageCount: 1,
          pageNumbers: [1],
          pdfBuffer,
          confidence: 1.0,
        },
      ];
    }

    // 1. Fixed-Page / Template Mode (Instant 0-Second Mathematical Slicing)
    if (options?.fixedPageCount && options.fixedPageCount > 0) {
      const fixedCount = Math.max(1, Math.floor(options.fixedPageCount));
      const resultBatches: DetectedStudentBatch[] = [];
      let studentIdx = 1;

      for (let start = 1; start <= totalPages; start += fixedCount) {
        const end = Math.min(start + fixedCount - 1, totalPages);
        const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

        const studentDoc = await PDFDocument.create();
        const copiedPages = await studentDoc.copyPages(
          sourceDoc,
          pageNumbers.map((p) => p - 1)
        );
        copiedPages.forEach((p) => studentDoc.addPage(p));
        const subPdfBuffer = Buffer.from(await studentDoc.save());

        resultBatches.push({
          studentName: `Student ${studentIdx++}`,
          startPage: start,
          endPage: end,
          pageCount: pageNumbers.length,
          pageNumbers,
          pdfBuffer: subPdfBuffer,
          confidence: 1.0,
        });
      }
      return resultBatches;
    }

    // 2. Multi-Header Batch Boundary Detection via Gemini Vision
    // Extract pages in chunks of 8
    const BATCH_SIZE = 8;
    const allPageHeaders: Array<{
      pageNumber: number;
      hasNewStudentHeader: boolean;
      studentName?: string;
      rollNo?: string;
      isSupplementary?: boolean;
    }> = [];

    const rosterContext =
      options?.rosterStudents && options.rosterStudents.length > 0
        ? `\nKNOWN CLASS ROSTER:\n${options.rosterStudents
            .map((s) => `- ${s.name} (Roll No: ${s.roll_no})`)
            .join('\n')}\n`
        : '';

    for (let p = 1; p <= totalPages; p += BATCH_SIZE) {
      const batchPageCount = Math.min(BATCH_SIZE, totalPages - p + 1);
      const batchPageNumbers = Array.from({ length: batchPageCount }, (_, i) => p + i);

      // Extract slice for boundary inspection
      const batchDoc = await PDFDocument.create();
      const copied = await batchDoc.copyPages(
        sourceDoc,
        batchPageNumbers.map((pn) => pn - 1)
      );
      copied.forEach((cp) => batchDoc.addPage(cp));
      const batchBuffer = Buffer.from(await batchDoc.save());

      const classificationPrompt = `You are an expert exam boundary detector. Analyze this batch of ${batchPageNumbers.length} student answer-sheet pages:
Pages included: ${batchPageNumbers.join(', ')}

For EACH page, determine if it starts a NEW student's exam booklet (Title / Cover page with student credentials such as "Name:", "Student Name:", "Roll No:", "Candidate Name:"), or if it is an inner continuation sheet.
NOTE: Pages may be scanned sideways or rotated; inspect all orientations.

CRITICAL BOUNDARY RULES:
1. "hasNewStudentHeader": true ONLY if this page explicitly starts a new student's submission.
2. Inner continuation sheets containing questions and answers MUST have "hasNewStudentHeader": false.
3. CAUTION: Question numbers, section headers, or teacher marks are NOT roll numbers or student names!
4. If a page is an outline map or graph sheet without new student details, set "isSupplementary": true.
${rosterContext}

Return ONLY a valid JSON array of objects (one per page in order):
[
  {
    "pageNumber": ${batchPageNumbers[0]},
    "hasNewStudentHeader": true,
    "studentName": "Student Full Name",
    "rollNo": "Roll Number or ID",
    "isSupplementary": false
  }
]`;

      try {
        const rawResponse = await AiGatewayService.callGeminiVision(
          classificationPrompt,
          [batchBuffer],
          'application/pdf'
        );
        const parsed = parseJsonValue<any[]>(rawResponse, '[');

        if (Array.isArray(parsed) && parsed.length > 0) {
          allPageHeaders.push(...parsed);
        } else {
          // Fallback if parsing fails: mark page p as new student, others as continuation
          batchPageNumbers.forEach((pn, idx) => {
            allPageHeaders.push({
              pageNumber: pn,
              hasNewStudentHeader: idx === 0,
              studentName: `Student ${Math.ceil(pn / 2)}`,
            });
          });
        }
      } catch (err: any) {
        console.warn(`⚠️ [STUDENT BOUNDARY] Batch boundary inspection error for pages ${p}-${p + batchPageCount - 1}:`, err.message);
        batchPageNumbers.forEach((pn, idx) => {
          allPageHeaders.push({
            pageNumber: pn,
            hasNewStudentHeader: idx === 0,
            studentName: `Student ${Math.ceil(pn / 2)}`,
          });
        });
      }
    }

    allPageHeaders.sort((a, b) => a.pageNumber - b.pageNumber);

    // Group pages into student buckets
    const studentBuckets: Array<{
      studentName: string;
      rollNo?: string;
      pageNumbers: number[];
    }> = [];

    let activeStudent: { studentName: string; rollNo?: string; pageNumbers: number[] } | null = null;
    let studentCount = 0;

    for (const pageInfo of allPageHeaders) {
      const pageNum = pageInfo.pageNumber;
      const isStart = pageNum === 1 || (pageInfo.hasNewStudentHeader && !pageInfo.isSupplementary);

      if (isStart) {
        studentCount++;
        const name = pageInfo.studentName || `Student ${studentCount}`;
        const bucket = { studentName: name, rollNo: pageInfo.rollNo, pageNumbers: [pageNum] };
        studentBuckets.push(bucket);
        activeStudent = bucket;
      } else if (activeStudent) {
        activeStudent.pageNumbers.push(pageNum);
      }
    }

    // Consolidate 1-page tail/map sheets into the preceding student
    const consolidated: Array<{ studentName: string; rollNo?: string; pageNumbers: number[] }> = [];
    for (let i = 0; i < studentBuckets.length; i++) {
      const curr = studentBuckets[i];
      const prev = consolidated[consolidated.length - 1];
      if (
        prev &&
        curr.pageNumbers.length <= 1 &&
        curr.pageNumbers[0] === prev.pageNumbers[prev.pageNumbers.length - 1] + 1
      ) {
        prev.pageNumbers.push(...curr.pageNumbers);
        continue;
      }
      consolidated.push(curr);
    }

    // 3. Slice sub-PDFs using pdf-lib
    const resultBatches: DetectedStudentBatch[] = [];
    for (const acc of consolidated) {
      acc.pageNumbers.sort((a, b) => a - b);
      const studentDoc = await PDFDocument.create();
      const copiedPages = await studentDoc.copyPages(
        sourceDoc,
        acc.pageNumbers.map((p) => p - 1)
      );
      copiedPages.forEach((p) => studentDoc.addPage(p));
      const subPdfBuffer = Buffer.from(await studentDoc.save());

      resultBatches.push({
        studentName: acc.studentName,
        rollNo: acc.rollNo,
        startPage: acc.pageNumbers[0],
        endPage: acc.pageNumbers[acc.pageNumbers.length - 1],
        pageCount: acc.pageNumbers.length,
        pageNumbers: acc.pageNumbers,
        pdfBuffer: subPdfBuffer,
        confidence: 0.98,
      });
    }

    return resultBatches;
  }
}
