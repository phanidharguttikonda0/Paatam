/**
 * Paatam AI Cost Engine - Mathematical Core
 * Computes granular costs for every API call in the Paatam platform:
 * 1. Question Paper Generation (Gemini 3.6 Flash)
 * 2. Visual Diagram & Image Generation (Gemini Image API vs SVG Vector)
 * 3. Bulk PDF Stack Boundary Slicing (Fixed Template vs Gemini Vision 8-page batches)
 * 4. Handwritten Answer Sheet OCR Transcription (Gemini Vision vs Sarvam DocAI)
 * 5. Optional calibration sample (additional evaluation pass and synthesis)
 * 6. Rubric Evaluation & Socratic Hint Synthesis (Gemini 3.6 Flash / Sarvam 105B)
 * 7. Cloud Storage, SQS Queues & Notification Delivery (AWS ap-south-2)
 */

import { DEFAULT_PRICING, SUBJECT_PROFILES } from './data.js';

export class CostEngine {
  /**
   * Helper to convert USD to INR
   */
  static usdToInr(usdAmount, rate = DEFAULT_PRICING.usdToInr) {
    return usdAmount * rate;
  }

  /**
   * Helper to convert INR to USD
   */
  static inrToUsd(inrAmount, rate = DEFAULT_PRICING.usdToInr) {
    return inrAmount / rate;
  }

  /**
   * Calculates cost for generating 1 Exam Question Paper from syllabus/blueprint
   * Amortized across all students taking that exam.
   */
  static calculateQuestionPaperGenCost(params, pricing) {
    const { questionsCount = 20, regenerationsPerExam = 0 } = params;

    // Prompt tokens are a planning estimate, not measured API usage.
    const promptTokens = 3500 + questionsCount * 120;
    // Generated JSON questions with rubrics, solutions, marking schemes (~110 tokens per question)
    const outputTokens = questionsCount * 125;
    const regenPromptTokens = regenerationsPerExam * 600;
    const regenOutputTokens = regenerationsPerExam * 350;

    const totalInput = promptTokens + regenPromptTokens;
    const totalOutput = outputTokens + regenOutputTokens;

    const model = pricing.geminiFlash;

    const costUSD =
      (totalInput / 1_000_000) * model.inputPer1M +
      (totalOutput / 1_000_000) * model.outputPer1M;

    return {
      costUSD,
      costINR: this.usdToInr(costUSD, pricing.usdToInr),
      inputTokens: totalInput,
      outputTokens: totalOutput,
      modelUsed: model.name,
    };
  }

  static calculateUploadedDocumentCost(subjectKey, pages, pricing, outputTokensPerPage = 350) {
    if (pages === 0) return { costUSD: 0, costINR: 0 };
    const profile = SUBJECT_PROFILES[subjectKey] || SUBJECT_PROFILES.science;
    const costUSD = profile.ocrEngine === 'sarvam_doc_ai'
      ? this.inrToUsd(pages * pricing.sarvamDocAI.costPerPageINR, pricing.usdToInr)
      : ((400 + pages * pricing.geminiFlash.pdfPageTokens) * pricing.geminiFlash.inputPer1M +
        pages * outputTokensPerPage * pricing.geminiFlash.outputPer1M) / 1_000_000;
    return { costUSD, costINR: this.usdToInr(costUSD, pricing.usdToInr) };
  }

  static calculateCurriculumIngestionCost(chapters, chunksPerChapter, syllabusAnalyses, pricing) {
    const model = pricing.geminiFlash;
    const metadataUSD = chapters * (1200 * model.inputPer1M + 300 * model.outputPer1M) / 1_000_000;
    const embeddingUSD = chapters * chunksPerChapter * 800 * pricing.geminiEmbedding.costPer1M_USD / 1_000_000;
    const syllabusUSD = syllabusAnalyses * (2000 * model.inputPer1M + 500 * model.outputPer1M) / 1_000_000;
    return { metadataUSD, embeddingUSD, syllabusUSD, costUSD: metadataUSD + embeddingUSD + syllabusUSD };
  }

  /**
   * Calculates cost for generating visual diagrams / illustrations for exam questions
   */
  static calculateDiagramGenerationCost(diagramCount, mode, pricing) {
    if (diagramCount <= 0 || mode === 'none') {
      return { costUSD: 0, costINR: 0, diagramCount: 0 };
    }

    let costUSD = 0;

    if (mode === 'ai_image') {
      // Raster image generation
      costUSD = diagramCount * pricing.geminiImageGen.costPerImageUSD;
    } else if (mode === 'svg') {
      // Vector SVG code generation
      const outputTokens = diagramCount * pricing.svgDiagramCost.avgOutputTokens;
      const promptTokens = diagramCount * 300;
      costUSD =
        (promptTokens / 1_000_000) * pricing.geminiFlash.inputPer1M +
        (outputTokens / 1_000_000) * pricing.geminiFlash.outputPer1M;
    } else {
      // Mixed mode: 40% raster, 60% SVG
      const aiImageCount = Math.round(diagramCount * 0.4);
      const svgCount = diagramCount - aiImageCount;

      const aiImageCost = aiImageCount * pricing.geminiImageGen.costPerImageUSD;
      const svgTokens = svgCount * pricing.svgDiagramCost.avgOutputTokens;
      const svgCost =
        ((svgCount * 300) / 1_000_000) * pricing.geminiFlash.inputPer1M +
        (svgTokens / 1_000_000) * pricing.geminiFlash.outputPer1M;

      costUSD = aiImageCost + svgCost;
    }

    return {
      costUSD,
      costINR: this.usdToInr(costUSD, pricing.usdToInr),
      diagramCount,
      mode,
    };
  }

  /**
   * Calculates Bulk PDF stack boundary detection / slicing cost
   */
  static calculateBulkSlicingCost(studentsCount, pagesPerStudent, mode, pricing) {
    if (mode === 'fixed' || studentsCount <= 1) {
      // Fixed page templates avoid AI slicing; infrastructure is charged separately.
      return { costUSD: 0, costINR: 0, apiCalls: 0, mode: 'fixed' };
    }

    // Dynamic AI boundary detection: processes pages in batches of 8 using Gemini Vision
    const totalPages = studentsCount * pagesPerStudent;
    const batchSize = 8;
    const batchesCount = Math.ceil(totalPages / batchSize);

    const totalInput = batchesCount * 600 + totalPages * pricing.geminiFlash.pdfPageTokens;
    const totalOutput = totalPages * 35;

    const costUSD =
      (totalInput / 1_000_000) * pricing.geminiFlash.inputPer1M +
      (totalOutput / 1_000_000) * pricing.geminiFlash.outputPer1M;

    return {
      costUSD,
      costINR: this.usdToInr(costUSD, pricing.usdToInr),
      apiCalls: batchesCount,
      totalBatches: batchesCount,
      mode: 'dynamic_ai',
    };
  }

