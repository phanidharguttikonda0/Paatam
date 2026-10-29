/**
 * Paatam AI Cost Engine - Data Definitions, Pricing Catalogs, and Presets
 * Planning assumptions; backend model routing and measured usage require confirmation.
 * - PaperGeneratorService (Question Paper Generation, Diagram/Image Generation)
 * - StudentBoundaryService (Multi-page stack slicing, 8-page Vision batches)
 * - OcrService (Handwritten student answer sheet transcription)
 * - EvaluationService (one rubric evaluation; optional extra calibration scenario)
 */

export const DEFAULT_PRICING = {
  usdToInr: 86.50,

  // Gemini 3.6 Flash planning scenario; verify deployed model and assignment routing.
  // Standard Rates: $0.75 / 1M input tokens, $3.75 / 1M output tokens (including thinking tokens)
  geminiFlash: {
    name: 'Gemini 3.6 Flash',
    inputPer1M: 0.75,
    outputPer1M: 3.75,
    pdfPageTokens: 258,
    imageTokensPerPage: 258,
    thinkingTokensPerEvaluation: 500,
  },

  // Gemini 2.5 Flash paid standard rate for comparison
  gemini25Flash: {
    name: 'Gemini 2.5 Flash',
    inputPer1M: 0.30,
    outputPer1M: 2.50,
  },

  // Gemini 3.1 Flash Lite Image / Imagen (Visual Diagram & Stimulus Generation)
  geminiImageGen: {
    name: 'Gemini 3.1 Flash Lite Image (1K)',
    costPerImageUSD: 0.0336,
  },

  // Gemini Vector SVG Code Fallback (100x Cheaper than Raster Image)
  svgDiagramCost: {
    name: 'Gemini Vector SVG Code Diagram',
    avgOutputTokens: 850, // ~850 tokens * $3.75/1M = ~$0.00318 (~₹0.27)
  },

  // Backend text-embedding-004 endpoint is retired; set a verified replacement rate before estimating embedding spend.
  geminiEmbedding: {
    name: 'Embedding (unverified endpoint)',
    costPer1M_USD: 0,
  },

  // Sarvam AI Indic Suite (sarvam.service.ts for Hindi, Telugu, and Regional Languages)
  sarvamDocAI: {
    name: 'Sarvam Document AI (Digitise)',
    costPerPageINR: 0.50,
  },

  sarvamChat105b: {
    name: 'Sarvam 105B Indic Chat',
    inputPer1M_INR: 15.0,
    outputPer1M_INR: 60.0,
  },

  // Multi-Channel Notifications (User Specification: SMS - 60 Paisa, Email - 30 Paisa, WhatsApp - 1 Rs)
  notifications: {
    smsINR: 0.60,          // 60 Paisa per SMS (₹0.60)
    emailINR: 0.30,        // 30 Paisa per Email (₹0.30)
    whatsappINR: 1.00,     // 1 Rupee per WhatsApp message (₹1.00)
    // Legacy / alias references for compatibility
    whatsappWahaINR: 0.00,
    twilioSmsINR: 0.60,
    awsSesEmailINR: 0.30,
  },

  // AWS Infrastructure Variable & Fixed Overhead (ap-south-2 Hyderabad)
  // Sized for 250 Concurrent Users (5,000 Students + 1,000 Staff)
  // High-Availability Multi-AZ Production Stack ($346.67 / month ~ ₹29,987 / month)
  // Cost-Optimized Single-AZ Alternative ($248.11 / month ~ ₹21,462 / month)
  cloudInfra: {
    s3StoragePerPaperUSD: 0.00020, // S3 raw + processed page storage
    sqsLambdaPerPaperUSD: 0.00008, // SQS messages + Lambda execution (1024MB, 20s)
    notificationPerPaperUSD: 0.00000, // Calculated dynamically from selected notification channels
    fixedMonthlyInfraUSD: 346.67,  // $346.67 / month High-Availability Multi-AZ Production AWS Bill (250 Concurrent Users)
    fixedMonthlyInfraINR: 29986.96, // @ 86.50
    costOptimizedInfraUSD: 248.11, // Architecture B Single-AZ option ($248.11 / mo for 250 Concurrent Users)
    costOptimizedInfraINR: 21461.52,
    components: {
      waf: 10.80,          // AWS WAF (Web ACL + AWS Managed + 3 Custom Rules + Traffic)
      natGateways: 81.54,  // 2x NAT Gateways (1 per AZ)
      elasticIps: 7.30,    // 2x Elastic IPs for NAT Gateways
      alb: 22.27,          // Application Load Balancer + 1 LCU
      ecsFargate: 72.08,   // 2x ECS Fargate containers (1 vCPU, 2 GB RAM across 2 AZs)
      rdsProxy: 21.90,     // RDS Proxy connection pooler (80% pool = 360 conns)
      rdsPostgres: 115.28, // Multi-AZ RDS PostgreSQL (db.t4g.medium, 2 vCPU, 4 GB, 100 GB gp3 - 100% in-memory cache)
      cloudwatch: 7.50,    // CloudWatch logs & alarms
      ecr: 0.50,           // ECR container repository
      serverlessPipeline: 7.50, // SQS ($0.50) + Lambda ($3.00) + S3 ($3.00) + SES ($1.00)
    },
  },
};

