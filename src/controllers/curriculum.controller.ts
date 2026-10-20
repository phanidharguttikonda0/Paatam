import { Request, Response, NextFunction } from 'express';
import { RagService } from '../services/rag.service';
import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { AcademicYearService } from '../services/academicYear.service';
import { AppError } from '../exceptions/AppError';

export class CurriculumController {
  public static async ingestChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { class_subject_id, chapter_text, pdf_url, chapter_title, chapter_number, file_name } = req.body;

      const classSubjectId = parseBigInt(class_subject_id, 'class_subject_id');
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const result = await RagService.ingestChapter({
        classSubjectId: class_subject_id,
        chapterText: chapter_text,
        pdfUrl: pdf_url,
        chapterTitle: chapter_title,
        chapterNumber: chapter_number,
        fileName: file_name,
      });

      res.status(201).json({
        status: 'success',
        message: 'Chapter indexed into curriculum and vectorized into vector store',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listChapters(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const classSubjectIdStr = req.query.class_subject_id as string;
      const classSubjectId = parseBigInt(classSubjectIdStr, 'class_subject_id');

      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const chapters = await prisma.curriculumChapter.findMany({
        where: { class_subject_id: classSubjectId },
        orderBy: { chapter_number: 'asc' },
      });

      res.status(200).json({
        status: 'success',
        data: chapters.map((c) => ({
          id: c.id.toString(),
          chapter_number: c.chapter_number,
          chapter_title: c.chapter_title,
          subtopics: c.subtopics,
          chunk_count: c.chunk_count,
          pdf_url: c.pdf_url,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async ingestSyllabus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { class_subject_id, syllabus_text } = req.body;

      const classSubjectId = parseBigInt(class_subject_id, 'class_subject_id');
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const result = await RagService.ingestSyllabus({
        classSubjectId: class_subject_id,
        syllabusText: syllabus_text,
      });

      res.status(201).json({
        status: 'success',
        message: 'Syllabus parsed into curriculum topics successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const classSubjectIdStr = req.query.class_subject_id as string;
      const classSubjectId = parseBigInt(classSubjectIdStr, 'class_subject_id');

      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const topics = await prisma.curriculumTopic.findMany({
        where: { class_subject_id: classSubjectId },
        orderBy: [{ unit_number: 'asc' }, { id: 'asc' }],
      });

      res.status(200).json({
        status: 'success',
        data: topics.map((t) => ({
          id: t.id.toString(),
          unit_number: t.unit_number,
          unit_name: t.unit_name,
          topic_name: t.topic_name,
          subtopics: t.subtopics,
          prescribed_weightage: t.prescribed_weightage,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