  /**
   * Calculates Stage 1 Handwritten OCR Transcription cost for 1 student paper
   */
  static calculateSingleStudentOcrCost(subjectKey, pagesCount, pricing) {
    const profile = SUBJECT_PROFILES[subjectKey] || SUBJECT_PROFILES.science;

    if (profile.ocrEngine === 'sarvam_doc_ai') {
      // Indic language handwriting: processed via Sarvam Document AI API per page
      const costINR = pagesCount * pricing.sarvamDocAI.costPerPageINR;
      const costUSD = this.inrToUsd(costINR, pricing.usdToInr);
      return {
        costUSD,
        costINR,
        engine: 'sarvam_doc_ai',
        engineLabel: 'Sarvam DocAI (Indic OCR)',
        pagesCount,
      };
    }

    // The bulk worker sends each student paper as a PDF; tune document tokens from measured usage.
    const tokensPerPage = profile.ocrTokensPerPage;
    const inputTokens = pagesCount * (tokensPerPage.input + pricing.geminiFlash.imageTokensPerPage);
    const outputTokens = pagesCount * tokensPerPage.output;

    const costUSD =
      (inputTokens / 1_000_000) * pricing.geminiFlash.inputPer1M +
      (outputTokens / 1_000_000) * pricing.geminiFlash.outputPer1M;

    return {
      costUSD,
      costINR: this.usdToInr(costUSD, pricing.usdToInr),
      engine: 'gemini_vision',
      engineLabel: 'Gemini 3.6 Flash Vision',
      pagesCount,
      inputTokens,
      outputTokens,
    };
  }

  /**
   * Calculates Stage 2 Rubric Evaluation & Socratic Guidance cost for 1 student paper
   */
  static calculateSingleStudentEvalCost(subjectKey, pagesCount, questionsCount, modelOverride, pricing) {
    const profile = SUBJECT_PROFILES[subjectKey] || SUBJECT_PROFILES.science;
    const evalEngine = modelOverride || profile.evalEngine;

    // Tokens calculation based on pages and questions
    const baseInput = profile.evalTokensPerStudent.input + (questionsCount - profile.defaultQuestionsCount) * 80;
    const baseOutput = profile.evalTokensPerStudent.output + (questionsCount - profile.defaultQuestionsCount) * 45;

    // Extra transcription text length if pages > default
    const pageTokenAdd = Math.max(0, pagesCount - profile.defaultPagesPerStudent) * 350;
    const totalInput = Math.max(1500, baseInput + pageTokenAdd);
    const totalOutput = Math.max(600, baseOutput) + (evalEngine === 'sarvam_105b' ? 0 : pricing.geminiFlash.thinkingTokensPerEvaluation);

    let costUSD = 0;
    let costINR = 0;
    let engineLabel = '';

    if (evalEngine === 'sarvam_105b') {
      // Sarvam 105B Indic LLM
      costINR =
        (totalInput / 1_000_000) * pricing.sarvamChat105b.inputPer1M_INR +
        (totalOutput / 1_000_000) * pricing.sarvamChat105b.outputPer1M_INR;
      costUSD = this.inrToUsd(costINR, pricing.usdToInr);
      engineLabel = 'Sarvam 105B (Indic LLM)';
    } else {
      costUSD =
        (totalInput / 1_000_000) * pricing.geminiFlash.inputPer1M +
        (totalOutput / 1_000_000) * pricing.geminiFlash.outputPer1M;
      costINR = this.usdToInr(costUSD, pricing.usdToInr);
      engineLabel = pricing.geminiFlash.name;
    }

    return {
      costUSD,
      costINR,
      engine: evalEngine,
      engineLabel,
      inputTokens: totalInput,
      outputTokens: totalOutput,
    };
  }

  /**
   * Optional 22% Bulk Calibration Moderation Phase
   * Evaluates a 22% sample to extract benchmark rubrics, synthesizes a cohort anchor,
   * then batches the remaining 78% of papers.
   */
  static calculateBulkCalibrationCost(subjectKey, studentsCount, pagesCount, questionsCount, isCalibrationEnabled, calibrationRatio, pricing) {
    if (!isCalibrationEnabled || studentsCount <= 1 || calibrationRatio <= 0) {
      return {
        enabled: false,
        sampleStudentsCount: 0,
        totalExtraCostUSD: 0,
        totalExtraCostINR: 0,
        costPerStudentUSD: 0,
        costPerStudentINR: 0,
      };
    }

    const sampleStudentsCount = Math.min(studentsCount, Math.max(1, Math.round(studentsCount * calibrationRatio)));
    const anchorEval = this.calculateSingleStudentEvalCost(subjectKey, pagesCount, questionsCount, null, pricing);

    const synthesisPromptTokens = 3500 + sampleStudentsCount * 250;
    const synthesisOutputTokens = 1200;
    const synthesisCostUSD = anchorEval.engine === 'sarvam_105b'
      ? this.inrToUsd(
        (synthesisPromptTokens / 1_000_000) * pricing.sarvamChat105b.inputPer1M_INR +
        (synthesisOutputTokens / 1_000_000) * pricing.sarvamChat105b.outputPer1M_INR,
        pricing.usdToInr
      )
      : (synthesisPromptTokens / 1_000_000) * pricing.geminiFlash.inputPer1M +
        (synthesisOutputTokens / 1_000_000) * pricing.geminiFlash.outputPer1M;

    const totalExtraCostUSD = sampleStudentsCount * anchorEval.costUSD + synthesisCostUSD;
    const costPerStudentUSD = totalExtraCostUSD / studentsCount;

    return {
      enabled: true,
      samplePercentage: Math.round(calibrationRatio * 100),
      sampleStudentsCount,
      remainingStudentsCount: studentsCount - sampleStudentsCount,
      totalExtraCostUSD,
      totalExtraCostINR: this.usdToInr(totalExtraCostUSD, pricing.usdToInr),
      costPerStudentUSD,
      costPerStudentINR: this.usdToInr(costPerStudentUSD, pricing.usdToInr),
      synthesisCostUSD,
      modelUsed: anchorEval.engineLabel,
    };
  }

