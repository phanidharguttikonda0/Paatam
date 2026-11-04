import { Request, Response, NextFunction } from 'express';
import { RagService } from '../services/rag.service';
import { prisma } from '../config/prisma';
import { parseBigInt } from '../utils/bigint';
import { AcademicYearService } from '../services/academicYear.service';
import { AppError } from '../exceptions/AppError';
import { S3Service } from '../services/s3.service';

export class CurriculumController {
  public static async ingestChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const classSubjectIdStr = req.body.class_subject_id || req.body.classSubjectId;
      const chapterText = req.body.chapter_text || req.body.chapterText;
      const pdfUrl = req.body.pdf_url || req.body.pdfUrl;
      const chapterTitle = req.body.chapter_title || req.body.chapterTitle;
      const chapterNumber = req.body.chapter_number || req.body.chapterNumber;
      const fileName = req.body.file_name || req.body.fileName;

      if (!classSubjectIdStr) {
        throw new AppError('class_subject_id is required', 400);
      }

      const classSubjectId = parseBigInt(classSubjectIdStr, 'class_subject_id');
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const result = await RagService.ingestChapter({
        classSubjectId: classSubjectIdStr,
        chapterText,
        pdfUrl,
        chapterTitle,
        chapterNumber,
        fileName,
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
      const classSubjectIdStr = (req.query.class_subject_id || req.query.classSubjectId) as string;
      if (!classSubjectIdStr) {
        throw new AppError('class_subject_id is required', 400);
      }

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

      const signedChapters = await Promise.all(
        chapters.map(async (c) => {
          let pdfUrl = c.pdf_url;
          if (pdfUrl) {
            try {
              pdfUrl = await S3Service.generatePresignedDownloadUrl(pdfUrl, 7200);
            } catch {}
          }
          return {
            id: c.id.toString(),
            chapter_number: c.chapter_number,
            chapter_title: c.chapter_title,
            subtopics: c.subtopics,
            chunk_count: c.chunk_count,
            pdf_url: pdfUrl,
          };
        })
      );

      res.status(200).json({
        status: 'success',
        data: signedChapters,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const rawId = req.params.id;
      const chapterIdStr = Array.isArray(rawId) ? rawId[0] : rawId;
      const chapterTitle = req.body.chapter_title || req.body.chapterTitle;
      const chapterNumber = req.body.chapter_number || req.body.chapterNumber;

      const chapterId = parseBigInt(chapterIdStr, 'chapter_id');
      const chapter = await prisma.curriculumChapter.findUnique({
        where: { id: chapterId },
        include: { ClassSubject: { include: { Class: true } } },
      });

      if (!chapter) {
        throw new AppError('Chapter not found', 404);
      }

      if (chapter.ClassSubject?.Class?.branch_id) {
        await AcademicYearService.assertBranchAccess(user, chapter.ClassSubject.Class.branch_id);
      }

      const result = await RagService.updateChapter(chapterIdStr, {
        chapterTitle,
        chapterNumber,
      });

      res.status(200).json({
        status: 'success',
        message: 'Chapter updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const rawId = req.params.id;
      const chapterIdStr = Array.isArray(rawId) ? rawId[0] : rawId;

      const chapterId = parseBigInt(chapterIdStr, 'chapter_id');
      const chapter = await prisma.curriculumChapter.findUnique({
        where: { id: chapterId },
        include: { ClassSubject: { include: { Class: true } } },
      });

      if (!chapter) {
        throw new AppError('Chapter not found', 404);
      }

      if (chapter.ClassSubject?.Class?.branch_id) {
        await AcademicYearService.assertBranchAccess(user, chapter.ClassSubject.Class.branch_id);
      }

      const result = await RagService.deleteChapter(chapterIdStr);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async ingestSyllabus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const classSubjectIdStr = req.body.class_subject_id || req.body.classSubjectId;
      const syllabusText = req.body.syllabus_text || req.body.syllabusText;

      if (!classSubjectIdStr) {
        throw new AppError('class_subject_id is required', 400);
      }

      const classSubjectId = parseBigInt(classSubjectIdStr, 'class_subject_id');
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId },
        include: { Class: true },
      });

      if (!classSubject) {
        throw new AppError('ClassSubject not found', 404);
      }

      await AcademicYearService.assertBranchAccess(user, classSubject.Class.branch_id);

      const result = await RagService.ingestSyllabus({
        classSubjectId: classSubjectIdStr,
        syllabusText,
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
      const classSubjectIdStr = (req.query.class_subject_id || req.query.classSubjectId) as string;
      if (!classSubjectIdStr) {
        throw new AppError('class_subject_id is required', 400);
      }

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
