const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Load Test Database Teardown & Cleanup ---');
  const startTime = Date.now();

  // Find all corporates with 'PAATAM-LOADTEST-'
  const testCorporates = await prisma.corporate.findMany({
    where: { registration_no: { startsWith: 'PAATAM-LOADTEST-' } },
    select: { id: true, registration_no: true }
  });

  console.log(`Found ${testCorporates.length} loadtest corporate(s) to purge.`);

  for (const corp of testCorporates) {
    console.log(`Cleaning corporate: ${corp.registration_no} (${corp.id.toString()})`);

    // 1. Delete notifications related to test submissions
    console.log('Deleting test notifications...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Notification" 
      WHERE "submission_id" IN (
        SELECT s.id FROM "Submission" s 
        JOIN "Student" st ON s.student_id = st.id
        JOIN "Section" sec ON st.section_id = sec.id
        JOIN "Class" c ON sec.class_id = c.id
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 2. Delete submissions
    console.log('Deleting test submissions...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Submission" 
      WHERE "student_id" IN (
        SELECT st.id FROM "Student" st
        JOIN "Section" sec ON st.section_id = sec.id
        JOIN "Class" c ON sec.class_id = c.id
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 3. Delete BatchJobs
    console.log('Deleting batch jobs...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "BatchJob" 
      WHERE "assignment_id" IN (
        SELECT a.id FROM "Assignment" a
        JOIN "Section" sec ON a.section_id = sec.id
        JOIN "Class" c ON sec.class_id = c.id
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 4. Delete assignments
    console.log('Deleting test assignments...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Assignment" 
      WHERE "section_id" IN (
        SELECT sec.id FROM "Section" sec
        JOIN "Class" c ON sec.class_id = c.id
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 5. Delete students
    console.log('Deleting test students...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Student" 
      WHERE "section_id" IN (
        SELECT sec.id FROM "Section" sec
        JOIN "Class" c ON sec.class_id = c.id
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 6. Delete teacher-subject and class-subject mappings
    console.log('Deleting curriculum & teacher mappings...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "TeacherSubject" 
      WHERE "teacher_id" IN (
        SELECT t.id FROM "Teacher" t
        JOIN "Branch" b ON t.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "ClassSubject" 
      WHERE "class_id" IN (
        SELECT c.id FROM "Class" c
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 7. Delete teachers & sections
    console.log('Deleting teachers and sections...');
    await prisma.$executeRawUnsafe(`
      UPDATE "Section" SET class_teacher_id = NULL
      WHERE "class_id" IN (
        SELECT c.id FROM "Class" c
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "Teacher" 
      WHERE "branch_id" IN (
        SELECT b.id FROM "Branch" b
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "Section" 
      WHERE "class_id" IN (
        SELECT c.id FROM "Class" c
        JOIN "Branch" b ON c.branch_id = b.id
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 8. Delete classes, academic years, subjects
    console.log('Deleting classes, academic years, and subjects...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Class" 
      WHERE "branch_id" IN (
        SELECT b.id FROM "Branch" b
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "Subject" 
      WHERE "branch_id" IN (
        SELECT b.id FROM "Branch" b
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "AcademicYear" 
      WHERE "branch_id" IN (
        SELECT b.id FROM "Branch" b
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    // 9. Delete Admin branch access and Admins
    console.log('Deleting admins and branch access...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "AdminBranchAccess" 
      WHERE "branch_id" IN (
        SELECT b.id FROM "Branch" b
        WHERE b.corporate_id = ${corp.id}
      )
    `);

    await prisma.admin.deleteMany({ where: { corporate_id: corp.id } });
    await prisma.corporateAdmin.deleteMany({ where: { corporate_id: corp.id } });

    // 10. Delete Branches & Corporate
    console.log('Deleting branches and corporate entity...');
    await prisma.branch.deleteMany({ where: { corporate_id: corp.id } });
    await prisma.corporate.delete({ where: { id: corp.id } });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 CLEANUP COMPLETE in ${duration}s! All loadtest tables purged cleanly.`);
}

main()
  .catch(e => {
    console.error('Cleanup Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