  /**
   * Calculates Cloud Infrastructure & Parent Notification Costs
   * 1. Evaluates the $346.67 / month High-Availability Multi-AZ AWS Cloud Bill
   *    (WAF, 2x NAT, 2x Elastic IP, ALB, 2x ECS Fargate, RDS Proxy, Multi-AZ RDS PostgreSQL db.t4g.medium, CloudWatch, ECR, SQS+Lambda+S3+SES)
   *    Sized empirically for 250 Concurrent Users (5,000 Students + 1,000 Staff)
   * 2. Evaluates the Cost-Optimized Single-AZ Alternative ($248.11 / month)
   * 3. Amortizes each AWS component and total fixed bill per student/month and per exam paper
   * 4. Evaluates parent scorecard notification channels:
   *    - SMS: 60 Paisa (₹0.60) per message
   *    - Email: 30 Paisa (₹0.30) per message
   *    - WhatsApp: 1 Rs (₹1.00) per message
   */
  static calculateCloudInfrastructureCost(params = {}, pricing = DEFAULT_PRICING) {
    const {
      studentsCount = 350,
      examsPerStudentPerMonth = 6,
      cloudArchitecture = 'multi_az', // 'multi_az' ($346.67) or 'single_az' ($248.11)
      customFixedMonthlyUSD = null,
      notificationChannels = { whatsapp: true, sms: false, email: false },
    } = params;

    const monthlyPapers = studentsCount * examsPerStudentPerMonth;
    const isMultiAz = cloudArchitecture === 'multi_az';

    const components = {
      waf: {
        id: 'waf',
        name: 'AWS WAF (Web ACL + AWS Managed + 3 Custom Rules + L7 Traffic)',
        category: 'Edge & Security',
        monthlyUSD: 10.80,
        details: '$5.00 Web ACL + $1.00 Common Rules + $3.00 Custom Rules + $1.80 L7 traffic (~3M reqs)',
      },
      natGateways: {
        id: 'natGateways',
        name: isMultiAz ? '2x NAT Gateways (Multi-AZ High Availability)' : '1x NAT Gateway (Single AZ Cost-Optimized)',
        category: 'Networking',
        monthlyUSD: isMultiAz ? 81.54 : 40.77,
        details: isMultiAz ? '2x $0.056/hr across AZ-1 & AZ-2 (redundant internet egress for AI calls)' : '1x $0.056/hr in AZ-1 (50% cost reduction, saves ~$41/mo)',
      },
      elasticIps: {
        id: 'elasticIps',
        name: isMultiAz ? '2x Elastic IPs (Public IPv4 for NAT)' : '1x Elastic IP (Public IPv4 for NAT)',
        category: 'Networking',
        monthlyUSD: isMultiAz ? 7.30 : 3.65,
        details: isMultiAz ? '2x $0.005/hr IPv4 allocation charge' : '1x $0.005/hr IPv4 allocation charge (saves ~$3.65/mo)',
      },
      alb: {
        id: 'alb',
        name: 'Application Load Balancer (ALB + LCU)',
        category: 'Traffic Routing',
        monthlyUSD: 22.27,
        details: '$16.43 base ($0.0225/hr) + $5.84 LCU (~1 LCU for 250 concurrent users)',
      },
      ecsFargate: {
        id: 'ecsFargate',
        name: 'AWS ECS Fargate (2x Tasks: 1 vCPU, 2 GB RAM)',
        category: 'Serverless Compute',
        monthlyUSD: 72.08,
        details: 'Self-healing containers auto-scaling in 20-30s with zero downtime during exam spikes (handles 250 concurrent users)',
      },
      rdsProxy: {
        id: 'rdsProxy',
        name: 'Amazon RDS Proxy (PostgreSQL Connection Multiplexer)',
        category: 'Database Pooling',
        monthlyUSD: 21.90,
        details: 'Multiplexes 100+ concurrent Lambda worker DB connections into 15-25 stable pooled connections (80% pool = 360 conns)',
      },
      rdsPostgres: {
        id: 'rdsPostgres',
        name: isMultiAz ? 'Amazon RDS PostgreSQL Multi-AZ (db.t4g.medium, 2 vCPU, 4 GB)' : 'Amazon RDS PostgreSQL Single-AZ (db.t4g.medium, 2 vCPU, 4 GB)',
        category: 'Database & Storage',
        monthlyUSD: isMultiAz ? 115.28 : 61.14,
        details: isMultiAz ? 'Multi-AZ synchronous replication + 100 GB gp3 (empirically sized for 250 concurrent users with 100% in-memory buffer)' : 'Single-AZ primary + 100 GB gp3 storage + automated snapshots (saves ~$54/mo vs Multi-AZ)',
      },
      cloudwatch: {
        id: 'cloudwatch',
        name: 'Amazon CloudWatch (Logs, Alarms & Metrics)',
        category: 'Observability',
        monthlyUSD: 7.50,
        details: 'Pino structured JSON logs (14-day retention) + health check alarms',
      },
      ecr: {
        id: 'ecr',
        name: 'Amazon Elastic Container Registry (ECR)',
        category: 'Containers',
        monthlyUSD: 0.50,
        details: 'Docker image repositories (5 GB); intra-region ECS pulls are free',
      },
      serverlessPipeline: {
        id: 'serverlessPipeline',
        name: 'Serverless AI Pipeline (SQS + Lambda + S3 + SES)',
        category: 'Async Workers',
        monthlyUSD: 7.50,
        details: 'SQS ($0.50) + Lambda ($3.00) + S3 ($3.00) + EventBridge ($0.00) + SES ($1.00)',
      },
    };

    let fixedMonthlyUSD = customFixedMonthlyUSD != null
      ? Number(customFixedMonthlyUSD)
      : Object.values(components).reduce((sum, c) => sum + c.monthlyUSD, 0);
    fixedMonthlyUSD = Math.round(fixedMonthlyUSD * 100) / 100;
    const fixedMonthlyINR = this.usdToInr(fixedMonthlyUSD, pricing.usdToInr);

    // Amortize each component
    const componentAmortization = {};
    for (const [key, comp] of Object.entries(components)) {
      const compUSD = comp.monthlyUSD;
      const compINR = this.usdToInr(compUSD, pricing.usdToInr);
      const perStudentMonthUSD = studentsCount > 0 ? compUSD / studentsCount : 0;
      const perStudentMonthINR = this.usdToInr(perStudentMonthUSD, pricing.usdToInr);
      const perPaperUSD = monthlyPapers > 0 ? compUSD / monthlyPapers : 0;
      const perPaperINR = this.usdToInr(perPaperUSD, pricing.usdToInr);
      const sharePercent = fixedMonthlyUSD > 0 ? Math.round((compUSD / fixedMonthlyUSD) * 100) : 0;

      componentAmortization[key] = {
        ...comp,
        monthlyUSD: compUSD,
        monthlyINR: compINR,
        perStudentMonthUSD,
        perStudentMonthINR,
        perPaperUSD,
        perPaperINR,
        sharePercent,
      };
    }

    const fixedPerStudentMonthUSD = studentsCount > 0 ? fixedMonthlyUSD / studentsCount : 0;
    const fixedPerStudentMonthINR = this.usdToInr(fixedPerStudentMonthUSD, pricing.usdToInr);
    const fixedPerPaperUSD = monthlyPapers > 0 ? fixedMonthlyUSD / monthlyPapers : 0;
    const fixedPerPaperINR = this.usdToInr(fixedPerPaperUSD, pricing.usdToInr);

    // Notification rates (exact user specification)
    const notifRates = pricing.notifications || {};
    const smsRateINR = notifRates.smsINR ?? 0.60;          // 60 Paisa per SMS
    const emailRateINR = notifRates.emailINR ?? 0.30;      // 30 Paisa per Email
    const whatsappRateINR = notifRates.whatsappINR ?? 1.00; // 1 Rs per WhatsApp

    const activeChannels = [];
    let notificationPerPaperINR = 0;

    if (notificationChannels?.whatsapp) {
      notificationPerPaperINR += whatsappRateINR;
      activeChannels.push({ id: 'whatsapp', name: 'WhatsApp', rateINR: whatsappRateINR, rateUSD: this.inrToUsd(whatsappRateINR, pricing.usdToInr) });
    }
    if (notificationChannels?.sms) {
      notificationPerPaperINR += smsRateINR;
      activeChannels.push({ id: 'sms', name: 'SMS', rateINR: smsRateINR, rateUSD: this.inrToUsd(smsRateINR, pricing.usdToInr) });
    }
    if (notificationChannels?.email) {
      notificationPerPaperINR += emailRateINR;
      activeChannels.push({ id: 'email', name: 'Email', rateINR: emailRateINR, rateUSD: this.inrToUsd(emailRateINR, pricing.usdToInr) });
    }

    const notificationPerPaperUSD = this.inrToUsd(notificationPerPaperINR, pricing.usdToInr);
    const notificationPerStudentMonthINR = notificationPerPaperINR * examsPerStudentPerMonth;
    const notificationPerStudentMonthUSD = notificationPerPaperUSD * examsPerStudentPerMonth;
    const notificationMonthlyCohortINR = notificationPerPaperINR * monthlyPapers;
    const notificationMonthlyCohortUSD = notificationPerPaperUSD * monthlyPapers;

    // Variable AWS Pipeline Costs (S3 raw/processed page storage + SQS messages + Lambda execution per paper)
    const s3PerPaperUSD = pricing.cloudInfra.s3StoragePerPaperUSD;
    const sqsLambdaPerPaperUSD = pricing.cloudInfra.sqsLambdaPerPaperUSD;
    const variableStoragePerPaperUSD = s3PerPaperUSD + sqsLambdaPerPaperUSD;
    const variableStoragePerPaperINR = this.usdToInr(variableStoragePerPaperUSD, pricing.usdToInr);
    const variableStorageCohortMonthlyUSD = variableStoragePerPaperUSD * monthlyPapers;
    const variableStorageCohortMonthlyINR = this.usdToInr(variableStorageCohortMonthlyUSD, pricing.usdToInr);

    // Combined Cloud & Notification totals
    const totalCloudAndNotifMonthlyUSD = fixedMonthlyUSD + notificationMonthlyCohortUSD + variableStorageCohortMonthlyUSD;
    const totalCloudAndNotifMonthlyINR = fixedMonthlyINR + notificationMonthlyCohortINR + variableStorageCohortMonthlyINR;
    const totalCloudAndNotifPerStudentMonthUSD = totalCloudAndNotifMonthlyUSD / Math.max(1, studentsCount);
    const totalCloudAndNotifPerStudentMonthINR = this.usdToInr(totalCloudAndNotifPerStudentMonthUSD, pricing.usdToInr);
    const totalCloudAndNotifPerPaperUSD = totalCloudAndNotifMonthlyUSD / Math.max(1, monthlyPapers);
    const totalCloudAndNotifPerPaperINR = this.usdToInr(totalCloudAndNotifPerPaperUSD, pricing.usdToInr);

    return {
      architecture: cloudArchitecture,
      isMultiAz,
      monthlyPapers,
      fixedBill: {
        monthlyUSD: fixedMonthlyUSD,
        monthlyINR: fixedMonthlyINR,
        perStudentMonthUSD: fixedPerStudentMonthUSD,
        perStudentMonthINR: fixedPerStudentMonthINR,
        perPaperUSD: fixedPerPaperUSD,
        perPaperINR: fixedPerPaperINR,
        components: componentAmortization,
      },
      notifications: {
        rates: {
          smsINR: smsRateINR,
          emailINR: emailRateINR,
          whatsappINR: whatsappRateINR,
        },
        channelsConfigured: notificationChannels,
        activeChannels,
        perPaperINR: notificationPerPaperINR,
        perPaperUSD: notificationPerPaperUSD,
        perStudentMonthINR: notificationPerStudentMonthINR,
        perStudentMonthUSD: notificationPerStudentMonthUSD,
        monthlyCohortINR: notificationMonthlyCohortINR,
        monthlyCohortUSD: notificationMonthlyCohortUSD,
      },
      variableStorage: {
        perPaperUSD: variableStoragePerPaperUSD,
        perPaperINR: variableStoragePerPaperINR,
        monthlyCohortUSD: variableStorageCohortMonthlyUSD,
        monthlyCohortINR: variableStorageCohortMonthlyINR,
      },
      combined: {
        monthlyUSD: totalCloudAndNotifMonthlyUSD,
        monthlyINR: totalCloudAndNotifMonthlyINR,
        perStudentMonthUSD: totalCloudAndNotifPerStudentMonthUSD,
        perStudentMonthINR: totalCloudAndNotifPerStudentMonthINR,
        perPaperUSD: totalCloudAndNotifPerPaperUSD,
        perPaperINR: totalCloudAndNotifPerPaperINR,
      },
    };
  }