/**
 * Subject Profiles with Real-World Academic & Token Characteristics
 */
export const SUBJECT_PROFILES = {
  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '📐',
    category: 'STEM',
    badge: 'Formulas & LaTeX Proofs',
    badgeClass: 'badge-blue',
    description: 'Dense math formulas, equations, step-by-step proofs, and geometry diagrams.',
    hasFormulas: true,
    formulaDensity: 'High (LaTeX, derivations, integrals)',
    avgDiagramsPerExam: 3, // Coordinate graphs, triangles, circle geometry
    defaultPagesPerStudent: 4,
    defaultQuestionsCount: 22,
    ocrEngine: 'gemini_vision',
    evalEngine: 'gemini_flash',
    evalModelName: 'Gemini 3.6 Flash',
    ocrTokensPerPage: { input: 678, output: 520 }, // prompt + image -> transcribed LaTeX
    evalTokensPerStudent: { input: 4800, output: 1400 },
    defaultWeightPercent: 20,
    preferredVisualType: 'svg', // Geometric figures generated cleanly in SVG
  },

  science: {
    id: 'science',
    name: 'Science (Physics, Chem, Bio)',
    icon: '🔬',
    category: 'STEM & Visuals',
    badge: 'Heavy Diagrams & Reactions',
    badgeClass: 'badge-purple',
    description: 'Anatomical diagrams, circuits, ray optics, and chemical equations. High diagram density in exams and student drawings.',
    hasFormulas: true,
    formulaDensity: 'Medium-High (Chemical balancing, Physics formulas)',
    avgDiagramsPerExam: 5, // Circuit diagrams, optics, human organs, plant cells
    defaultPagesPerStudent: 4,
    defaultQuestionsCount: 25,
    ocrEngine: 'gemini_vision',
    evalEngine: 'gemini_flash',
    evalModelName: 'Gemini 3.6 Flash',
    ocrTokensPerPage: { input: 710, output: 560 }, // diagram annotation tags [Diagram: ...]
    evalTokensPerStudent: { input: 5200, output: 1550 },
    defaultWeightPercent: 25,
    preferredVisualType: 'ai_image', // High fidelity raster images for biology/physics
  },

  social: {
    id: 'social',
    name: 'Social Studies (Hist, Geo, Civics)',
    icon: '🌍',
    category: 'Humanities & Maps',
    badge: 'Maps, Timelines & Essays',
    badgeClass: 'badge-amber',
    description: 'Long descriptive essay answers, historical timelines, map-pointing questions, and civics case studies.',
    hasFormulas: false,
    formulaDensity: 'None',
    avgDiagramsPerExam: 3, // Maps, flowcharts, timelines
    defaultPagesPerStudent: 4,
    defaultQuestionsCount: 20,
    ocrEngine: 'gemini_vision',
    evalEngine: 'gemini_flash',
    evalModelName: 'Gemini 3.6 Flash',
    ocrTokensPerPage: { input: 640, output: 650 }, // Dense handwritten paragraphs
    evalTokensPerStudent: { input: 4200, output: 1250 },
    defaultWeightPercent: 20,
    preferredVisualType: 'svg',
  },

  hindi_indic: {
    id: 'hindi_indic',
    name: 'Hindi / Telugu (Indic Regional)',
    icon: '🇮🇳',
    category: 'Indic Script AI',
    badge: 'Sarvam DocAI & Sarvam 105B',
    badgeClass: 'badge-emerald',
    description: 'Devanagari Hindi, Telugu, or regional Indian language scripts processed via dedicated Sarvam Document AI OCR and Indic LLM.',
    hasFormulas: false,
    formulaDensity: 'None',
    avgDiagramsPerExam: 1, // Reading comprehension stimulus picture
    defaultPagesPerStudent: 3,
    defaultQuestionsCount: 18,
    ocrEngine: 'sarvam_doc_ai', // Route to Sarvam DocAI per page
    evalEngine: 'sarvam_105b', // Sarvam 105B Indic LLM
    evalModelName: 'Sarvam DocAI + 105B',
    ocrTokensPerPage: { input: 600, output: 500 },
    evalTokensPerStudent: { input: 3900, output: 1100 },
    defaultWeightPercent: 15,
    preferredVisualType: 'svg',
  },

  english: {
    id: 'english',
    name: 'English Language & Literature',
    icon: '📖',
    category: 'Languages',
    badge: 'Comprehension Stems & Grammar',
    badgeClass: 'badge-indigo',
    description: 'Reading comprehension stems, grammar rubrics, formal letter formatting, and vocabulary evaluations.',
    hasFormulas: false,
    formulaDensity: 'None',
    avgDiagramsPerExam: 1,
    defaultPagesPerStudent: 3,
    defaultQuestionsCount: 20,
    ocrEngine: 'gemini_vision',
    evalEngine: 'gemini_flash',
    evalModelName: 'Gemini 3.6 Flash',
    ocrTokensPerPage: { input: 620, output: 580 },
    evalTokensPerStudent: { input: 4100, output: 1200 },
    defaultWeightPercent: 20,
    preferredVisualType: 'svg',
  },
};

