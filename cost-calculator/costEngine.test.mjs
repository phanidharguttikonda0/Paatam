import assert from 'node:assert/strict';
import test from 'node:test';
import { CostEngine } from './costEngine.js';
import { DEFAULT_PRICING, PRESETS } from './data.js';

const nearlyEqual = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('published catalog rates are the Gemini 3.6 Flash defaults', () => {
  assert.equal(DEFAULT_PRICING.geminiFlash.inputPer1M, 0.75);
  assert.equal(DEFAULT_PRICING.geminiFlash.outputPer1M, 3.75);
  assert.equal(DEFAULT_PRICING.gemini25Flash.inputPer1M, 0.30);
  assert.equal(DEFAULT_PRICING.gemini25Flash.outputPer1M, 2.50);
  assert.equal(DEFAULT_PRICING.sarvamDocAI.costPerPageINR, 0.50);
  assert.equal(DEFAULT_PRICING.sarvamChat105b.inputPer1M_INR, 15);
  assert.equal(DEFAULT_PRICING.sarvamChat105b.outputPer1M_INR, 60);
});

test('question replacements are charged only when requested', () => {
  const baseline = CostEngine.calculateQuestionPaperGenCost({ questionsCount: 20 }, DEFAULT_PRICING);
  const replaced = CostEngine.calculateQuestionPaperGenCost({ questionsCount: 20, regenerationsPerExam: 2 }, DEFAULT_PRICING);
  nearlyEqual(replaced.costUSD - baseline.costUSD, (1200 * 0.75 + 700 * 3.75) / 1_000_000);
});

test('uploaded question papers and answer keys use document OCR rates', () => {
  const uploaded = CostEngine.calculateUploadedDocumentCost('science', 2, DEFAULT_PRICING);
  nearlyEqual(uploaded.costUSD, ((400 + 2 * 258) * 0.75 + 2 * 350 * 3.75) / 1_000_000);
  assert.equal(CostEngine.calculateUploadedDocumentCost('hindi_indic', 2, DEFAULT_PRICING).costINR, 1);
  assert.equal(CostEngine.calculateUploadedDocumentCost('science', 0, DEFAULT_PRICING).costUSD, 0);
});

test('uploaded source substitutes generation and only charges uploaded answer keys', () => {
  const generated = CostEngine.calculateSubjectExamCost('science', { studentsCount: 40, paperSourceMode: 'generated', answerKeyPages: 2 }, DEFAULT_PRICING);
  const uploaded = CostEngine.calculateSubjectExamCost('science', { studentsCount: 40, paperSourceMode: 'uploaded', questionPaperPages: 2, answerKeyPages: 2 }, DEFAULT_PRICING);
  assert.equal(generated.steps.answerKeyExtraction.totalUSD, 0);
  nearlyEqual(uploaded.steps.qpGeneration.totalUSD, CostEngine.calculateUploadedDocumentCost('science', 2, DEFAULT_PRICING).costUSD);
  nearlyEqual(uploaded.steps.answerKeyExtraction.totalUSD, CostEngine.calculateUploadedDocumentCost('science', 2, DEFAULT_PRICING, 300).costUSD);
  assert.notEqual(generated.steps.qpGeneration.totalUSD, uploaded.steps.qpGeneration.totalUSD);
});

test('repeat calls and monthly ingestion reconcile with cohort and step totals', () => {
  const params = { studentsCount: 40, participantsPerExam: 20, examsPerStudentPerMonth: 2, subjectWeights: { science: 100 }, pricing: structuredClone(DEFAULT_PRICING) };
  const baseline = CostEngine.calculateMasterInstitutionCost(params);
  const modified = CostEngine.calculateMasterInstitutionCost({ ...params, paperSourceMode: 'uploaded', questionPaperPages: 2, answerKeyPages: 1, regenerationsPerExam: 1, ocrRepeatPercent: 10, evaluationRepeatPercent: 20, chaptersPerMonth: 3, chunksPerChapter: 4, syllabusAnalysesPerMonth: 2, pricing: { ...params.pricing, geminiEmbedding: { ...params.pricing.geminiEmbedding, costPer1M_USD: 1 } } });
  const steps = modified.stepsBreakdown;
  nearlyEqual(steps.chapterEmbeddings.totalMonthlyUSD, 3 * 4 * 800 / 1_000_000);
  nearlyEqual(steps.chapterMetadata.totalMonthlyUSD, 3 * (1200 * .75 + 300 * 3.75) / 1_000_000);
  nearlyEqual(steps.syllabusAnalysis.totalMonthlyUSD, 2 * (2000 * .75 + 500 * 3.75) / 1_000_000);
  nearlyEqual(Object.values(steps).reduce((sum, step) => sum + step.totalMonthlyUSD, 0), modified.cohortTotal.monthlyCostUSD);
  nearlyEqual(modified.cohortTotal.monthlyAiCostUSD + modified.cohortTotal.monthlyVariableInfraUSD, modified.cohortTotal.monthlyCostUSD);
  nearlyEqual(modified.perStudent.perPaperUSD * 80, modified.cohortTotal.monthlyCostUSD);
  assert.ok(modified.cohortTotal.monthlyCostUSD > baseline.cohortTotal.monthlyCostUSD);
  assert.equal(baseline.stepsBreakdown.chapterEmbeddings.totalMonthlyUSD, 0);
});

