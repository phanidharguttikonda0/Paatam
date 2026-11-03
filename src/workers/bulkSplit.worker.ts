import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { S3Service } from '../services/s3.service';
import { SqsService, BulkSplitMessagePayload } from '../services/sqs.service';
import { StudentBoundaryService, isSameStudent } from '../services/studentBoundary.service';

export async function processBulkSplitJob(payload: BulkSplitMessagePayload) {
  const jobId = parseBigInt(payload.job_id, 'job_id');

  const batchJob = await prisma.batchJob.findUnique({
    where: { id: jobId },
    include: {
      Assignment: {
        include: {
          ClassSubject: {
            include: { Subject: true },
          },
        },
      },
    },
  });

  if (!batchJob) {
    throw new Error(`BatchJob ${payload.job_id} not found`);
  }

  const assignmentId = payload.assignment_id
    ? parseBigInt(payload.assignment_id, 'assignment_id')
    : batchJob.assignment_id;

  const sectionId = payload.section_id
    ? parseBigInt(payload.section_id, 'section_id')
    : batchJob.Assignment?.section_id;

  if (!sectionId) {
    throw new Error(`Section ID not found for batch job ${payload.job_id}`);
  }

  // 1. Mark batch as processing
  await prisma.batchJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      stage: 'splitting',
      status_message: 'Splitting master PDF stack into individual student answer sheets...',
    },
  });

  // 2. Fetch class roster for student matching
  const roster = await prisma.student.findMany({
    where: { section_id: sectionId },
    select: { id: true, name: true, roll_no: true },
  });

  // 3. Download master PDF buffer from S3
  const masterPdfUrl =
    payload.master_pdf_url ||
    `https://${S3Service.getBucketName()}.s3.${S3Service.getRegion()}.amazonaws.com/bulk-uploads/${jobId.toString()}/master-stack.pdf`;
  const masterBuffer = await S3Service.downloadBuffer(masterPdfUrl);

  // 4. Split PDF into individual student answer sheets
  const splitBatches = await StudentBoundaryService.detectAndSplitStudentSubmissions(masterBuffer, {
    fixedPageCount: payload.fixed_page_count,
    rosterStudents: roster.map((s) => ({ name: s.name, roll_no: s.roll_no })),
  });

  const createdSubmissions: any[] = [];
  const assignedStudentIds = new Set<string>();

  for (let idx = 0; idx < splitBatches.length; idx++) {
    const batch = splitBatches[idx];

    // Try matching by roll number first
    let matchedStudent = batch.rollNo
      ? roster.find((s) => s.roll_no.toLowerCase() === (batch.rollNo || '').toLowerCase())
      : null;

    // Next try matching by name
    if (!matchedStudent && batch.studentName) {
      matchedStudent = roster.find(
        (s) => !assignedStudentIds.has(s.id.toString()) && isSameStudent(s.name, batch.studentName)
      ) || null;
    }

    // Fallback: take next unassigned student from roster or index
    if (!matchedStudent && roster.length > 0) {
      matchedStudent = roster.find((s) => !assignedStudentIds.has(s.id.toString())) || roster[idx % roster.length];
    }

    // If still no student (e.g. empty roster), auto-provision student in this section
    if (!matchedStudent) {
      const newStudentId = idGenerator.nextId();
      const rawName = batch.studentName && !/^student\s+\d+$/i.test(batch.studentName)
        ? batch.studentName
        : `Student ${idx + 1}`;
      const rollNo = batch.rollNo || `R-${newStudentId.toString().slice(-4)}`;
      const admissionNo = `ADM-${newStudentId.toString().slice(-6)}`;

      matchedStudent = await prisma.student.create({
        data: {
          id: newStudentId,
          section_id: sectionId,
          name: rawName,
          roll_no: rollNo,
          admission_no: admissionNo,
          password_hash: '$2b$10$placeholderpasswordhashforstudentportal',
        },
      });

      await prisma.section.update({
        where: { id: sectionId },
        data: { strength: { increment: 1 } },
      });

      roster.push(matchedStudent);
    }

    assignedStudentIds.add(matchedStudent.id.toString());
    const studentId = matchedStudent.id;
    const studentName = matchedStudent.name;

    // Upload individual student PDF to S3
    const s3Key = S3Service.getStudentSubmissionKey(
      assignmentId.toString(),
      studentId.toString()
    );
    const studentPaperUrl = await S3Service.uploadBuffer(s3Key, batch.pdfBuffer, 'application/pdf');

    // Create Submission record in database
    const submissionId = idGenerator.nextId();
    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        assignment_id: assignmentId,
        student_id: studentId,
        sample_paper_url: studentPaperUrl,
        sample_paper_urls: [studentPaperUrl],
        status: 'pending_ocr',
        submitted_at: new Date(),
      },
    });

    createdSubmissions.push({
      submission_id: submission.id.toString(),
      student_id: studentId.toString(),
      student_name: studentName,
      pages: batch.pageCount,
      url: studentPaperUrl,
    });

    // Enqueue each student's paper to Queue 1 (Handwriting OCR Queue)
    await SqsService.dispatchPaperOcr({
      submission_id: submission.id.toString(),
      assignment_id: assignmentId.toString(),
      student_id: studentId.toString(),
      paper_urls: [studentPaperUrl],
      subject_name: batchJob.Assignment?.ClassSubject?.Subject?.name || 'General',
      timestamp: Date.now(),
    });
  }

  // 5. Update BatchJob stage to completed
  await prisma.batchJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      stage: 'completed',
      total_files: splitBatches.length,
      processed_count: splitBatches.length,
      successful_count: createdSubmissions.length,
      split_progress_json: createdSubmissions as any,
      status_message: `Successfully split and queued ${createdSubmissions.length} papers for grading.`,
    },
  });

  return {
    job_id: jobId.toString(),
    total_split: splitBatches.length,
    created_submissions_count: createdSubmissions.length,
  };
}