/**
 * Standard Institutional Scenarios / Presets
 */
export const PRESETS = {
  single_class: {
    id: 'single_class',
    title: 'Single Classroom',
    subtitle: '1 Section • 40 Students • Weekly Assessments',
    icon: '🏫',
    studentsCount: 40,
    examsPerStudentPerMonth: 4,
    pagesPerPaper: 3,
    questionsPerPaper: 20,
    bulkSlicingMode: 'dynamic_ai',
    calibration22Percent: false,
    calibrationRatio: 0.22,
    visualDiagramMode: 'none',
  },

  medium_school: {
    id: 'medium_school',
    title: 'Mid-Sized School',
    subtitle: 'Grades 6-10 • 350 Students • Bi-Weekly Exams',
    icon: '🎓',
    studentsCount: 350,
    examsPerStudentPerMonth: 6,
    pagesPerPaper: 4,
    questionsPerPaper: 22,
    bulkSlicingMode: 'dynamic_ai',
    calibration22Percent: false,
    calibrationRatio: 0.22,
    visualDiagramMode: 'none',
  },

  large_institution: {
    id: 'large_institution',
    title: 'Large School Campus',
    subtitle: 'Grades 1-12 • 1,200 Students • High Frequency',
    icon: '🏛️',
    studentsCount: 1200,
    examsPerStudentPerMonth: 8,
    pagesPerPaper: 4,
    questionsPerPaper: 25,
    bulkSlicingMode: 'dynamic_ai',
    calibration22Percent: false,
    calibrationRatio: 0.22,
    visualDiagramMode: 'none',
  },

  state_group: {
    id: 'state_group',
    title: 'School Chain / Group',
    subtitle: '5+ Campuses • 5,000 Students • Enterprise Bulk',
    icon: '🌐',
    studentsCount: 5000,
    examsPerStudentPerMonth: 8,
    pagesPerPaper: 4,
    questionsPerPaper: 25,
    bulkSlicingMode: 'dynamic_ai',
    calibration22Percent: false,
    calibrationRatio: 0.22,
    visualDiagramMode: 'none',
  },
};