test('presets model the bulk-splitting worker without unverified optional calls', () => {
  for (const preset of Object.values(PRESETS)) {
    assert.equal(preset.bulkSlicingMode, 'dynamic_ai');
    assert.equal(preset.calibration22Percent, false);
    assert.equal(preset.visualDiagramMode, 'none');
  }
  assert.equal(DEFAULT_PRICING.geminiFlash.imageTokensPerPage, DEFAULT_PRICING.geminiFlash.pdfPageTokens);
});

test('scanned pages and billed thinking tokens respond to the configured usage', () => {
  const pricing = structuredClone(DEFAULT_PRICING);
  const ocr = CostEngine.calculateSingleStudentOcrCost('science', 3, pricing);
  pricing.geminiFlash.imageTokensPerPage += 258;
  const adjustedOcr = CostEngine.calculateSingleStudentOcrCost('science', 3, pricing);
  nearlyEqual(adjustedOcr.costUSD - ocr.costUSD, 3 * 258 / 1_000_000 * pricing.geminiFlash.inputPer1M);

  const evalCost = CostEngine.calculateSingleStudentEvalCost('science', 4, 22, null, pricing);
  pricing.geminiFlash.thinkingTokensPerEvaluation += 300;
  const adjustedEval = CostEngine.calculateSingleStudentEvalCost('science', 4, 22, null, pricing);
  nearlyEqual(adjustedEval.costUSD - evalCost.costUSD, 300 / 1_000_000 * pricing.geminiFlash.outputPer1M);
});

test('partial slicing batches are charged only for actual pages', () => {
  const slice = CostEngine.calculateBulkSlicingCost(3, 3, 'dynamic_ai', DEFAULT_PRICING);
  const expected = (2 * 600 + 9 * 258) / 1_000_000 * DEFAULT_PRICING.geminiFlash.inputPer1M + 9 * 35 / 1_000_000 * DEFAULT_PRICING.geminiFlash.outputPer1M;
  nearlyEqual(slice.costUSD, expected);
  assert.equal(slice.apiCalls, 2);
  assert.equal(CostEngine.calculateBulkSlicingCost(3, 3, 'fixed', DEFAULT_PRICING).costUSD, 0);
});

test('calibration adds exactly one extra subject-model pass per sampled paper plus synthesis', () => {
  for (const subject of ['science', 'hindi_indic']) {
    const config = { studentsCount: 40, pagesPerStudent: 4, questionsCount: 22, calibrationRatio: 0.22 };
    const baseline = CostEngine.calculateSubjectExamCost(subject, { ...config, calibration22Percent: false });
    const calibrated = CostEngine.calculateSubjectExamCost(subject, { ...config, calibration22Percent: true });
    const extra = CostEngine.calculateBulkCalibrationCost(subject, 40, 4, 22, true, 0.22, DEFAULT_PRICING);
    const onePass = CostEngine.calculateSingleStudentEvalCost(subject, 4, 22, null, DEFAULT_PRICING);
    assert.equal(extra.sampleStudentsCount, 9);
    nearlyEqual(extra.totalExtraCostUSD, 9 * onePass.costUSD + extra.synthesisCostUSD);
    nearlyEqual(calibrated.costPerStudentUSD - baseline.costPerStudentUSD, extra.costPerStudentUSD);
  }
});

test('exam participants amortize shared calls without changing per-paper OCR', () => {
  const small = CostEngine.calculateMasterInstitutionCost({ participantsPerExam: 40 });
  const large = CostEngine.calculateMasterInstitutionCost({ participantsPerExam: 350 });
  assert.ok(small.perStudent.perPaperUSD > large.perStudent.perPaperUSD);
  nearlyEqual(small.stepsBreakdown.ocrTranscription.perStudentUSD, large.stepsBreakdown.ocrTranscription.perStudentUSD);
  nearlyEqual(small.cohortTotal.monthlyCostUSD, small.perStudent.perPaperUSD * 6 * 350);
  nearlyEqual(Object.values(small.stepsBreakdown).reduce((sum, step) => sum + step.perStudentUSD, 0), small.perStudent.perPaperUSD);
});

test('displayed tier price drives annual contracts and invalid mixes are rejected', () => {
  const result = CostEngine.calculateMasterInstitutionCost({});
  for (const tier of result.pricingRecommendation.pricingTiers) {
    nearlyEqual(tier.annualContractINR, tier.pricePerStudentMonthINR * 350 * 10);
    nearlyEqual(tier.annualContractUSD, tier.pricePerStudentMonthUSD * 350 * 10);
  }
  assert.throws(() => CostEngine.calculateMasterInstitutionCost({ subjectWeights: { science: 0 } }), RangeError);
  assert.throws(() => CostEngine.calculateMasterInstitutionCost({ participantsPerExam: 351 }), RangeError);
});

