import { Router } from 'express';
import { CurriculumController } from '../controllers/curriculum.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  ingestChapterSchema,
  listChaptersSchema,
  ingestSyllabusSchema,
  listTopicsSchema,
} from '../schemas/curriculum.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]));

// POST /api/curriculum/chapters/ingest - Ingest & vectorize a textbook chapter
router.post(
  '/chapters/ingest',
  validate(ingestChapterSchema),
  CurriculumController.ingestChapter
);

// GET /api/curriculum/chapters - List indexed chapters & subtopics for a subject
router.get(
  '/chapters',
  validate(listChaptersSchema),
  CurriculumController.listChapters
);

// POST /api/curriculum/syllabus/ingest - Ingest syllabus and extract topic breakdown
router.post(
  '/syllabus/ingest',
  validate(ingestSyllabusSchema),
  CurriculumController.ingestSyllabus
);

// GET /api/curriculum/topics - List syllabus topics & weightages for a subject
router.get(
  '/topics',
  validate(listTopicsSchema),
  CurriculumController.listTopics
);

export default router;