  /**
   * Computes the complete cost breakdown for a specific subject exam cohort
   */
  static calculateSubjectExamCost(subjectKey, config, pricing = DEFAULT_PRICING) {
    const {
      studentsCount = 40,
      pagesPerStudent = 4,
      questionsCount = 22,
      bulkSlicingMode = 'dynamic_ai',
      calibration22Percent = false,
      calibrationRatio = 0.22,
      visualDiagramMode = 'none',
      paperSourceMode = 'generated',
      questionPaperPages = 2,
      answerKeyPages = 0,
      regenerationsPerExam = 0,
      ocrRepeatPercent = 0,
      evaluationRepeatPercent = 0,
      notificationChannels = undefined,
    } = config;

    const profile = SUBJECT_PROFILES[subjectKey] || SUBJECT_PROFILES.science;

    // 1. Question Paper Ingestion / Generation (1 exam generated, amortized per student)
    const qpGen = paperSourceMode === 'uploaded'
      ? this.calculateUploadedDocumentCost(subjectKey, questionPaperPages, pricing)
      : this.calculateQuestionPaperGenCost({ questionsCount, regenerationsPerExam }, pricing);
    const regeneration = paperSourceMode === 'uploaded'
      ? { costUSD: regenerationsPerExam * (600 * pricing.geminiFlash.inputPer1M + 350 * pricing.geminiFlash.outputPer1M) / 1_000_000 }
      : null;
    const qpGenPerStudentUSD = (qpGen.costUSD + (regeneration?.costUSD || 0)) / studentsCount;
    const answerKey = paperSourceMode === 'uploaded'
      ? this.calculateUploadedDocumentCost(subjectKey, answerKeyPages, pricing, 300)
      : { costUSD: 0 };
    const answerKeyPerStudentUSD = answerKey.costUSD / studentsCount;

    // 2. Diagram / Visual Illustration Generation (amortized per student)
    const diagrams = this.calculateDiagramGenerationCost(
      profile.avgDiagramsPerExam,
      visualDiagramMode,
      pricing
    );
    const diagramsPerStudentUSD = diagrams.costUSD / Math.max(1, studentsCount);

    // 3. Bulk PDF Stack Boundary Detection & Slicing (amortized per student)
    const slicing = this.calculateBulkSlicingCost(
      studentsCount,
      pagesPerStudent,
      bulkSlicingMode,
      pricing
    );
    const slicingPerStudentUSD = slicing.costUSD / Math.max(1, studentsCount);

    // 4. Stage 1 Handwritten OCR Transcription (Per Student)
    const ocrSingle = this.calculateSingleStudentOcrCost(
      subjectKey,
      pagesPerStudent,
      pricing
    );

    // 5. Stage 2 Rubric Evaluation & Socratic Feedback (Per Student baseline)
    const evalSingle = this.calculateSingleStudentEvalCost(
      subjectKey,
      pagesPerStudent,
      questionsCount,
      null,
      pricing
    );

    // 6. 22% Bulk Calibration Moderation Phase (amortized incremental cost per student)
    const calibration = this.calculateBulkCalibrationCost(
      subjectKey,
      studentsCount,
      pagesPerStudent,
      questionsCount,
      calibration22Percent,
      calibrationRatio,
      pricing
    );

    // 7. Cloud Storage & Notifications (S3 + SQS + SES/SMS/WhatsApp per student paper)
    let notificationPerPaperUSD = pricing.cloudInfra.notificationPerPaperUSD || 0;
    let notificationLabel = '';
    if (notificationChannels) {
      let notifINR = 0;
      const parts = [];
      const notifRates = pricing.notifications || {};
      if (notificationChannels.whatsapp) {
        const rate = notifRates.whatsappINR ?? 1.00;
        notifINR += rate;
        parts.push(`WhatsApp (₹${rate.toFixed(2)})`);
      }
      if (notificationChannels.sms) {
        const rate = notifRates.smsINR ?? 0.60;
        notifINR += rate;
        parts.push(`SMS (₹${rate.toFixed(2)})`);
      }
      if (notificationChannels.email) {
        const rate = notifRates.emailINR ?? 0.30;
        notifINR += rate;
        parts.push(`Email (₹${rate.toFixed(2)})`);
      }
      notificationPerPaperUSD = this.inrToUsd(notifINR, pricing.usdToInr);
      notificationLabel = parts.length > 0 ? parts.join(' + ') : 'In-App Only (₹0)';
    } else if (config.notificationPerPaperUSD !== undefined) {
      notificationPerPaperUSD = config.notificationPerPaperUSD;
    }

    const infraPerStudentUSD =
      pricing.cloudInfra.s3StoragePerPaperUSD +
      pricing.cloudInfra.sqsLambdaPerPaperUSD +
      notificationPerPaperUSD;

    // Total Cost Per Student for this 1 Exam Paper
    const costPerStudentUSD =
      qpGenPerStudentUSD +
      answerKeyPerStudentUSD +
      diagramsPerStudentUSD +
      slicingPerStudentUSD +
      ocrSingle.costUSD +
      evalSingle.costUSD +
      ocrSingle.costUSD * ocrRepeatPercent / 100 +
      evalSingle.costUSD * evaluationRepeatPercent / 100 +
      calibration.costPerStudentUSD +
      infraPerStudentUSD;

    const costPerStudentINR = this.usdToInr(costPerStudentUSD, pricing.usdToInr);
    const totalCohortCostUSD = costPerStudentUSD * studentsCount;
    const totalCohortCostINR = totalCohortCostUSD * pricing.usdToInr;

    return {
      subjectKey,
      profile,
      costPerStudentUSD,
      costPerStudentINR,
      totalCohortCostUSD,
      totalCohortCostINR,
      steps: {
        qpGeneration: {
          label: paperSourceMode === 'uploaded' ? 'Uploaded Question Paper OCR & Replacements' : 'Question Paper Generation & Replacements',
          totalUSD: qpGen.costUSD + (regeneration?.costUSD || 0),
          perStudentUSD: qpGenPerStudentUSD,
          perStudentINR: this.usdToInr(qpGenPerStudentUSD, pricing.usdToInr),
          details: `${paperSourceMode === 'uploaded' ? `${questionPaperPages}-page uploaded PDF` : `${questionsCount} generated questions`}; ${regenerationsPerExam} replacements / exam`,
        },
        answerKeyExtraction: {
          label: 'Uploaded Answer Key OCR',
          totalUSD: answerKey.costUSD,
          perStudentUSD: answerKeyPerStudentUSD,
          perStudentINR: this.usdToInr(answerKeyPerStudentUSD, pricing.usdToInr),
          details: paperSourceMode === 'uploaded' ? `${answerKeyPages} pages / exam` : 'Generated key included in question paper',
        },
        diagramGeneration: {
          label: 'Visual Diagram & Stimulus Generation',
          totalUSD: diagrams.costUSD,
          perStudentUSD: diagramsPerStudentUSD,
          perStudentINR: this.usdToInr(diagramsPerStudentUSD, pricing.usdToInr),
          details: visualDiagramMode === 'none' ? 'No separately generated diagrams' : `${profile.avgDiagramsPerExam} diagrams (${visualDiagramMode.toUpperCase()}) amortized`,
        },
        bulkSlicing: {
          label: 'Bulk Stack Slicing & Boundary Detection',
          totalUSD: slicing.costUSD,
          perStudentUSD: slicingPerStudentUSD,
          perStudentINR: this.usdToInr(slicingPerStudentUSD, pricing.usdToInr),
          details: slicing.mode === 'fixed' ? 'Direct per-paper upload (no bulk boundary call)' : `${slicing.apiCalls} Gemini Vision 8-page batches`,
        },
        ocrTranscription: {
          label: 'Stage 1: Handwritten OCR Transcription',
          totalUSD: ocrSingle.costUSD * studentsCount,
          perStudentUSD: ocrSingle.costUSD,
          perStudentINR: ocrSingle.costINR,
          details: `${pagesPerStudent} pages via ${ocrSingle.engineLabel}`,
        },
        calibrationPhase: {
          label: 'Optional Calibration Passes',
          totalUSD: calibration.totalExtraCostUSD,
          perStudentUSD: calibration.costPerStudentUSD,
          perStudentINR: calibration.costPerStudentINR,
          details: calibration.enabled
            ? `${calibration.sampleStudentsCount} extra ${evalSingle.engineLabel} passes plus synthesis`
            : 'Calibration Disabled',
        },
        rubricEvaluation: {
          label: 'Stage 2: Rubric Evaluation & Socratic Hints',
          totalUSD: evalSingle.costUSD * studentsCount,
          perStudentUSD: evalSingle.costUSD,
          perStudentINR: evalSingle.costINR,
          details: `${questionsCount} questions scored via ${evalSingle.engineLabel}`,
        },
        repeatCalls: {
          label: 'Repeat OCR & Grading Calls',
          totalUSD: studentsCount * (ocrSingle.costUSD * ocrRepeatPercent + evalSingle.costUSD * evaluationRepeatPercent) / 100,
          perStudentUSD: (ocrSingle.costUSD * ocrRepeatPercent + evalSingle.costUSD * evaluationRepeatPercent) / 100,
          details: `${ocrRepeatPercent}% additional OCR; ${evaluationRepeatPercent}% additional grading calls`,
        },
        cloudInfra: {
          label: 'AWS Cloud Storage, SQS & Notification Push',
          totalUSD: infraPerStudentUSD * studentsCount,
          perStudentUSD: infraPerStudentUSD,
          perStudentINR: this.usdToInr(infraPerStudentUSD, pricing.usdToInr),
          details: `S3 uploads, Lambda triggers, ${notificationLabel || 'SES Scorecard email / SMS'}`,
        },
      },
    };
  }