test('cloud infrastructure evaluates $346.67 monthly AWS bill amortized per student and per paper (250 Concurrent Users)', () => {
  const result = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 350,
    examsPerStudentPerMonth: 6,
    cloudArchitecture: 'multi_az',
  }, DEFAULT_PRICING);

  assert.equal(result.fixedBill.monthlyUSD, 346.67);
  nearlyEqual(result.fixedBill.monthlyINR, 346.67 * 86.50);
  // 350 students: 346.67 / 350
  nearlyEqual(result.fixedBill.perStudentMonthUSD, 346.67 / 350);
  nearlyEqual(result.fixedBill.perStudentMonthINR, (346.67 / 350) * 86.50);
  // 2,100 papers: 346.67 / 2100
  nearlyEqual(result.fixedBill.perPaperUSD, 346.67 / 2100);
  nearlyEqual(result.fixedBill.perPaperINR, (346.67 / 2100) * 86.50);

  // Components breakdown checks
  const sumComponents = Object.values(result.fixedBill.components).reduce((s, c) => s + c.monthlyUSD, 0);
  nearlyEqual(sumComponents, 346.67);
  assert.equal(result.fixedBill.components.rdsPostgres.monthlyUSD, 115.28);
  assert.equal(result.fixedBill.components.ecsFargate.monthlyUSD, 72.08);
  assert.equal(result.fixedBill.components.natGateways.monthlyUSD, 81.54);
  assert.equal(result.fixedBill.components.alb.monthlyUSD, 22.27);
  assert.equal(result.fixedBill.components.rdsProxy.monthlyUSD, 21.90);
  assert.equal(result.fixedBill.components.waf.monthlyUSD, 10.80);
});

test('notification channels evaluate exact rates: SMS @ 60p, Email @ 30p, WhatsApp @ ₹1', () => {
  const notifs = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 100,
    examsPerStudentPerMonth: 4,
    notificationChannels: { whatsapp: true, sms: true, email: true },
  }, DEFAULT_PRICING);

  // Total INR per paper = 1.00 + 0.60 + 0.30 = 1.90
  nearlyEqual(notifs.notifications.perPaperINR, 1.90);
  nearlyEqual(notifs.notifications.perPaperUSD, 1.90 / 86.50);
  // 400 papers monthly = 400 * 1.90 = 760 INR
  nearlyEqual(notifs.notifications.monthlyCohortINR, 400 * 1.90);
  nearlyEqual(notifs.notifications.monthlyCohortUSD, (400 * 1.90) / 86.50);

  // Single channel checks
  const waOnly = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 100,
    examsPerStudentPerMonth: 1,
    notificationChannels: { whatsapp: true, sms: false, email: false },
  }, DEFAULT_PRICING);
  nearlyEqual(waOnly.notifications.perPaperINR, 1.00);

  const smsOnly = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 100,
    examsPerStudentPerMonth: 1,
    notificationChannels: { whatsapp: false, sms: true, email: false },
  }, DEFAULT_PRICING);
  nearlyEqual(smsOnly.notifications.perPaperINR, 0.60);

  const emailOnly = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 100,
    examsPerStudentPerMonth: 1,
    notificationChannels: { whatsapp: false, sms: false, email: true },
  }, DEFAULT_PRICING);
  nearlyEqual(emailOnly.notifications.perPaperINR, 0.30);
});

test('cost-optimized Single AZ architecture evaluates to $248.11 / month', () => {
  const singleAz = CostEngine.calculateCloudInfrastructureCost({
    studentsCount: 350,
    examsPerStudentPerMonth: 6,
    cloudArchitecture: 'single_az',
  }, DEFAULT_PRICING);

  assert.equal(singleAz.fixedBill.monthlyUSD, 248.11);
  assert.equal(singleAz.fixedBill.components.natGateways.monthlyUSD, 40.77);
  assert.equal(singleAz.fixedBill.components.rdsPostgres.monthlyUSD, 61.14);
  assert.equal(singleAz.fixedBill.components.elasticIps.monthlyUSD, 3.65);
});

test('including fixed cloud infra reconciles all cohort and step totals', () => {
  const params = {
    studentsCount: 350,
    participantsPerExam: 40,
    examsPerStudentPerMonth: 6,
    includeFixedCloudInfra: true,
    notificationChannels: { whatsapp: true, sms: false, email: false },
  };
  const result = CostEngine.calculateMasterInstitutionCost(params);
  const totalMonthlyPapers = 350 * 6;
  nearlyEqual(result.perStudent.perPaperUSD * totalMonthlyPapers, result.cohortTotal.monthlyCostUSD);
  nearlyEqual(Object.values(result.stepsBreakdown).reduce((sum, step) => sum + step.totalMonthlyUSD, 0), result.cohortTotal.monthlyCostUSD);
  assert.ok(result.stepsBreakdown.fixedCloudInfra);
  assert.equal(result.stepsBreakdown.fixedCloudInfra.totalMonthlyUSD, 346.67);
  assert.equal(result.cloudInfrastructure.notifications.perPaperINR, 1.00);
});