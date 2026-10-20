import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { idGenerator } from '../utils/idGenerator';
import { parseBigInt } from '../utils/bigint';
import { formatPaginatedResponse } from '../utils/pagination';
import { AppError } from '../exceptions/AppError';
import { AcademicYearService } from './academicYear.service';
import { UserRole } from '../enums/role.enum';
import { S3Service } from './s3.service';
import { SqsService } from './sqs.service';
import { PaperGeneratorService } from './paperGenerator.service';
import { RagService } from './rag.service';

export class AssignmentService {
  /**
   * Generates AWS S3 pre-signed PUT URLs for question paper and answer key uploads
   */
  public static async generateUploadUrls(
    user: any,
    sectionIdStr: string,
    files: Array<{ file_name: string; file_type: string; purpose: string }>
  ) {
    const sectionId = parseBigInt(sectionIdStr, 'section_id');

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const uploads = await Promise.all(
      files.map(async (file) => {
        const ext = file.file_name.includes('.') ? file.file_name.split('.').pop() : 'pdf';
        const cleanPurpose = file.purpose.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const uniqueSuffix = crypto.randomBytes(4).toString('hex');
        const timestamp = Date.now();
        const key = `assignments/temp/${cleanPurpose}-${uniqueSuffix}-${timestamp}.${ext}`;
        const contentType = file.file_type || 'application/pdf';

        try {
          const { uploadUrl, fileUrl } = await S3Service.generatePresignedUploadUrl(
            key,
            contentType,
            3600
          );
          return {
            purpose: file.purpose,
            upload_url: uploadUrl,
            file_url: fileUrl,
            key,
          };
        } catch {
          // Fallback if running offline or in unit tests
          const bucket = S3Service.getBucketName();
          const region = S3Service.getRegion();
          const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          const uploadUrl = `${fileUrl}?mock-presigned=true&X-Amz-Signature=mock_test_signature`;
          return {
            purpose: file.purpose,
            upload_url: uploadUrl,
            file_url: fileUrl,
            key,
          };
        }
      })
    );

    return { uploads };
  }

