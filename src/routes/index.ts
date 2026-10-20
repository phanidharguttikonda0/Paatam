import { Router } from 'express';
import corporateRoutes from './corporate.routes';
import authRoutes from './auth.routes';
import branchRoutes from './branch.routes';
import adminRoutes from './admin.routes';
import branchAdminRoutes from './branchAdmin.routes';
import academicYearRoutes from './academicYear.routes';
import classRoutes from './class.routes';
import sectionRoutes from './section.routes';
import subjectRoutes from './subject.routes';
import teacherRoutes from './teacher.routes';
import teacherPortalRoutes from './teacherPortal.routes';
import studentRoutes from './student.routes';
import studentPortalRoutes from './studentPortal.routes';
import assignmentRoutes from './assignment.routes';
import submissionRoutes from './submission.routes';
import curriculumRoutes from './curriculum.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/corporate', corporateRoutes);
router.use('/branch', branchRoutes);
router.use('/admin', adminRoutes);
router.use('/branch-admin', branchAdminRoutes);
router.use('/academic-years', academicYearRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/teachers', teacherRoutes);
router.use('/teacher', teacherPortalRoutes);
router.use('/students', studentRoutes);
router.use('/student', studentPortalRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/curriculum', curriculumRoutes);

export default router;
