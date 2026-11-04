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

// POST /api/curriculum/chapters/ingest (aliases: /chapter/ingest, /ingest)
router.post(
  ['/chapters/ingest', '/chapter/ingest', '/ingest'],
  validate(ingestChapterSchema),
  CurriculumController.ingestChapter
);

// GET /api/curriculum/chapters (aliases: /chapter)
router.get(
  ['/chapters', '/chapter'],
  validate(listChaptersSchema),
  CurriculumController.listChapters
);

// POST /api/curriculum/syllabus/ingest (aliases: /ingest-syllabus)
router.post(
  ['/syllabus/ingest', '/ingest-syllabus'],
  validate(ingestSyllabusSchema),
  CurriculumController.ingestSyllabus
);

// GET /api/curriculum/topics (aliases: /topic)
router.get(
  ['/topics', '/topic'],
  validate(listTopicsSchema),
  CurriculumController.listTopics
);

export default router;