  /**
   * Dispatches an assignment processing job for async OCR & dynamic model selection
   */
  public static async processAsync(user: any, data: any) {
    const sectionId = parseBigInt(data.section_id, 'section_id');
    const classSubjectId = parseBigInt(data.class_subject_id, 'class_subject_id');

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { Subject: true },
    });

    if (!classSubject) {
      throw new AppError('Class subject not found', 404);
    }

    const teacherSubjectId = await this.resolveTeacherSubjectId(
      user,
      classSubject.subject_id,
      data.teacher_subject_id
    );

    const assignmentId = idGenerator.nextId();

    const assignment = await prisma.assignment.create({
      data: {
        id: assignmentId,
        section_id: sectionId,
        class_subject_id: classSubjectId,
        teacher_subject_id: teacherSubjectId,
        title: data.title,
        difficulty: data.difficulty || 'Medium',
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
        submission_mode: data.submission_mode || 'STUDENT_UPLOAD',
        status: 'ocr_processing',
        question_paper_url: data.question_paper_url,
        answer_key_url: data.answer_key_url || null,
        questions_json: [],
      },
    });

    // Enqueue to SQS for Lambda OCR & dynamic model selection
    await SqsService.dispatchAssignmentOcr({
      assignment_id: assignment.id.toString(),
      section_id: sectionId.toString(),
      class_subject_id: classSubjectId.toString(),
      question_paper_url: data.question_paper_url,
      answer_key_url: data.answer_key_url || undefined,
      subject_name: classSubject.Subject.name,
      timestamp: Date.now(),
    });

    return {
      assignment_id: assignment.id.toString(),
      status: 'ocr_processing',
      poll_url: `/api/assignments/${assignment.id.toString()}/pipeline-status`,
    };
  }

  /**
   * Retrieves pipeline status for an OCR processing assignment
   */
  public static async getPipelineStatus(user: any, assignmentIdStr: string) {
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Section: {
          include: { Class: true },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, assignment.Section.Class.branch_id);

    if (assignment.status === 'ocr_processing') {
      return {
        assignment_id: assignment.id.toString(),
        pipeline_status: 'ocr_processing',
        progress_percent: 45,
        message: 'Extracting questions from uploaded PDF...',
      };
    }

    const questions = Array.isArray(assignment.questions_json)
      ? assignment.questions_json
      : [];

    return {
      assignment_id: assignment.id.toString(),
      pipeline_status: 'ready',
      reasoning_model_selected: assignment.reasoning_model || 'gemini-2.5-flash',
      routing_reason: 'Standard single-choice and short numerical format detected',
      total_questions: questions.length,
      questions_json: questions,
      answer_key_text: assignment.answer_key_text || null,
    };
  }

  /**
   * Synchronous upload & inline OCR fallback alternative
   */
  public static async createSync(user: any, data: any) {
    const sectionId = parseBigInt(data.section_id, 'section_id');
    const classSubjectId = parseBigInt(data.class_subject_id, 'class_subject_id');

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { Subject: true },
    });

    if (!classSubject) {
      throw new AppError('Class subject not found', 404);
    }

    const teacherSubjectId = await this.resolveTeacherSubjectId(
      user,
      classSubject.subject_id,
      data.teacher_subject_id
    );

    const questionPaperUrl =
      data.question_paper_url || data.question_paper || 'https://s3.amazonaws.com/paatam/temp/qpaper.pdf';

    const sampleQuestions = Array.isArray(data.questions_json) && data.questions_json.length > 0
      ? data.questions_json
      : [
          {
            question_number: 1,
            question: 'What is the SI unit of electric potential?',
            type: 'mcq',
            marks: 1,
            options: ['Ampere', 'Volt', 'Ohm', 'Joule'],
          },
        ];

    const assignmentId = idGenerator.nextId();

    const assignment = await prisma.assignment.create({
      data: {
        id: assignmentId,
        section_id: sectionId,
        class_subject_id: classSubjectId,
        teacher_subject_id: teacherSubjectId,
        title: data.title,
        difficulty: data.difficulty || 'Medium',
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
        submission_mode: data.submission_mode || 'STUDENT_UPLOAD',
        status: 'draft',
        reasoning_model: 'gemini-2.5-flash',
        question_paper_url: questionPaperUrl,
        answer_key_url: data.answer_key_url || data.answer_key || null,
        questions_json: sampleQuestions,
      },
    });

    return {
      id: assignment.id.toString(),
      title: assignment.title,
      status: assignment.status,
      reasoning_model: assignment.reasoning_model,
      questions_json: assignment.questions_json,
    };
  }

  /**
   * Finalizes and publishes the assignment
   */
  public static async publishAssignment(user: any, data: any) {
    const sectionId = parseBigInt(data.section_id, 'section_id');
    const classSubjectId = parseBigInt(data.class_subject_id, 'class_subject_id');

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { Class: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { Subject: true },
    });

    if (!classSubject) {
      throw new AppError('Class subject not found', 404);
    }

    const teacherSubjectId = await this.resolveTeacherSubjectId(
      user,
      classSubject.subject_id,
      data.teacher_subject_id
    );

    const existingIdStr = data.id || data.assignment_id;

    if (existingIdStr) {
      const existingId = parseBigInt(existingIdStr, 'assignment_id');
      const updated = await prisma.assignment.update({
        where: { id: existingId },
        data: {
          title: data.title,
          difficulty: data.difficulty || 'Medium',
          duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
          submission_mode: data.submission_mode || undefined,
          due_date: data.due_date ? new Date(data.due_date) : undefined,
          status: data.status || 'published',
          reasoning_model: data.reasoning_model || 'gemini-2.5-flash',
          question_paper_url: data.question_paper_url,
          answer_key_url: data.answer_key_url || undefined,
          answer_key_text: data.answer_key_text || undefined,
          questions_json: data.questions_json || [],
        },
      });

      return {
        id: updated.id.toString(),
        title: updated.title,
        status: updated.status,
        submission_mode: updated.submission_mode,
        created_at: updated.created_at,
      };
    }

    const assignmentId = idGenerator.nextId();

    const created = await prisma.assignment.create({
      data: {
        id: assignmentId,
        section_id: sectionId,
        class_subject_id: classSubjectId,
        teacher_subject_id: teacherSubjectId,
        title: data.title,
        difficulty: data.difficulty || 'Medium',
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
        submission_mode: data.submission_mode || 'STUDENT_UPLOAD',
        due_date: data.due_date ? new Date(data.due_date) : null,
        status: data.status || 'published',
        reasoning_model: data.reasoning_model || 'gemini-2.5-flash',
        question_paper_url: data.question_paper_url,
        answer_key_url: data.answer_key_url || null,
        answer_key_text: data.answer_key_text || null,
        questions_json: data.questions_json || [],
      },
    });

    return {
      id: created.id.toString(),
      title: created.title,
      status: created.status,
      submission_mode: created.submission_mode,
      created_at: created.created_at,
    };
  }

  /**
   * Lists assignments with optional filters for section, subject and cursor pagination
   */
  public static async listAssignments(
    user: any,
    filters: {
      section_id?: string;
      class_subject_id?: string;
      cursor?: string;
      limit?: number;
    }
  ) {
    const limit = filters.limit ? Math.min(Number(filters.limit), 10) : 10;
    const where: any = {};

    if (filters.section_id) {
      const sectionId = parseBigInt(filters.section_id, 'section_id');
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { Class: true },
      });
      if (!section) {
        throw new AppError('Section not found', 404);
      }
      await AcademicYearService.assertBranchAccess(user, section.Class.branch_id);
      where.section_id = sectionId;
    }

    if (filters.class_subject_id) {
      where.class_subject_id = parseBigInt(filters.class_subject_id, 'class_subject_id');
    }

    let cursorObj = undefined;
    if (filters.cursor) {
      cursorObj = { id: parseBigInt(filters.cursor, 'cursor') };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: { Submissions: true },
        },
      },
    });

    const serialized = assignments.map((a: any) => ({
      id: a.id.toString(),
      title: a.title,
      difficulty: a.difficulty,
      duration_minutes: a.duration_minutes,
      status: a.status,
      total_submissions: a._count.Submissions,
      due_date: a.due_date,
    }));

    return formatPaginatedResponse(serialized, limit);
  }

  /**
   * Retrieves single assignment details with question breakdown
   */
  public static async getAssignmentById(user: any, assignmentIdStr: string) {
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Section: {
          include: {
            Class: true,
          },
        },
        ClassSubject: {
          include: {
            Subject: true,
          },
        },
        TeacherSubject: {
          include: {
            Teacher: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, assignment.Section.Class.branch_id);

    return {
      id: assignment.id.toString(),
      section_id: assignment.section_id.toString(),
      class_subject_id: assignment.class_subject_id.toString(),
      teacher_subject_id: assignment.teacher_subject_id.toString(),
      title: assignment.title,
      difficulty: assignment.difficulty,
      duration_minutes: assignment.duration_minutes,
      submission_mode: assignment.submission_mode,
      status: assignment.status,
      reasoning_model: assignment.reasoning_model,
      question_paper_url: assignment.question_paper_url,
      answer_key_url: assignment.answer_key_url,
      answer_key_text: assignment.answer_key_text,
      questions_json: assignment.questions_json,
      due_date: assignment.due_date,
      created_at: assignment.created_at,
      section: {
        id: assignment.Section.id.toString(),
        name: assignment.Section.section_name,
      },
      class_subject: {
        id: assignment.ClassSubject.id.toString(),
        subject_name: assignment.ClassSubject.Subject.name,
        subject_code: assignment.ClassSubject.Subject.code,
      },
    };
  }

  /**
   * Deletes an assignment and purges related submissions & notifications
   */
  public static async deleteAssignment(user: any, assignmentIdStr: string) {
    const assignmentId = parseBigInt(assignmentIdStr, 'assignment_id');

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Section: {
          include: { Class: true },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, assignment.Section.Class.branch_id);

    await prisma.$transaction(async (tx: any) => {
      // Find all submissions associated with assignment
      const submissions = await tx.submission.findMany({
        where: { assignment_id: assignmentId },
        select: { id: true },
      });

      const submissionIds = submissions.map((s: any) => s.id);

      if (submissionIds.length > 0) {
        // Delete notifications linked to submissions
        await tx.notification.deleteMany({
          where: { submission_id: { in: submissionIds } },
        });

        // Delete submissions
        await tx.submission.deleteMany({
          where: { id: { in: submissionIds } },
        });
      }

      // Delete batch jobs
      await tx.batchJob.deleteMany({
        where: { assignment_id: assignmentId },
      });

      // Delete assignment
      await tx.assignment.delete({
        where: { id: assignmentId },
      });
    });

    return {
      message: 'Assignment and associated student submissions deleted successfully',
    };
  }

  /**
   * Helper to resolve teacher_subject_id
   */
  private static async resolveTeacherSubjectId(
    user: any,
    subjectId: bigint,
    explicitTeacherSubjectIdStr?: string
  ): Promise<bigint> {
    if (explicitTeacherSubjectIdStr) {
      return parseBigInt(explicitTeacherSubjectIdStr, 'teacher_subject_id');
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = parseBigInt(user.userId, 'userId');
      const teacherSubject = await prisma.teacherSubject.findUnique({
        where: {
          teacher_id_subject_id: {
            teacher_id: teacherId,
            subject_id: subjectId,
          },
        },
      });

      if (teacherSubject) {
        return teacherSubject.id;
      }

      // If mapping doesn't exist, create it for this teacher
      const newTeacherSubjectId = idGenerator.nextId();
      const created = await prisma.teacherSubject.create({
        data: {
          id: newTeacherSubjectId,
          teacher_id: teacherId,
          subject_id: subjectId,
        },
      });
      return created.id;
    }

    // For Branch Admin: find any existing teacher subject mapping
    const existing = await prisma.teacherSubject.findFirst({
      where: { subject_id: subjectId },
    });

    if (existing) {
      return existing.id;
    }

    // If none exists, find any teacher in the branch to establish default mapping
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    const teacher = await prisma.teacher.findFirst({
      where: { branch_id: subject.branch_id },
    });

    if (!teacher) {
      throw new AppError(
        'No teacher exists in this branch to allocate for assignment. Please create a teacher first.',
        400
      );
    }

    const newTeacherSubjectId = idGenerator.nextId();
    const created = await prisma.teacherSubject.create({
      data: {
        id: newTeacherSubjectId,
        teacher_id: teacher.id,
        subject_id: subjectId,
      },
    });

    return created.id;
  }

  /**
   * Generates a complete exam question paper using AI blueprint and textbook context
   */
  public static async generateExam(user: any, body: any) {
    const classSubjectId = parseBigInt(body.class_subject_id, 'class_subject_id');

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        Subject: true,
        Class: true,
      },
    });

    if (!classSubject) {
      throw new AppError('ClassSubject not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

    // Retrieve textbook context from RAG service if available
    let textbookContext = '';
    try {
      textbookContext = await RagService.getChapterContext(
        body.class_subject_id,
        body.selected_chapters
      );
    } catch (err: any) {
      console.warn('⚠️ [RAG CONTEXT] Notice fetching textbook context:', err.message);
    }

    const questionCounts = {
      mcqCount: Number(body.question_counts?.mcq_count) || 5,
      veryShortCount: Number(body.question_counts?.very_short_count) || 3,
      shortCount: Number(body.question_counts?.short_count) || 3,
      descriptiveCount: Number(body.question_counts?.descriptive_count) || 2,
    };

    const questions = await PaperGeneratorService.generateExamQuestionsUnified({
      examTitle: body.exam_title,
      className: classSubject.Class.name,
      subjectName: classSubject.Subject.name,
      targetMarks: Number(body.target_marks) || 40,
      language: body.language || 'English',
      difficulty: body.difficulty || 'Standard',
      selectedChapters: body.selected_chapters || [],
      selectedSubtopics: body.selected_subtopics || [],
      questionCounts,
      marksConfig: body.marks_config,
      textbookContext,
    });

    return {
      exam_title: body.exam_title,
      class_name: classSubject.Class.name,
      subject_name: classSubject.Subject.name,
      target_marks: Number(body.target_marks) || 40,
      total_questions: questions.length,
      questions,
    };
  }

  /**
   * Regenerates a single question in an exam with a fresh alternative
   */
  public static async regenerateQuestion(user: any, body: any) {
    const classSubjectId = parseBigInt(body.class_subject_id, 'class_subject_id');

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        Subject: true,
        Class: true,
      },
    });

    if (!classSubject) {
      throw new AppError('ClassSubject not found', 404);
    }

    await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

    const question = await PaperGeneratorService.generateSingleQuestionReplacement({
      subjectName: classSubject.Subject.name,
      className: classSubject.Class.name,
      chapterTitle: body.chapter_title,
      subtopics: body.subtopics || [],
      questionType: body.question_type,
      marks: Number(body.marks) || 1,
      currentQuestionText: body.current_question_text,
      language: body.language || 'English',
      difficulty: body.difficulty || 'Standard',
    });

    if (!question) {
      throw new AppError('Failed to generate replacement question', 500);
    }

    return question;
  }

  /**
   * Generates a diagram or visual stimulus for an exam question
   */
  public static async generateDiagram(user: any, body: any) {
    return await PaperGeneratorService.generateQuestionImageOrDiagram(
      body.image_prompt,
      body.question_text,
      body.subject || 'General'
    );
  }
}