  /**
   * Master Calculation: Weighted Across All Subjects for Entire Institution
   */
  static calculateMasterInstitutionCost(params) {
    const {
      studentsCount = 350,
      participantsPerExam = 40,
      examsPerStudentPerMonth = 6,
      pagesPerPaper = 4,
      questionsPerPaper = 22,
      bulkSlicingMode = 'dynamic_ai',
      calibration22Percent = false,
      calibrationRatio = 0.22,
      visualDiagramMode = 'none',
      paperSourceMode = 'generated',
      questionPaperPages = 2,
      answerKeyPages = 0,
      regenerationsPerExam = 0,
      ocrRepeatPercent = 0,
      evaluationRepeatPercent = 0,
      chaptersPerMonth = 0,
      chunksPerChapter = 10,
      syllabusAnalysesPerMonth = 0,
      subjectWeights = {
        mathematics: 20,
        science: 25,
        social: 20,
        hindi_indic: 15,
        english: 20,
      },
      cloudArchitecture = 'multi_az',
      customFixedMonthlyUSD = null,
      notificationChannels = undefined,
      includeFixedCloudInfra = false,
      marginPercent = 70, // Target Gross Margin (70%)
      pricing = DEFAULT_PRICING,
    } = params;

    // Normalize weights so they sum to 100%
    const rawTotalWeight = Object.values(subjectWeights).reduce((a, b) => a + Number(b || 0), 0);
    if (rawTotalWeight <= 0) throw new RangeError('At least one subject must have a positive weight');
    if (!Number.isFinite(pricing.usdToInr) || pricing.usdToInr <= 0) throw new RangeError('Exchange rate must be positive');
    if (!Number.isInteger(studentsCount) || studentsCount < 1 || !Number.isInteger(participantsPerExam) || participantsPerExam < 1 || participantsPerExam > studentsCount) {
      throw new RangeError('Exam participants must be between 1 and the institution student count');
    }
    for (const [label, value] of Object.entries({ questionPaperPages, answerKeyPages, regenerationsPerExam, chaptersPerMonth, chunksPerChapter, syllabusAnalysesPerMonth })) {
      if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a nonnegative integer`);
    }
    for (const value of [ocrRepeatPercent, evaluationRepeatPercent, pricing.geminiEmbedding.costPer1M_USD]) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError('Repeat percentages and embedding rate must be nonnegative');
    }
    if (!['generated', 'uploaded'].includes(paperSourceMode)) throw new RangeError('Unknown paper source mode');
    const normalizedWeights = {};
    for (const [subKey, w] of Object.entries(subjectWeights)) {
      normalizedWeights[subKey] = Number(w || 0) / rawTotalWeight;
    }

    // Calculate individual cost for each subject
    const subjectResults = {};
    let blendedPaperCostUSD = 0;

    for (const subjectKey of Object.keys(SUBJECT_PROFILES)) {
      const weight = normalizedWeights[subjectKey] || 0;
      const res = this.calculateSubjectExamCost(
        subjectKey,
        {
          studentsCount: participantsPerExam,
          pagesPerStudent: pagesPerPaper,
          questionsCount: questionsPerPaper,
          bulkSlicingMode,
          calibration22Percent,
          calibrationRatio,
          visualDiagramMode,
          paperSourceMode,
          questionPaperPages,
          answerKeyPages,
          regenerationsPerExam,
          ocrRepeatPercent,
          evaluationRepeatPercent,
          notificationChannels,
        },
        pricing
      );

      subjectResults[subjectKey] = {
        ...res,
        weightPercent: Math.round(weight * 100),
        weightedPaperCostUSD: res.costPerStudentUSD * weight,
        weightedPaperCostINR: res.costPerStudentINR * weight,
      };

      blendedPaperCostUSD += res.costPerStudentUSD * weight;
    }

    const gradingPaperCostUSD = blendedPaperCostUSD;

    // Monthly & Annual Metrics per Student
    if (!Number.isFinite(examsPerStudentPerMonth) || examsPerStudentPerMonth < 0) throw new RangeError('Monthly exams cannot be negative');
    const monthlyExams = examsPerStudentPerMonth;
    const monthlyPapers = studentsCount * monthlyExams;
    const curriculum = this.calculateCurriculumIngestionCost(chaptersPerMonth, chunksPerChapter, syllabusAnalysesPerMonth, pricing);
    const sharedPerPaperUSD = monthlyPapers > 0 ? curriculum.costUSD / monthlyPapers : 0;
    blendedPaperCostUSD += sharedPerPaperUSD;

    // Calculate Fixed Cloud Infrastructure & Notification Bill
    const cloudInfrastructure = this.calculateCloudInfrastructureCost({
      studentsCount,
      examsPerStudentPerMonth: monthlyExams,
      cloudArchitecture,
      customFixedMonthlyUSD,
      notificationChannels,
    }, pricing);

    if (includeFixedCloudInfra) {
      const fixedPerPaperUSD = cloudInfrastructure.fixedBill.perPaperUSD;
      blendedPaperCostUSD += fixedPerPaperUSD;
    }

    const blendedPaperCostINR = this.usdToInr(blendedPaperCostUSD, pricing.usdToInr);
    let costPerStudentPerMonthUSD = gradingPaperCostUSD * monthlyExams + curriculum.costUSD / studentsCount;
    if (includeFixedCloudInfra) {
      costPerStudentPerMonthUSD += cloudInfrastructure.fixedBill.perStudentMonthUSD;
    }
    const costPerStudentPerMonthINR = blendedPaperCostINR * monthlyExams;

    const academicMonths = 10; // Standard school academic year length
    const costPerStudentPerYearUSD = costPerStudentPerMonthUSD * academicMonths;
    const costPerStudentPerYearINR = costPerStudentPerMonthINR * academicMonths;

    // Total Institution Costs (for entire student body)
    let totalCohortMonthlyCostUSD = costPerStudentPerMonthUSD * studentsCount;
    if (includeFixedCloudInfra) {
      // Numerical reconciliation
      totalCohortMonthlyCostUSD = (gradingPaperCostUSD * monthlyExams + curriculum.costUSD / studentsCount) * studentsCount + cloudInfrastructure.fixedBill.monthlyUSD;
    }
    const totalCohortMonthlyCostINR = totalCohortMonthlyCostUSD * pricing.usdToInr;
    const totalCohortAnnualCostUSD = totalCohortMonthlyCostUSD * academicMonths;
    const totalCohortAnnualCostINR = totalCohortMonthlyCostINR * academicMonths;

    // Consolidated Step Breakdown (weighted aggregate)
    const aggregatedSteps = {
      qpGeneration: { label: paperSourceMode === 'uploaded' ? 'Uploaded Question Paper OCR & Replacements' : 'Question Paper Generation & Replacements', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      answerKeyExtraction: { label: 'Uploaded Answer Key OCR', perStudentUSD: 0 },
      diagramGeneration: { label: 'Visual Diagram & Stimulus Generation', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      bulkSlicing: { label: 'Bulk Stack Slicing & Boundary Detection', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      ocrTranscription: { label: 'Stage 1: Handwritten OCR Transcription', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      calibrationPhase: { label: 'Optional Calibration Passes', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      rubricEvaluation: { label: 'Stage 2: Rubric Evaluation & Socratic Hints', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
      repeatCalls: { label: 'Repeat OCR & Grading Calls', perStudentUSD: 0 },
      chapterMetadata: { label: 'Chapter Metadata Extraction', perStudentUSD: sharedPerPaperUSD ? curriculum.metadataUSD / monthlyPapers : 0 },
      chapterEmbeddings: { label: 'Chapter Chunk Embeddings (verify endpoint)', perStudentUSD: sharedPerPaperUSD ? curriculum.embeddingUSD / monthlyPapers : 0 },
      syllabusAnalysis: { label: 'Syllabus Analysis', perStudentUSD: sharedPerPaperUSD ? curriculum.syllabusUSD / monthlyPapers : 0 },
      cloudInfra: { label: 'AWS Cloud Storage, SQS & Notifications', perStudentUSD: 0, perStudentINR: 0, percentage: 0 },
    };

    if (includeFixedCloudInfra) {
      aggregatedSteps.fixedCloudInfra = {
        label: `AWS Cloud Infrastructure ($${cloudInfrastructure.fixedBill.monthlyUSD.toFixed(2)}/mo Amortized)`,
        perStudentUSD: cloudInfrastructure.fixedBill.perPaperUSD,
        perStudentINR: cloudInfrastructure.fixedBill.perPaperINR,
        totalMonthlyUSD: cloudInfrastructure.fixedBill.monthlyUSD,
        totalMonthlyINR: cloudInfrastructure.fixedBill.monthlyINR,
        percentage: 0,
        details: `${cloudInfrastructure.isMultiAz ? 'Multi-AZ High Availability' : 'Single-AZ Cost-Optimized'} AWS stack ($${cloudInfrastructure.fixedBill.monthlyUSD.toFixed(2)}/mo) amortized across ${monthlyPapers.toLocaleString()} monthly papers`,
      };
    }

    for (const [subKey, sRes] of Object.entries(subjectResults)) {
      const weight = normalizedWeights[subKey] || 0;
      for (const [stepKey, stepData] of Object.entries(sRes.steps)) {
        if (aggregatedSteps[stepKey] && !['chapterMetadata', 'chapterEmbeddings', 'syllabusAnalysis', 'fixedCloudInfra'].includes(stepKey)) {
          aggregatedSteps[stepKey].perStudentUSD += stepData.perStudentUSD * weight;
        }
      }
    }

    for (const stepKey of Object.keys(aggregatedSteps)) {
      const step = aggregatedSteps[stepKey];
      step.perStudentINR = this.usdToInr(step.perStudentUSD, pricing.usdToInr);
      if (stepKey !== 'fixedCloudInfra') {
        step.totalMonthlyUSD = step.perStudentUSD * monthlyExams * studentsCount;
      }
      if (stepKey === 'chapterMetadata') step.totalMonthlyUSD = curriculum.metadataUSD;
      if (stepKey === 'chapterEmbeddings') step.totalMonthlyUSD = curriculum.embeddingUSD;
      if (stepKey === 'syllabusAnalysis') step.totalMonthlyUSD = curriculum.syllabusUSD;
      step.totalMonthlyINR = step.totalMonthlyUSD * pricing.usdToInr;
      step.percentage = blendedPaperCostUSD > 0 ? Math.round((step.perStudentUSD / blendedPaperCostUSD) * 100) : 0;
    }

    // Pricing & Margin Recommendations
    const marginDec = Math.min(0.95, Math.max(0.1, marginPercent / 100));
    // Suggested B2B price formula: Price = COGS / (1 - Margin)
    const suggestedPricePerStudentMonthUSD = costPerStudentPerMonthUSD / (1 - marginDec);
    const suggestedPricePerStudentMonthINR = costPerStudentPerMonthINR / (1 - marginDec);

    const profitPerStudentMonthUSD = suggestedPricePerStudentMonthUSD - costPerStudentPerMonthUSD;
    const profitPerStudentMonthINR = suggestedPricePerStudentMonthINR - costPerStudentPerMonthINR;

    const totalMonthlyRevenueUSD = suggestedPricePerStudentMonthUSD * studentsCount;
    const totalMonthlyRevenueINR = suggestedPricePerStudentMonthINR * studentsCount;
    const totalMonthlyProfitUSD = profitPerStudentMonthUSD * studentsCount;
    const totalMonthlyProfitINR = profitPerStudentMonthINR * studentsCount;

    const pricingTiers = [50, 70, 85].map((targetMargin) => {
      const pricePerStudentMonthINR = Math.ceil(costPerStudentPerMonthINR / (1 - targetMargin / 100));
      const pricePerStudentMonthUSD = Math.ceil(costPerStudentPerMonthUSD / (1 - targetMargin / 100) * 100) / 100;
      return {
        name: `${targetMargin}% Target`,
        marginPercent: targetMargin,
        pricePerStudentMonthINR,
        pricePerStudentMonthUSD,
        annualContractINR: pricePerStudentMonthINR * studentsCount * academicMonths,
        annualContractUSD: pricePerStudentMonthUSD * studentsCount * academicMonths,
        isRecommended: targetMargin === 70,
        description: 'Same modeled workflow; price varies by target pipeline-cost margin.',
      };
    });

    return {
      inputs: {
        studentsCount,
        participantsPerExam,
        examsPerStudentPerMonth,
        pagesPerPaper,
        questionsPerPaper,
        bulkSlicingMode,
        calibration22Percent,
        calibrationRatio,
        visualDiagramMode,
        paperSourceMode, questionPaperPages, answerKeyPages, regenerationsPerExam,
        ocrRepeatPercent, evaluationRepeatPercent, chaptersPerMonth, chunksPerChapter, syllabusAnalysesPerMonth,
        subjectWeights,
        marginPercent,
        cloudArchitecture,
        customFixedMonthlyUSD,
        notificationChannels,
        includeFixedCloudInfra: Boolean(includeFixedCloudInfra),
      },
      perStudent: {
        perPaperUSD: blendedPaperCostUSD,
        perPaperINR: blendedPaperCostINR,
        perMonthUSD: costPerStudentPerMonthUSD,
        perMonthINR: costPerStudentPerMonthINR,
        perYearUSD: costPerStudentPerYearUSD,
        perYearINR: costPerStudentPerYearINR,
      },
      cohortTotal: {
        studentsCount,
        monthlyExamsTotal: studentsCount * monthlyExams,
        monthlyCostUSD: totalCohortMonthlyCostUSD,
        monthlyCostINR: totalCohortMonthlyCostINR,
        monthlyAiCostUSD: totalCohortMonthlyCostUSD - aggregatedSteps.cloudInfra.totalMonthlyUSD - (aggregatedSteps.fixedCloudInfra?.totalMonthlyUSD || 0),
        monthlyAiCostINR: totalCohortMonthlyCostINR - aggregatedSteps.cloudInfra.totalMonthlyINR - (aggregatedSteps.fixedCloudInfra?.totalMonthlyINR || 0),
        monthlyVariableInfraUSD: aggregatedSteps.cloudInfra.totalMonthlyUSD,
        monthlyVariableInfraINR: aggregatedSteps.cloudInfra.totalMonthlyINR,
        monthlyFixedInfraUSD: cloudInfrastructure.fixedBill.monthlyUSD,
        monthlyFixedInfraINR: cloudInfrastructure.fixedBill.monthlyINR,
        annualCostUSD: totalCohortAnnualCostUSD,
        annualCostINR: totalCohortAnnualCostINR,
      },
      cloudInfrastructure,
      allInclusiveTotals: {
        perPaperUSD: blendedPaperCostUSD + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.perPaperUSD),
        perPaperINR: blendedPaperCostINR + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.perPaperINR),
        perStudentMonthUSD: costPerStudentPerMonthUSD + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.perStudentMonthUSD),
        perStudentMonthINR: costPerStudentPerMonthINR + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.perStudentMonthINR),
        monthlyCohortUSD: totalCohortMonthlyCostUSD + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.monthlyUSD),
        monthlyCohortINR: totalCohortMonthlyCostINR + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.monthlyINR),
        annualCohortUSD: totalCohortAnnualCostUSD + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.monthlyUSD * academicMonths),
        annualCohortINR: totalCohortAnnualCostINR + (includeFixedCloudInfra ? 0 : cloudInfrastructure.fixedBill.monthlyINR * academicMonths),
      },
      pricingRecommendation: {
        marginPercent,
        suggestedPricePerStudentMonthUSD,
        suggestedPricePerStudentMonthINR,
        profitPerStudentMonthUSD,
        profitPerStudentMonthINR,
        totalMonthlyRevenueUSD,
        totalMonthlyRevenueINR,
        totalMonthlyProfitUSD,
        totalMonthlyProfitINR,
        annualRevenueINR: totalMonthlyRevenueINR * academicMonths,
        annualProfitINR: totalMonthlyProfitINR * academicMonths,
        pricingTiers,
      },
      stepsBreakdown: aggregatedSteps,
      subjectBreakdown: subjectResults,
    };
  }
}
