const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PASSWORD_HASH = '$2b$10$ZGX9wV.P5t1ETPL3BUCzyOdskL1e8FXvZ1GP5kCF6uFOzCK0ZnJ/q'; // TestPass123!

// Helper for unique deterministic BigInt IDs
let idCounter = 2000000000000000n;
function nextBigInt() {
  return idCounter++;
}

async function main() {
  console.log('--- Starting Load Test Database Seeding (Target: 63,800+ Records) ---');
  const startTime = Date.now();

  // 1. Corporate
  const corporateId = nextBigInt();
  const regNo = 'PAATAM-LOADTEST-' + Date.now().toString().slice(-6);
  const corporate = await prisma.corporate.upsert({
    where: { registration_no: regNo },
    update: {},
    create: {
      id: corporateId,
      name: 'Paatam LoadTest Educational Group',
      registration_no: regNo,
    },
  });
  console.log('✓ Corporate Created:', corporate.id.toString());

  // 2. Corporate Admin
  const corpAdminId = nextBigInt();
  await prisma.corporateAdmin.create({
    data: {
      id: corpAdminId,
      corporate_id: corporate.id,
      name: 'Corporate Super Admin',
      email: `corpadmin_${Date.now()}@loadtest.paatam.in`,
      mobile: String(Math.floor(1000000000 + Math.random() * 9000000000)).slice(0, 10),
    },
  });
  console.log('✓ Corporate Admin Created');

  // 3. Branches (5 Campuses)
  const branchNames = ['Hyderabad Main', 'Vijayawada Campus', 'Visakhapatnam City', 'Warangal Tech', 'Guntur Heights'];
  const branchIds = [];
  for (let i = 0; i < 5; i++) {
    const bId = nextBigInt();
    branchIds.push(bId);
    await prisma.branch.create({
      data: {
        id: bId,
        corporate_id: corporate.id,
        name: branchNames[i],
        pincode: '50000' + (i + 1),
        address: `Road No ${i + 1}, Jubilee Hills, Campus ${i + 1}`,
        branch_contact_mail: `contact_branch${i + 1}@loadtest.paatam.in`,
        mobile_number: String(9000000000 + i),
      },
    });
  }
  console.log(`✓ 5 Branches Created`);

  // 4. Branch Admins (Principals / Deans)
  for (let i = 0; i < 5; i++) {
    const adminId = nextBigInt();
    await prisma.admin.create({
      data: {
        id: adminId,
        corporate_id: corporate.id,
        admin_name: `Principal Branch ${i + 1}`,
        contact_email: `principal_branch${i + 1}_${Date.now()}@loadtest.paatam.in`,
        mobile: String(8000000000 + i),
        role: 'PRINCIPAL',
        password_hash: PASSWORD_HASH,
      },
    });
    await prisma.adminBranchAccess.create({
      data: {
        id: nextBigInt(),
        admin_id: adminId,
        branch_id: branchIds[i],
      },
    });
  }
  console.log(`✓ 5 Branch Admins & Access Mappings Created`);

  // 5. Academic Years (1 active per branch)
  const academicYearIds = [];
  for (let i = 0; i < 5; i++) {
    const ayId = nextBigInt();
    academicYearIds.push(ayId);
    await prisma.academicYear.create({
      data: {
        id: ayId,
        branch_id: branchIds[i],
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      },
    });
  }
  console.log(`✓ 5 Academic Years Created`);

  // 6. Classes (7 grades per branch: Class 6, 7, 8, 9, 10, 11, 12 = 35 Classes)
  const classIds = [];
  const classMap = []; // { classId, branchId, name }
  for (let b = 0; b < 5; b++) {
    for (let c = 6; c <= 12; c++) {
      const cId = nextBigInt();
      classIds.push(cId);
      classMap.push({ classId: cId, branchId: branchIds[b], name: `Class ${c}` });
      await prisma.class.create({
        data: {
          id: cId,
          branch_id: branchIds[b],
          academic_year_id: academicYearIds[b],
          name: `Class ${c}`,
          class_order: c,
        },
      });
    }
  }
  console.log(`✓ 35 Classes Created`);

  // 7. Sections (4 sections A, B, C, D per class = 140 Sections)
  const sectionIds = [];
  const sectionRecords = [];
  const secNames = ['A', 'B', 'C', 'D'];
  for (const cls of classMap) {
    for (const sName of secNames) {
      const sId = nextBigInt();
      sectionIds.push(sId);
      sectionRecords.push({
        id: sId,
        class_id: cls.classId,
        section_name: sName,
        strength: 36,
      });
    }
  }
  await prisma.section.createMany({ data: sectionRecords });
  console.log(`✓ 140 Sections Created`);

  // 8. Subjects (8 subjects per branch = 40 Subjects)
  const subjectTitles = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Studies', 'Telugu', 'Computer Science'];
  const subjectRecords = [];
  const branchSubjectMap = {}; // branchId -> array of subjectIds
  for (const bId of branchIds) {
    branchSubjectMap[bId.toString()] = [];
    for (const title of subjectTitles) {
      const subId = nextBigInt();
      branchSubjectMap[bId.toString()].push(subId);
      subjectRecords.push({
        id: subId,
        branch_id: bId,
        name: title,
        code: title.slice(0, 4).toUpperCase(),
        grade: 'High School',
        board: 'CBSE',
      });
    }
  }
  await prisma.subject.createMany({ data: subjectRecords });
  console.log(`✓ 40 Master Subjects Created`);

  // 9. ClassSubjects (Mapping subjects to classes)
  const classSubjectRecords = [];
  const classSubjectIds = [];
  for (const cls of classMap) {
    const subs = branchSubjectMap[cls.branchId.toString()];
    for (const subId of subs) {
      const csId = nextBigInt();
      classSubjectIds.push(csId);
      classSubjectRecords.push({
        id: csId,
        class_id: cls.classId,
        subject_id: subId,
      });
    }
  }
  await prisma.classSubject.createMany({ data: classSubjectRecords });
  console.log(`✓ ${classSubjectRecords.length} ClassSubject Mappings Created`);

  // 10. Teachers (400 Teachers = 80 per branch)
  const teacherRecords = [];
  const teacherIds = [];
  for (let b = 0; b < 5; b++) {
    for (let t = 1; t <= 80; t++) {
      const tId = nextBigInt();
      teacherIds.push(tId);
      teacherRecords.push({
        id: tId,
        branch_id: branchIds[b],
        name: `Teacher B${b + 1} #${t}`,
        teacher_id: `TCH-B${b + 1}-${String(t).padStart(3, '0')}`,
        password_hash: PASSWORD_HASH,
        contact_email: `teacher_b${b + 1}_${t}_${Date.now()}@loadtest.paatam.in`,
        contact_mobile: String(7000000000 + b * 1000 + t),
      });
    }
  }
  // Batch insert in chunks of 200
  for (let i = 0; i < teacherRecords.length; i += 200) {
    await prisma.teacher.createMany({ data: teacherRecords.slice(i, i + 200) });
  }
  console.log(`✓ 400 Teachers Created`);

  // 11. TeacherSubject Mappings
  const teacherSubjectRecords = [];
  const teacherSubjectIds = [];
  for (let i = 0; i < teacherIds.length; i++) {
    const tId = teacherIds[i];
    const bIndex = Math.floor(i / 80);
    const subs = branchSubjectMap[branchIds[bIndex].toString()];
    const assignedSub = subs[i % subs.length];
    const tsId = nextBigInt();
    teacherSubjectIds.push(tsId);
    teacherSubjectRecords.push({
      id: tsId,
      teacher_id: tId,
      subject_id: assignedSub,
    });
  }
  await prisma.teacherSubject.createMany({ data: teacherSubjectRecords });
  console.log(`✓ 400 TeacherSubject Mappings Created`);

  // 12. Students (5,040 Students = 36 students per section across 140 sections)
  console.log('Seeding 5,040 Students...');
  const studentRecords = [];
  const studentIds = [];
  let studentCounter = 1;

  for (const sId of sectionIds) {
    for (let r = 1; r <= 36; r++) {
      const stId = nextBigInt();
      studentIds.push(stId);
      studentRecords.push({
        id: stId,
        section_id: sId,
        admission_no: `ADM2026-${String(studentCounter).padStart(5, '0')}`,
        roll_no: `R-${String(r).padStart(2, '0')}`,
        name: `Student ${studentCounter}`,
        password_hash: PASSWORD_HASH,
        contact_email: `student_${studentCounter}@loadtest.paatam.in`,
        contact_mobile: String(6000000000 + studentCounter),
      });
      studentCounter++;
    }
  }

  // Insert in batches of 1,000
  for (let i = 0; i < studentRecords.length; i += 1000) {
    await prisma.student.createMany({ data: studentRecords.slice(i, i + 1000) });
  }
  console.log(`✓ 5,040 Students Created`);

  // 13. Assignments (1,000 Assignments = ~7 per section)
  console.log('Seeding 1,000 Assignments...');
  const assignmentRecords = [];
  const assignmentIds = [];
  const sampleQuestions = [
    { id: 1, question: "State Newton's Second Law of Motion and derive F = ma.", max_marks: 10 },
    { id: 2, question: "Define electric potential and capacitance of a parallel plate capacitor.", max_marks: 10 },
    { id: 3, question: "Explain the mechanism of photosynthesis with light reactions.", max_marks: 10 },
    { id: 4, question: "Solve quadratic equation 2x^2 + 5x - 12 = 0.", max_marks: 10 },
    { id: 5, question: "Write a short essay on sustainable urban development.", max_marks: 10 }
  ];

  for (let a = 0; a < 1000; a++) {
    const aId = nextBigInt();
    assignmentIds.push(aId);
    const secId = sectionIds[a % sectionIds.length];
    const csId = classSubjectIds[a % classSubjectIds.length];
    const tsId = teacherSubjectIds[a % teacherSubjectIds.length];

    assignmentRecords.push({
      id: aId,
      section_id: secId,
      class_subject_id: csId,
      teacher_subject_id: tsId,
      title: `Unit Test ${Math.floor(a / 140) + 1}: Exam Evaluation Series`,
      difficulty: 'Medium',
      duration_minutes: 60,
      questions_json: sampleQuestions,
      question_paper_url: 'https://paatam-dev-media.s3.ap-south-2.amazonaws.com/samples/sample_exam.pdf',
      status: 'dispatched',
      submission_mode: 'STUDENT_UPLOAD',
    });
  }

  for (let i = 0; i < assignmentRecords.length; i += 500) {
    await prisma.assignment.createMany({ data: assignmentRecords.slice(i, i + 500) });
  }
  console.log(`✓ 1,000 Assignments Created`);

  // 14. Submissions (25,000 Submissions = 5 per student for first 5,000 students)
  console.log('Seeding 25,000 Submissions with OCR text, rubrics and scorecards...');
  const sampleOcrText = "Student Answer: Newton's first law states that every body continues in its state of rest or uniform motion in a straight line unless acted upon by an external unbalanced force. Inertia is the inherent property of matter. F = ma gives the mathematical measure of dynamic force. The acceleration is directly proportional to net force and inversely proportional to body mass.";
  const sampleRubricJson = {
    evaluated_at: new Date().toISOString(),
    criteria: [
      { name: "Law Definition", score: 9.0, max: 10.0, feedback: "Accurate statement of inertia." },
      { name: "Derivation", score: 8.5, max: 10.0, feedback: "Minor step omitted in vector notation." },
      { name: "Diagram & Units", score: 9.5, max: 10.0, feedback: "Correct SI units (Newtons)." }
    ]
  };

  const submissionRecords = [];
  const submissionIds = [];
  let subCount = 0;

  for (let s = 0; s < 5000; s++) {
    const studentId = studentIds[s];
    for (let exam = 0; exam < 5; exam++) {
      const subId = nextBigInt();
      submissionIds.push(subId);
      const aId = assignmentIds[(s + exam) % 1000];

      submissionRecords.push({
        id: subId,
        assignment_id: aId,
        student_id: studentId,
        sample_paper_url: `https://paatam-dev-media.s3.ap-south-2.amazonaws.com/submissions/student_${studentId}_exam_${exam}.pdf`,
        ocr_text: sampleOcrText,
        score: 87.0,
        max_score: 100.0,
        final_score: 87.0,
        feedback: "Solid conceptual grasp. Well structured answers with clear diagrams.",
        socratic_hint: "Review friction coefficient derivation in section 3.",
        ai_evaluation_json: sampleRubricJson,
        evaluation_provider: 'GEMINI_2_5_FLASH',
        evaluation_status: 'COMPLETED',
        status: 'approved',
      });
      subCount++;
    }
  }

  // Insert in batches of 1,000
  for (let i = 0; i < submissionRecords.length; i += 1000) {
    await prisma.submission.createMany({ data: submissionRecords.slice(i, i + 1000) });
    process.stdout.write(`  Inserted ${Math.min(i + 1000, submissionRecords.length)} / ${submissionRecords.length} submissions...\r`);
  }
  console.log(`\n✓ 25,000 Submissions Created`);

  // 15. Notifications (25,000 Notifications corresponding to submissions)
  console.log('Seeding 25,000 Notification Records...');
  const notificationRecords = [];
  for (let i = 0; i < 25000; i++) {
    notificationRecords.push({
      id: nextBigInt(),
      type: 'SCORECARD_DISPATCH',
      title: 'Exam Graded & Published',
      message: 'Your answer sheet has been evaluated. Final Score: 87/100.',
      submission_id: submissionIds[i],
      delivery_status: 'delivered',
      details_json: { channel: 'WHATSAPP_SMS', timestamp: new Date().toISOString() },
    });
  }

  for (let i = 0; i < notificationRecords.length; i += 1000) {
    await prisma.notification.createMany({ data: notificationRecords.slice(i, i + 1000) });
    process.stdout.write(`  Inserted ${Math.min(i + 1000, notificationRecords.length)} / ${notificationRecords.length} notifications...\r`);
  }
  console.log(`\n✓ 25,000 Notifications Created`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 SEEDING COMPLETE in ${totalTime}s! Total Database Rows Seeded: ~63,800+`);
}

main()
  .catch(e => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
