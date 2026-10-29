/**
 * Paatam AI Cost Engine - Frontend Application Controller
 * Handles reactivity, state management, SVG charts, preset profiles, and CSV export.
 */

import { DEFAULT_PRICING, SUBJECT_PROFILES, PRESETS } from './data.js';
import { CostEngine } from './costEngine.js';

// Application State
const state = {
  currency: 'INR', // 'INR' or 'USD'
  theme: 'dark',
  activeTab: 'tabSteps',
  pricing: JSON.parse(JSON.stringify(DEFAULT_PRICING)),

  // Institutional Parameters
  studentsCount: 350,
  participantsPerExam: 40,
  examsPerStudentPerMonth: 6,
  pagesPerPaper: 4,
  questionsPerPaper: 22,

  // Cloud Infrastructure & Parent Notifications (250 Concurrent Users)
  cloudArchitecture: 'multi_az', // 'multi_az' ($346.67) or 'single_az' ($248.11)
  notificationChannels: {
    whatsapp: true, // 1 Rs (₹1.00)
    sms: false,     // 60 Paisa (₹0.60)
    email: false,   // 30 Paisa (₹0.30)
  },
  includeFixedCloudInfra: false,

  // Workflow Options
  bulkSlicingMode: 'dynamic_ai', // 'dynamic_ai' | 'fixed'
  calibration22Percent: false,
  calibrationRatio: 0.22,
  visualDiagramMode: 'none', // 'none' | 'svg' | 'mixed' | 'ai_image'
  paperSourceMode: 'generated',
  questionPaperPages: 2,
  answerKeyPages: 0,
  regenerationsPerExam: 0,
  ocrRepeatPercent: 0,
  evaluationRepeatPercent: 0,
  chaptersPerMonth: 0,
  chunksPerChapter: 10,
  syllabusAnalysesPerMonth: 0,

  // Subject Weights (percentages)
  subjectWeights: {
    mathematics: 20,
    science: 25,
    social: 20,
    hindi_indic: 15,
    english: 20,
  },

  // Margin
  marginPercent: 70,
};

// Colors for Pipeline Steps Donut Chart
const STEP_COLORS = {
  qpGeneration: '#6366F1', // Indigo
  answerKeyExtraction: '#E11D48',
  diagramGeneration: '#A855F7', // Purple
  bulkSlicing: '#0EA5E9', // Sky
  ocrTranscription: '#F59E0B', // Amber
  calibrationPhase: '#EC4899', // Pink
  rubricEvaluation: '#10B981', // Emerald
  repeatCalls: '#D97706',
  chapterMetadata: '#0891B2',
  chapterEmbeddings: '#14B8A6',
  syllabusAnalysis: '#84CC16',
  cloudInfra: '#64748B', // Slate
  fixedCloudInfra: '#3B82F6', // Blue (AWS Cloud Bill)
};

/**
 * Format currency amounts nicely based on active currency
 */
function formatCurrency(amountUSD, amountINR, decimalPlaces = 2) {
  if (state.currency === 'INR') {
    const formatted = Number(amountINR).toLocaleString('en-IN', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
    return `₹${formatted}`;
  } else {
    const formatted = Number(amountUSD).toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
    return `$${formatted}`;
  }
}

/**
 * Main Recalculate and Render Routine
 */
function calculationInputs() {
  return {
    studentsCount: state.studentsCount,
    participantsPerExam: state.participantsPerExam,
    examsPerStudentPerMonth: state.examsPerStudentPerMonth,
    pagesPerPaper: state.pagesPerPaper,
    questionsPerPaper: state.questionsPerPaper,
    bulkSlicingMode: state.bulkSlicingMode,
    calibration22Percent: state.calibration22Percent,
    calibrationRatio: state.calibrationRatio,
    visualDiagramMode: state.visualDiagramMode,
    paperSourceMode: state.paperSourceMode,
    questionPaperPages: state.questionPaperPages,
    answerKeyPages: state.answerKeyPages,
    regenerationsPerExam: state.regenerationsPerExam,
    ocrRepeatPercent: state.ocrRepeatPercent,
    evaluationRepeatPercent: state.evaluationRepeatPercent,
    chaptersPerMonth: state.chaptersPerMonth,
    chunksPerChapter: state.chunksPerChapter,
    syllabusAnalysesPerMonth: state.syllabusAnalysesPerMonth,
    subjectWeights: state.subjectWeights,
    marginPercent: state.marginPercent,
    cloudArchitecture: state.cloudArchitecture,
    notificationChannels: state.notificationChannels,
    includeFixedCloudInfra: state.includeFixedCloudInfra,
    pricing: state.pricing,
  };
}

function recalculateAndRender() {
  const result = CostEngine.calculateMasterInstitutionCost(calculationInputs());

  renderKpiRibbon(result);
  renderStepsTableAndChart(result);
  renderCloudTab(result);
  renderSubjectCards(result);
  renderCalibrationTab(result);
  renderPricingTiers(result);
}

/**
 * Render Top KPI Ribbon
 */
function renderKpiRibbon(result) {
  const symbol = state.currency === 'INR' ? '₹' : '$';
  const isINR = state.currency === 'INR';

  // Cost Per Paper
  const paperCost = isINR ? result.perStudent.perPaperINR : result.perStudent.perPaperUSD;
  document.getElementById('kpiCostPerPaper').innerHTML = `
    <span class="currency-symbol">${symbol}</span>
    <span class="number-val">${paperCost.toFixed(2)}</span>
  `;
  document.getElementById('kpiCostPerPaperSub').textContent = state.includeFixedCloudInfra
    ? 'All-inclusive: AI + Notifications + Amortized $406 Cloud Bill'
    : `AI & variable pipeline; +${formatCurrency(result.cloudInfrastructure.fixedBill.perPaperUSD, result.cloudInfrastructure.fixedBill.perPaperINR)}/paper fixed AWS`;

  // Cost Per Month
  const monthCost = isINR ? result.perStudent.perMonthINR : result.perStudent.perMonthUSD;
  const yearCost = isINR ? result.perStudent.perYearINR : result.perStudent.perYearUSD;
  document.getElementById('kpiCostPerMonth').innerHTML = `
    <span class="currency-symbol">${symbol}</span>
    <span class="number-val">${monthCost.toFixed(2)}</span>
  `;
  document.getElementById('kpiCostPerYearSub').textContent =
    `Annual: ${symbol}${Math.round(yearCost).toLocaleString()} / student (10 mo)`;
  document.getElementById('kpiExamsPerMonthBadge').textContent =
    `${state.examsPerStudentPerMonth} Exams/Mo`;

  // Total Cohort AI Cost
  const cohortCost = isINR ? result.cohortTotal.monthlyAiCostINR : result.cohortTotal.monthlyAiCostUSD;
  document.getElementById('kpiTotalCohortCost').innerHTML = `
    <span class="currency-symbol">${symbol}</span>
    <span class="number-val">${Math.round(cohortCost).toLocaleString()}</span>
  `;
  document.getElementById('kpiTotalCohortSub').textContent =
    `${(state.studentsCount * state.examsPerStudentPerMonth).toLocaleString()} papers; plus ${formatCurrency(result.cohortTotal.monthlyFixedInfraUSD, result.cohortTotal.monthlyFixedInfraINR)} fixed AWS bill`;

  // Recommended Price
  const recPrice = isINR
    ? result.pricingRecommendation.suggestedPricePerStudentMonthINR
    : result.pricingRecommendation.suggestedPricePerStudentMonthUSD;
  const profitPerSt = isINR
    ? result.pricingRecommendation.profitPerStudentMonthINR
    : result.pricingRecommendation.profitPerStudentMonthUSD;

  document.getElementById('kpiRecommendedPrice').innerHTML = `
    <span class="currency-symbol">${symbol}</span>
    <span class="number-val">${recPrice.toFixed(2)}</span>
  `;
  document.getElementById('kpiMarginBadge').textContent = `${state.marginPercent}% Margin`;
  document.getElementById('kpiRecommendedPriceSub').textContent =
    `Per student / month • Pipeline spread: ${symbol}${profitPerSt.toFixed(1)}/st`;

  // Total monthly pipeline spread
  const totalProfit = isINR
    ? result.pricingRecommendation.totalMonthlyProfitINR
    : result.pricingRecommendation.totalMonthlyProfitUSD;
  const annualProfit = isINR
    ? result.pricingRecommendation.annualProfitINR
    : result.pricingRecommendation.annualProfitINR / state.pricing.usdToInr;

  document.getElementById('kpiTotalProfit').innerHTML = `
    <span class="currency-symbol">${symbol}</span>
    <span class="number-val">${Math.round(totalProfit).toLocaleString()}</span>
  `;
  const annualLabel = isINR && annualProfit >= 100000
    ? `${(annualProfit / 100000).toFixed(2)} Lakhs`
    : `${symbol}${Math.round(annualProfit).toLocaleString()}`;
  document.getElementById('kpiAnnualProfitSub').textContent = `Annual pipeline spread: ${annualLabel}`;
}

/**
 * Render Steps Breakdown Table & SVG Donut Chart
 */
function renderStepsTableAndChart(result) {
  const tbody = document.getElementById('stepsTableBody');
  const legendList = document.getElementById('chartLegendList');
  const donutSvg = document.getElementById('stepsDonutChart');

  tbody.innerHTML = '';
  legendList.innerHTML = '';

  const steps = result.stepsBreakdown;
  const stepKeys = Object.keys(steps);

  let cumulativePercent = 0;
  const svgSegments = [];

  const isINR = state.currency === 'INR';
  const paperTotal = isINR ? result.perStudent.perPaperINR : result.perStudent.perPaperUSD;
  document.getElementById('chartTotalBadge').textContent =
    `${formatCurrency(result.perStudent.perPaperUSD, result.perStudent.perPaperINR)} / Paper`;

  stepKeys.forEach((key, index) => {
    const step = steps[key];
    const color = STEP_COLORS[key] || '#6366F1';
    const percent = step.percentage || 0;

    // Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="step-label-cell">
          <span class="step-index-pill" style="background: ${color}20; color: ${color};">${index + 1}</span>
          <span style="font-weight: 600;">${step.label}</span>
        </div>
      </td>
      <td>
        <div class="percentage-bar-wrapper">
          <div class="percentage-progress" style="width: ${Math.max(4, percent)}%; background: ${color};"></div>
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${percent}%</span>
        </div>
      </td>
      <td class="cost-figure">
        ${formatCurrency(step.perStudentUSD, step.perStudentINR, 3)}
      </td>
      <td class="cost-figure" style="color: var(--text-secondary);">
        ${formatCurrency(step.totalMonthlyUSD, step.totalMonthlyINR, 0)}
      </td>
      <td style="font-size: 0.75rem; color: var(--text-muted);">
        ${step.details || ''}
      </td>
    `;
    tbody.appendChild(tr);

    // Chart Legend Item
    const legendItem = document.createElement('div');
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    legendItem.style.gap = '0.5rem';
    legendItem.innerHTML = `
      <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
      <span style="flex: 1; color: var(--text-secondary);">${step.label}</span>
      <strong style="color: var(--text-primary); font-family: var(--font-mono);">${percent}%</strong>
    `;
    legendList.appendChild(legendItem);

    // Donut SVG segment calculations (stroke-dasharray based on circumference = 100)
    if (percent > 0) {
      const strokeDash = `${percent} ${100 - percent}`;
      const strokeOffset = 100 - cumulativePercent + 25; // start from top (25% offset)
      svgSegments.push(`
        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent"
          stroke="${color}" stroke-width="4.5"
          stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}">
        </circle>
      `);
      cumulativePercent += percent;
    }
  });

  // Inner center text for donut chart
  const centerText = `
    <text x="21" y="19" text-anchor="middle" font-size="3.2" font-weight="700" fill="currentColor">
      ${isINR ? '₹' : '$'}${paperTotal.toFixed(2)}
    </text>
    <text x="21" y="24" text-anchor="middle" font-size="1.9" fill="var(--text-muted)">
      per paper
    </text>
  `;

  donutSvg.innerHTML = svgSegments.join('') + centerText;
}

/**
 * Render Subject Cards Matrix
 */
function renderSubjectCards(result) {
  const container = document.getElementById('subjectCardsGrid');
  container.innerHTML = '';

  const subjects = result.subjectBreakdown;

  for (const [subKey, sData] of Object.entries(subjects)) {
    const prof = sData.profile;
    const card = document.createElement('div');
    card.className = 'subject-cost-card';

    const cardHtml = `
      <div class="subject-card-header">
        <div class="subject-card-title">
          <span style="font-size: 1.25rem;">${prof.icon}</span>
          <span>${prof.name}</span>
        </div>
        <span class="feature-tag accent" style="font-weight: 700;">
          ${sData.weightPercent}% Mix
        </span>
      </div>

      <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem; min-height: 2.4rem;">
        ${prof.description}
      </p>

      <div class="subject-feature-tags">
        <span class="feature-tag">${prof.category}</span>
        <span class="feature-tag ${prof.hasFormulas ? 'accent' : ''}">
          ${prof.hasFormulas ? '📐 Heavy LaTeX' : '📝 Standard Text'}
        </span>
        <span class="feature-tag">${prof.avgDiagramsPerExam} Diagrams / Exam</span>
        <span class="feature-tag" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-purple); border-color: rgba(168, 85, 247, 0.25);">
          Eval: ${prof.evalModelName}
        </span>
      </div>

      <div class="subject-pricing-row">
        <div>
          <span class="subject-rate-label">Exam pipeline / paper (excludes monthly curriculum ingestion)</span>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${state.pagesPerPaper} pages • ${state.questionsPerPaper} Qs</div>
        </div>
        <div class="subject-rate-value">
          ${formatCurrency(sData.costPerStudentUSD, sData.costPerStudentINR, 2)}
        </div>
      </div>
    `;

    card.innerHTML = cardHtml;
    container.appendChild(card);
  }
}

/**
 * Render AWS Cloud Production Bill & Notifications Tab
 */
function renderCloudTab(result) {
  const isINR = state.currency === 'INR';
  const symbol = isINR ? '₹' : '$';
  const cloud = result.cloudInfrastructure;
  const fixed = cloud.fixedBill;
  const notifs = cloud.notifications;

  // Header badge
  const headerBadge = document.getElementById('cloudBillHeaderBadge');
  if (headerBadge) {
    headerBadge.textContent = `${formatCurrency(fixed.monthlyUSD, fixed.monthlyINR, 2)} / mo • ${cloud.isMultiAz ? 'Multi-AZ' : 'Single-AZ'}`;
  }
  const hostingSub = document.getElementById('cloudHostingSubtitle');
  if (hostingSub) {
    hostingSub.textContent = `AWS ${formatCurrency(fixed.monthlyUSD, fixed.monthlyINR, 0)}/mo Bill`;
  }

  // KPI Cards
  const cardMonthly = document.getElementById('cardCloudMonthlyBill');
  if (cardMonthly) {
    cardMonthly.innerHTML = `
      <span class="currency-symbol">${symbol}</span>
      <span class="number-val">${isINR ? Math.round(fixed.monthlyINR).toLocaleString() : fixed.monthlyUSD.toFixed(2)}</span>
    `;
  }
  const cardMonthlySub = document.getElementById('cardCloudMonthlyBillSub');
  if (cardMonthlySub) {
    cardMonthlySub.textContent = `${formatCurrency(fixed.monthlyUSD, fixed.monthlyINR, 0)} / mo • ${cloud.isMultiAz ? 'Multi-AZ High Availability' : 'Single-AZ Cost-Optimized'}`;
  }

  const cardPerStudent = document.getElementById('cardCloudPerStudent');
  if (cardPerStudent) {
    cardPerStudent.innerHTML = `
      <span class="currency-symbol">${symbol}</span>
      <span class="number-val">${(isINR ? fixed.perStudentMonthINR : fixed.perStudentMonthUSD).toFixed(2)}</span>
    `;
  }
  const cardPerStudentSub = document.getElementById('cardCloudPerStudentSub');
  if (cardPerStudentSub) {
    cardPerStudentSub.textContent = `Amortized across ${state.studentsCount.toLocaleString()} active students`;
  }

  const cardPerPaper = document.getElementById('cardCloudPerPaper');
  if (cardPerPaper) {
    cardPerPaper.innerHTML = `
      <span class="currency-symbol">${symbol}</span>
      <span class="number-val">${(isINR ? fixed.perPaperINR : fixed.perPaperUSD).toFixed(2)}</span>
    `;
  }
  const cardPerPaperSub = document.getElementById('cardCloudPerPaperSub');
  if (cardPerPaperSub) {
    cardPerPaperSub.textContent = `Amortized across ${(state.studentsCount * state.examsPerStudentPerMonth).toLocaleString()} monthly papers`;
  }

  const cardNotif = document.getElementById('cardNotifPerPaper');
  if (cardNotif) {
    cardNotif.innerHTML = `
      <span class="currency-symbol">${symbol}</span>
      <span class="number-val">${(isINR ? notifs.perPaperINR : notifs.perPaperUSD).toFixed(2)}</span>
    `;
  }
  const activeNames = notifs.activeChannels.map((c) => c.name).join(' + ');
  const cardNotifSub = document.getElementById('cardNotifPerPaperSub');
  if (cardNotifSub) {
    cardNotifSub.textContent = activeNames || 'In-App Only (₹0.00)';
  }

  // Left panel notification pill
  const pillNotif = document.getElementById('valTotalNotificationCost');
  if (pillNotif) {
    pillNotif.textContent = `${formatCurrency(notifs.perPaperUSD, notifs.perPaperINR, 2)} / Paper`;
  }

  // Table tag
  const tableArchTag = document.getElementById('cloudTableArchTag');
  if (tableArchTag) {
    tableArchTag.textContent = cloud.isMultiAz ? 'Multi-AZ Enterprise Stack (2 AZs)' : 'Single-AZ Cost-Optimized Stack (1 AZ)';
  }

  // Populate AWS Components Table
  const compTbody = document.getElementById('cloudComponentsTableBody');
  if (compTbody) {
    compTbody.innerHTML = '';
    for (const [key, comp] of Object.entries(fixed.components)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${comp.name}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${comp.details}</div>
        </td>
        <td><span class="feature-tag">${comp.category}</span></td>
        <td class="cost-figure">${formatCurrency(comp.monthlyUSD, comp.monthlyINR, 2)}</td>
        <td class="cost-figure" style="color: var(--text-secondary);">${formatCurrency(comp.perStudentMonthUSD, comp.perStudentMonthINR, 3)}</td>
        <td class="cost-figure" style="color: var(--accent-indigo);">${formatCurrency(comp.perPaperUSD, comp.perPaperINR, 3)}</td>
        <td style="font-family: var(--font-mono); font-weight: 600;">${comp.sharePercent}%</td>
      `;
      compTbody.appendChild(tr);
    }

    // Total row
    const totalTr = document.createElement('tr');
    totalTr.style.background = 'var(--bg-glass)';
    totalTr.style.fontWeight = '700';
    totalTr.innerHTML = `
      <td><strong>TOTAL FIXED AWS CLOUD BILL</strong></td>
      <td><span class="feature-tag accent">${cloud.isMultiAz ? 'Multi-AZ' : 'Single-AZ'}</span></td>
      <td class="cost-figure" style="color: var(--accent-emerald); font-weight: 800;">${formatCurrency(fixed.monthlyUSD, fixed.monthlyINR, 2)}</td>
      <td class="cost-figure" style="color: var(--accent-emerald); font-weight: 700;">${formatCurrency(fixed.perStudentMonthUSD, fixed.perStudentMonthINR, 2)}</td>
      <td class="cost-figure" style="color: var(--accent-emerald); font-weight: 700;">${formatCurrency(fixed.perPaperUSD, fixed.perPaperINR, 2)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700;">100%</td>
    `;
    compTbody.appendChild(totalTr);
  }

  // Populate Notification Channels Table
  const notifTbody = document.getElementById('notificationChannelsTableBody');
  if (notifTbody) {
    notifTbody.innerHTML = '';
    const activeBadge = document.getElementById('notifChannelsActiveBadge');
    if (activeBadge) {
      activeBadge.textContent = `${notifs.activeChannels.length} of 3 Channels Active`;
    }

    const channelsList = [
      {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        rateDesc: '1 Rs (₹1.00)',
        rateINR: notifs.rates.whatsappINR,
        rateUSD: notifs.rates.whatsappINR / state.pricing.usdToInr,
        enabled: Boolean(state.notificationChannels.whatsapp),
        details: 'Scorecard summary template with PDF download link pushed directly to parent WhatsApp',
      },
      {
        id: 'sms',
        name: 'Domestic Indian SMS (DLT)',
        rateDesc: '60 Paisa (₹0.60)',
        rateINR: notifs.rates.smsINR,
        rateUSD: notifs.rates.smsINR / state.pricing.usdToInr,
        enabled: Boolean(state.notificationChannels.sms),
        details: 'SMS scorecard notification via Indian domestic telecom routing with DLT template',
      },
      {
        id: 'email',
        name: 'Amazon SES Email Scorecard',
        rateDesc: '30 Paisa (₹0.30)',
        rateINR: notifs.rates.emailINR,
        rateUSD: notifs.rates.emailINR / state.pricing.usdToInr,
        enabled: Boolean(state.notificationChannels.email),
        details: 'Branded HTML scorecard report with question-by-question analysis delivered to parent email',
      },
    ];

    channelsList.forEach((ch) => {
      const channelPaperINR = ch.enabled ? ch.rateINR : 0;
      const channelPaperUSD = ch.enabled ? ch.rateUSD : 0;
      const channelCohortMonthlyUSD = channelPaperUSD * cloud.monthlyPapers;
      const channelCohortMonthlyINR = channelPaperINR * cloud.monthlyPapers;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600;">${ch.name}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${ch.details}</div>
        </td>
        <td style="font-weight: 700;">₹${ch.rateINR.toFixed(2)} (${ch.rateDesc})</td>
        <td style="color: var(--text-muted);">$${ch.rateUSD.toFixed(4)}</td>
        <td>
          <span class="feature-tag ${ch.enabled ? 'accent' : ''}">
            ${ch.enabled ? 'Active (Enabled)' : 'Disabled'}
          </span>
        </td>
        <td class="cost-figure">${formatCurrency(channelPaperUSD, channelPaperINR, 2)}</td>
        <td class="cost-figure" style="color: var(--text-secondary);">${formatCurrency(channelCohortMonthlyUSD, channelCohortMonthlyINR, 0)}</td>
      `;
      notifTbody.appendChild(tr);
    });

    const notifTotalTr = document.createElement('tr');
    notifTotalTr.style.background = 'var(--bg-glass)';
    notifTotalTr.style.fontWeight = '700';
    notifTotalTr.innerHTML = `
      <td><strong>TOTAL PARENT NOTIFICATIONS</strong></td>
      <td colspan="3" style="color: var(--text-muted); font-size: 0.78rem;">${notifs.activeChannels.length} Active Channels Selected</td>
      <td class="cost-figure" style="color: var(--accent-emerald); font-weight: 800;">${formatCurrency(notifs.perPaperUSD, notifs.perPaperINR, 2)}</td>
      <td class="cost-figure" style="color: var(--accent-emerald); font-weight: 800;">${formatCurrency(notifs.monthlyCohortUSD, notifs.monthlyCohortINR, 0)}</td>
    `;
    notifTbody.appendChild(notifTotalTr);
  }
}

/**
 * Render optional calibration scenario details
 */
function renderCalibrationTab(result) {
  const samplePercentage = Math.round(state.calibrationRatio * 100);
  const sampleCount = state.calibration22Percent ? Math.max(1, Math.round(state.participantsPerExam * state.calibrationRatio)) : 0;
  const remainingCount = state.participantsPerExam - sampleCount;

  document.getElementById('calibStatusBadge').textContent = state.calibration22Percent
    ? `${samplePercentage}% Sample Active`
    : 'Calibration Disabled';

  document.getElementById('calibSampleStudentsVal').textContent = `${sampleCount} Papers`;
  document.getElementById('calibSampleRatioSub').textContent =
    `${samplePercentage}% of ${state.participantsPerExam} exam participants`;

  document.getElementById('calibRemainingStudentsVal').textContent = `${remainingCount} Papers`;

  // Find calibration step in stepsBreakdown
  const calibStep = result.stepsBreakdown.calibrationPhase;
  document.getElementById('calibAddedCostVal').textContent =
    formatCurrency(calibStep.perStudentUSD, calibStep.perStudentINR, 2);
}

/**
 * Render Commercial Pricing Tiers
 */
function renderPricingTiers(result) {
  const container = document.getElementById('pricingTiersGrid');
  container.innerHTML = '';

  const tiers = result.pricingRecommendation.pricingTiers;
  const isINR = state.currency === 'INR';

  tiers.forEach((tier) => {
    const card = document.createElement('div');
    card.className = `tier-card ${tier.isRecommended ? 'recommended' : ''}`;

    const price = isINR ? `₹${tier.pricePerStudentMonthINR}` : `$${tier.pricePerStudentMonthUSD}`;
    const annualVal = isINR
      ? `₹${(tier.annualContractINR / 100000).toFixed(2)} Lakhs / year`
      : `$${tier.annualContractUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / year`;

    card.innerHTML = `
      ${tier.isRecommended ? '<div class="tier-recommended-badge">Recommended Tier</div>' : ''}
      <h4 class="tier-title">${tier.name}</h4>
      <div class="tier-margin-pill">${tier.marginPercent}% Pipeline Target</div>

      <div class="tier-price-box">
        <span class="tier-price">${price}</span>
        <span class="tier-price-unit">/ student / month</span>
      </div>

      <p class="tier-details">${tier.description}</p>

      <div class="tier-annual-highlight">
        Annual Contract: <strong>${annualVal}</strong>
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * Export complete cost breakdown to CSV
 */
function exportCostToCsv() {
  const result = CostEngine.calculateMasterInstitutionCost(calculationInputs());

  const lines = [
    ['Paatam AI Cost Estimation Engine - Official Report'],
    ['Generated At', new Date().toISOString()],
    ['Currency', state.currency],
    ['Exchange Rate (USD to INR)', state.pricing.usdToInr],
    [],
    ['INSTITUTIONAL INPUTS'],
    ['Total Active Students', state.studentsCount],
    ['Students Sharing Each Exam', state.participantsPerExam],
    ['Exams Per Student Per Month', state.examsPerStudentPerMonth],
    ['Pages Per Answer Sheet', state.pagesPerPaper],
    ['Questions Per Exam', state.questionsPerPaper],
    ['Bulk Slicing Mode', state.bulkSlicingMode],
    ['Extra Calibration Passes Enabled', state.calibration22Percent ? 'YES' : 'NO'],
    ['Calibration Sample Ratio', `${Math.round(state.calibrationRatio * 100)}%`],
    ['Diagram Mode', state.visualDiagramMode],
    ['Exam Source', state.paperSourceMode],
    ['Uploaded Question Paper Pages', state.paperSourceMode === 'uploaded' ? state.questionPaperPages : 0],
    ['Uploaded Answer Key Pages', state.paperSourceMode === 'uploaded' ? state.answerKeyPages : 0],
    ['Question Replacements Per Exam', state.regenerationsPerExam],
    ['Additional OCR Calls (%)', state.ocrRepeatPercent],
    ['Additional Grading Calls (%)', state.evaluationRepeatPercent],
    ['New Chapters Per Month', state.chaptersPerMonth],
    ['Embedding Chunks Per Chapter', state.chunksPerChapter],
    ['Syllabus Analyses Per Month', state.syllabusAnalysesPerMonth],
    ['Embedding Price ($/1M)', state.pricing.geminiEmbedding.costPer1M_USD],
    ['Target Margin', `${state.marginPercent}%`],
    ['Cloud Stack Architecture', state.cloudArchitecture === 'multi_az' ? 'Multi-AZ High Availability' : 'Single-AZ Cost-Optimized'],
    ['Monthly Fixed AWS Cloud Bill', `$${result.cloudInfrastructure.fixedBill.monthlyUSD.toFixed(2)} (₹${result.cloudInfrastructure.fixedBill.monthlyINR.toFixed(2)})`],
    ['Amortize Cloud Bill in COGS', state.includeFixedCloudInfra ? 'YES' : 'NO'],
    ['Parent Scorecard Notification Channels', result.cloudInfrastructure.notifications.activeChannels.map((c) => c.name).join(' + ') || 'None'],
    ['Pricing Scope', 'Modeled AI workflows plus per-paper infrastructure allowance; excludes unmeasured provider costs and taxes'],
    [],
    ['KEY PERFORMANCE METRICS', 'USD ($)', 'INR (₹)'],
    ['Blended Cost Per Student / Paper (Pipeline)', result.perStudent.perPaperUSD.toFixed(4), result.perStudent.perPaperINR.toFixed(2)],
    ['Cost Per Student / Month', result.perStudent.perMonthUSD.toFixed(4), result.perStudent.perMonthINR.toFixed(2)],
    ['Cost Per Student / Year (10 mo)', result.perStudent.perYearUSD.toFixed(2), result.perStudent.perYearINR.toFixed(2)],
    ['Total Cohort Monthly Modeled Cost', result.cohortTotal.monthlyCostUSD.toFixed(2), result.cohortTotal.monthlyCostINR.toFixed(2)],
    ['AI Provider Estimate', result.cohortTotal.monthlyAiCostUSD.toFixed(2), result.cohortTotal.monthlyAiCostINR.toFixed(2)],
    ['Fixed Monthly AWS Hosting Bill', result.cohortTotal.monthlyFixedInfraUSD.toFixed(2), result.cohortTotal.monthlyFixedInfraINR.toFixed(2)],
    ['Fixed Cloud Amortized Per Student / Month', result.cloudInfrastructure.fixedBill.perStudentMonthUSD.toFixed(4), result.cloudInfrastructure.fixedBill.perStudentMonthINR.toFixed(2)],
    ['Fixed Cloud Amortized Per Exam Paper', result.cloudInfrastructure.fixedBill.perPaperUSD.toFixed(4), result.cloudInfrastructure.fixedBill.perPaperINR.toFixed(2)],
    ['Parent Notification Cost Per Paper', result.cloudInfrastructure.notifications.perPaperUSD.toFixed(4), result.cloudInfrastructure.notifications.perPaperINR.toFixed(2)],
    ['All-Inclusive Cost Per Paper (AI + Cloud + Notif)', result.allInclusiveTotals.perPaperUSD.toFixed(4), result.allInclusiveTotals.perPaperINR.toFixed(2)],
    ['All-Inclusive Cost Per Student / Month', result.allInclusiveTotals.perStudentMonthUSD.toFixed(4), result.allInclusiveTotals.perStudentMonthINR.toFixed(2)],
    ['Recommended School Price / Student / Month', result.pricingRecommendation.suggestedPricePerStudentMonthUSD.toFixed(2), result.pricingRecommendation.suggestedPricePerStudentMonthINR.toFixed(2)],
    ['Projected Cohort Monthly Revenue', result.pricingRecommendation.totalMonthlyRevenueUSD.toFixed(2), result.pricingRecommendation.totalMonthlyRevenueINR.toFixed(2)],
    ['Projected Cohort Monthly Pipeline Spread', result.pricingRecommendation.totalMonthlyProfitUSD.toFixed(2), result.pricingRecommendation.totalMonthlyProfitINR.toFixed(2)],
    [],
    ['PIPELINE STEP BREAKDOWN', 'Share (%)', 'Per Paper USD', 'Per Paper INR', 'Monthly Cohort USD', 'Monthly Cohort INR'],
  ];

  for (const [key, step] of Object.entries(result.stepsBreakdown)) {
    lines.push([
      step.label,
      `${step.percentage}%`,
      step.perStudentUSD.toFixed(4),
      step.perStudentINR.toFixed(2),
      step.totalMonthlyUSD.toFixed(2),
      step.totalMonthlyINR.toFixed(2),
    ]);
  }

  lines.push([]);
  lines.push(['AWS CLOUD PRODUCTION BILL BREAKDOWN ($406/mo)', 'Category', 'Monthly USD', 'Monthly INR', 'Per Student / Mo', 'Per Paper']);
  for (const [cKey, comp] of Object.entries(result.cloudInfrastructure.fixedBill.components)) {
    lines.push([
      comp.name,
      comp.category,
      comp.monthlyUSD.toFixed(2),
      comp.monthlyINR.toFixed(2),
      comp.perStudentMonthUSD.toFixed(4),
      comp.perPaperUSD.toFixed(4),
    ]);
  }
  lines.push([
    'TOTAL AWS CLOUD BILL',
    result.cloudInfrastructure.isMultiAz ? 'Multi-AZ HA' : 'Single-AZ',
    result.cloudInfrastructure.fixedBill.monthlyUSD.toFixed(2),
    result.cloudInfrastructure.fixedBill.monthlyINR.toFixed(2),
    result.cloudInfrastructure.fixedBill.perStudentMonthUSD.toFixed(4),
    result.cloudInfrastructure.fixedBill.perPaperUSD.toFixed(4),
  ]);

  lines.push([]);
  lines.push(['PARENT NOTIFICATION CHANNELS', 'Rate (INR)', 'Rate (USD)', 'Status', 'Per Paper Cost (INR)', 'Monthly Total (INR)']);
  const notifs = result.cloudInfrastructure.notifications;
  const chRows = [
    ['WhatsApp Business API', `₹${notifs.rates.whatsappINR.toFixed(2)} (1 Rs)`, (notifs.rates.whatsappINR / state.pricing.usdToInr).toFixed(4), state.notificationChannels.whatsapp ? 'ACTIVE' : 'DISABLED', state.notificationChannels.whatsapp ? notifs.rates.whatsappINR.toFixed(2) : '0.00', state.notificationChannels.whatsapp ? (notifs.rates.whatsappINR * result.cloudInfrastructure.monthlyPapers).toFixed(2) : '0.00'],
    ['Domestic Indian SMS (DLT)', `₹${notifs.rates.smsINR.toFixed(2)} (60 Paisa)`, (notifs.rates.smsINR / state.pricing.usdToInr).toFixed(4), state.notificationChannels.sms ? 'ACTIVE' : 'DISABLED', state.notificationChannels.sms ? notifs.rates.smsINR.toFixed(2) : '0.00', state.notificationChannels.sms ? (notifs.rates.smsINR * result.cloudInfrastructure.monthlyPapers).toFixed(2) : '0.00'],
    ['Amazon SES Email', `₹${notifs.rates.emailINR.toFixed(2)} (30 Paisa)`, (notifs.rates.emailINR / state.pricing.usdToInr).toFixed(4), state.notificationChannels.email ? 'ACTIVE' : 'DISABLED', state.notificationChannels.email ? notifs.rates.emailINR.toFixed(2) : '0.00', state.notificationChannels.email ? (notifs.rates.emailINR * result.cloudInfrastructure.monthlyPapers).toFixed(2) : '0.00'],
  ];
  for (const r of chRows) lines.push(r);

  lines.push([]);
  lines.push(['SUBJECT-BY-SUBJECT BREAKDOWN', 'Weight (%)', 'Per Paper USD', 'Per Paper INR', 'Eval Model', 'Diagrams']);
  for (const [subKey, sData] of Object.entries(result.subjectBreakdown)) {
    lines.push([
      sData.profile.name,
      `${sData.weightPercent}%`,
      sData.costPerStudentUSD.toFixed(4),
      sData.costPerStudentINR.toFixed(2),
      sData.profile.evalModelName,
      sData.profile.avgDiagramsPerExam,
    ]);
  }

  const csvContent = lines.map((row) => row.map((cell) => `"${cell !== undefined ? cell : ''}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Paatam_AI_and_Cloud_Cost_Estimate_${state.studentsCount}_Students_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Apply Preset Configuration
 */
function applyPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  state.studentsCount = preset.studentsCount;
  state.participantsPerExam = Math.min(40, preset.studentsCount);
  state.examsPerStudentPerMonth = preset.examsPerStudentPerMonth;
  state.pagesPerPaper = preset.pagesPerPaper;
  state.questionsPerPaper = preset.questionsPerPaper;
  state.bulkSlicingMode = preset.bulkSlicingMode;
  state.calibration22Percent = preset.calibration22Percent;
  state.calibrationRatio = preset.calibrationRatio;
  state.visualDiagramMode = preset.visualDiagramMode;

  // Update DOM sliders
  document.getElementById('sliderStudentsCount').value = preset.studentsCount;
  document.getElementById('valStudentsCount').textContent = preset.studentsCount.toLocaleString();
  document.getElementById('inputParticipantsPerExam').max = preset.studentsCount;
  document.getElementById('inputParticipantsPerExam').value = state.participantsPerExam;

  document.getElementById('sliderExamsPerMonth').value = preset.examsPerStudentPerMonth;
  document.getElementById('valExamsPerMonth').textContent = preset.examsPerStudentPerMonth;

  document.getElementById('sliderPagesPerPaper').value = preset.pagesPerPaper;
  document.getElementById('valPagesPerPaper').textContent = `${preset.pagesPerPaper} Pages`;

  document.getElementById('sliderQuestionsPerPaper').value = preset.questionsPerPaper;
  document.getElementById('valQuestionsPerPaper').textContent = `${preset.questionsPerPaper} Qs`;

  document.getElementById('checkCalibration22').checked = preset.calibration22Percent;
  document.getElementById('sliderCalibrationRatio').value = Math.round(preset.calibrationRatio * 100);
  document.getElementById('valCalibrationRatio').textContent = `${Math.round(preset.calibrationRatio * 100)}%`;
  document.getElementById('calibrationRatioContainer').style.display = preset.calibration22Percent ? 'block' : 'none';

  // Update Slicing Segment
  document.querySelectorAll('#slicingModeControl .segment-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === preset.bulkSlicingMode);
  });

  // Update Diagram Mode Segment
  document.querySelectorAll('#diagramModeControl .segment-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === preset.visualDiagramMode);
  });

  // Update active preset chip
  document.querySelectorAll('#presetsBar .preset-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.preset === presetKey);
  });

  recalculateAndRender();
}

/**
 * Event Listeners Binding
 */
function setupEventListeners() {
  document.querySelectorAll('#paperSourceControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.paperSourceMode = btn.dataset.mode;
      document.querySelectorAll('#paperSourceControl .segment-btn').forEach((item) => item.classList.toggle('active', item === btn));
      document.getElementById('uploadedPaperFields').hidden = state.paperSourceMode !== 'uploaded';
      recalculateAndRender();
    });
  });

  // Cloud Architecture Segmented Control
  document.querySelectorAll('#cloudArchitectureControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cloudArchitectureControl .segment-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.cloudArchitecture = btn.dataset.arch;
      recalculateAndRender();
    });
  });

  // Notification Channel Checkboxes
  const checkWa = document.getElementById('checkNotifWhatsApp');
  if (checkWa) {
    checkWa.addEventListener('change', (e) => {
      state.notificationChannels.whatsapp = e.target.checked;
      recalculateAndRender();
    });
  }

  const checkSms = document.getElementById('checkNotifSms');
  if (checkSms) {
    checkSms.addEventListener('change', (e) => {
      state.notificationChannels.sms = e.target.checked;
      recalculateAndRender();
    });
  }

  const checkEmail = document.getElementById('checkNotifEmail');
  if (checkEmail) {
    checkEmail.addEventListener('change', (e) => {
      state.notificationChannels.email = e.target.checked;
      recalculateAndRender();
    });
  }

  // Include Fixed Cloud Toggle
  const checkFixedCloud = document.getElementById('checkIncludeFixedCloud');
  if (checkFixedCloud) {
    checkFixedCloud.addEventListener('change', (e) => {
      state.includeFixedCloudInfra = e.target.checked;
      recalculateAndRender();
    });
  }

  for (const [id, key] of Object.entries({ inputQuestionPaperPages: 'questionPaperPages', inputAnswerKeyPages: 'answerKeyPages', inputRegenerations: 'regenerationsPerExam', inputOcrRepeats: 'ocrRepeatPercent', inputEvaluationRepeats: 'evaluationRepeatPercent', inputChaptersPerMonth: 'chaptersPerMonth', inputChunksPerChapter: 'chunksPerChapter', inputSyllabusAnalyses: 'syllabusAnalysesPerMonth' })) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (event) => {
        if (!event.target.checkValidity()) { event.target.value = state[key]; return; }
        state[key] = Number(event.target.value);
        recalculateAndRender();
      });
    }
  }

  // Currency Toggle
  document.getElementById('btnCurrencyINR').addEventListener('click', () => {
    state.currency = 'INR';
    document.getElementById('btnCurrencyINR').classList.add('active');
    document.getElementById('btnCurrencyUSD').classList.remove('active');
    recalculateAndRender();
  });

  document.getElementById('btnCurrencyUSD').addEventListener('click', () => {
    state.currency = 'USD';
    document.getElementById('btnCurrencyUSD').classList.add('active');
    document.getElementById('btnCurrencyINR').classList.remove('active');
    recalculateAndRender();
  });

  // Theme Toggle
  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    document.getElementById('themeIcon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('themeLabel').textContent = state.theme === 'dark' ? 'Light' : 'Dark';
  });

  // Preset Chips
  document.querySelectorAll('#presetsBar .preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      applyPreset(chip.dataset.preset);
    });
  });

  // Sliders: Scale Controls
  const sliderStudents = document.getElementById('sliderStudentsCount');
  sliderStudents.addEventListener('input', (e) => {
    state.studentsCount = Number(e.target.value);
    state.participantsPerExam = Math.min(state.participantsPerExam, state.studentsCount);
    document.getElementById('inputParticipantsPerExam').max = state.studentsCount;
    document.getElementById('inputParticipantsPerExam').value = state.participantsPerExam;
    document.getElementById('valStudentsCount').textContent = state.studentsCount.toLocaleString();
    recalculateAndRender();
  });

  document.getElementById('inputParticipantsPerExam').addEventListener('change', (e) => {
    const participants = Number(e.target.value);
    state.participantsPerExam = Number.isFinite(participants) ? Math.min(state.studentsCount, Math.max(1, Math.floor(participants))) : 40;
    e.target.value = state.participantsPerExam;
    recalculateAndRender();
  });

  const sliderExams = document.getElementById('sliderExamsPerMonth');
  sliderExams.addEventListener('input', (e) => {
    state.examsPerStudentPerMonth = Number(e.target.value);
    document.getElementById('valExamsPerMonth').textContent = state.examsPerStudentPerMonth;
    recalculateAndRender();
  });

  const sliderPages = document.getElementById('sliderPagesPerPaper');
  sliderPages.addEventListener('input', (e) => {
    state.pagesPerPaper = Number(e.target.value);
    document.getElementById('valPagesPerPaper').textContent = `${state.pagesPerPaper} Pages`;
    recalculateAndRender();
  });

  const sliderQs = document.getElementById('sliderQuestionsPerPaper');
  sliderQs.addEventListener('input', (e) => {
    state.questionsPerPaper = Number(e.target.value);
    document.getElementById('valQuestionsPerPaper').textContent = `${state.questionsPerPaper} Qs`;
    recalculateAndRender();
  });

  // 22% Calibration Toggle & Slider
  const checkCalib = document.getElementById('checkCalibration22');
  const calibRatioContainer = document.getElementById('calibrationRatioContainer');
  checkCalib.addEventListener('change', (e) => {
    state.calibration22Percent = e.target.checked;
    calibRatioContainer.style.display = state.calibration22Percent ? 'block' : 'none';
    recalculateAndRender();
  });

  const sliderCalibRatio = document.getElementById('sliderCalibrationRatio');
  sliderCalibRatio.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.calibrationRatio = val / 100;
    document.getElementById('valCalibrationRatio').textContent = `${val}%`;
    recalculateAndRender();
  });

  // Slicing Mode Segmented Control
  document.querySelectorAll('#slicingModeControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#slicingModeControl .segment-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.bulkSlicingMode = btn.dataset.mode;
      recalculateAndRender();
    });
  });

  // Diagram Mode Segmented Control
  document.querySelectorAll('#diagramModeControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diagramModeControl .segment-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.visualDiagramMode = btn.dataset.mode;
      recalculateAndRender();
    });
  });

  // Subject Sliders
  const setupSubjectSlider = (id, valId, key) => {
    const el = document.getElementById(id);
    el.addEventListener('input', (e) => {
      const nextWeight = Number(e.target.value);
      const remainingWeight = Object.entries(state.subjectWeights).reduce((sum, [subject, weight]) => sum + (subject === key ? nextWeight : weight), 0);
      if (remainingWeight === 0) {
        e.target.value = state.subjectWeights[key];
        return;
      }
      state.subjectWeights[key] = nextWeight;
      document.getElementById(valId).textContent = `${state.subjectWeights[key]}%`;
      const sum = Object.values(state.subjectWeights).reduce((a, b) => a + b, 0);
      document.getElementById('subjectMixTotalLabel').textContent = `Total: ${sum}%`;
      recalculateAndRender();
    });
  };

  setupSubjectSlider('sliderWeightMath', 'valWeightMath', 'mathematics');
  setupSubjectSlider('sliderWeightSci', 'valWeightSci', 'science');
  setupSubjectSlider('sliderWeightSoc', 'valWeightSoc', 'social');
  setupSubjectSlider('sliderWeightHin', 'valWeightHin', 'hindi_indic');
  setupSubjectSlider('sliderWeightEng', 'valWeightEng', 'english');

  // Profit Margin Slider
  const sliderMargin = document.getElementById('sliderMargin');
  sliderMargin.addEventListener('input', (e) => {
    state.marginPercent = Number(e.target.value);
    document.getElementById('valMargin').textContent = `${state.marginPercent}%`;
    recalculateAndRender();
  });

  // Tab Navigation
  document.querySelectorAll('.tabs-navigation .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs-navigation .tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((tc) => (tc.style.display = 'none'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetElem = document.getElementById(targetId);
      if (targetElem) targetElem.style.display = 'block';
    });
  });

  // Modal: Open & Close Rates
  const modal = document.getElementById('ratesModal');
  document.getElementById('btnOpenRatesModal').addEventListener('click', () => {
    document.getElementById('inputUsdToInr').value = state.pricing.usdToInr;
    document.getElementById('inputSarvamDocAi').value = state.pricing.sarvamDocAI.costPerPageINR;
    document.getElementById('inputFlashIn').value = state.pricing.geminiFlash.inputPer1M;
    document.getElementById('inputFlashOut').value = state.pricing.geminiFlash.outputPer1M;
    document.getElementById('inputImageTokens').value = state.pricing.geminiFlash.imageTokensPerPage;
    document.getElementById('inputThinkingTokens').value = state.pricing.geminiFlash.thinkingTokensPerEvaluation;
    document.getElementById('inputImageGen').value = state.pricing.geminiImageGen.costPerImageUSD;
    document.getElementById('inputSarvamChatIn').value = state.pricing.sarvamChat105b.inputPer1M_INR;
    document.getElementById('inputSarvamChatOut').value = state.pricing.sarvamChat105b.outputPer1M_INR;
    document.getElementById('inputEmbeddingRate').value = state.pricing.geminiEmbedding.costPer1M_USD;
    if (document.getElementById('inputWhatsappRate')) {
      document.getElementById('inputWhatsappRate').value = state.pricing.notifications?.whatsappINR ?? 1.00;
    }
    if (document.getElementById('inputSmsRate')) {
      document.getElementById('inputSmsRate').value = state.pricing.notifications?.smsINR ?? 0.60;
    }
    if (document.getElementById('inputEmailRate')) {
      document.getElementById('inputEmailRate').value = state.pricing.notifications?.emailINR ?? 0.30;
    }
    if (document.getElementById('inputFixedCloudBill')) {
      document.getElementById('inputFixedCloudBill').value = state.pricing.cloudInfra?.fixedMonthlyInfraUSD ?? 346.67;
    }
    modal.classList.add('open');
  });

  document.getElementById('btnCloseRatesModal').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  document.getElementById('btnResetRates').addEventListener('click', () => {
    state.pricing = JSON.parse(JSON.stringify(DEFAULT_PRICING));
    modal.classList.remove('open');
    recalculateAndRender();
  });

  document.getElementById('btnSaveRates').addEventListener('click', () => {
    const fields = [
      ['inputUsdToInr', state.pricing, 'usdToInr'],
      ['inputSarvamDocAi', state.pricing.sarvamDocAI, 'costPerPageINR'],
      ['inputFlashIn', state.pricing.geminiFlash, 'inputPer1M'],
      ['inputFlashOut', state.pricing.geminiFlash, 'outputPer1M'],
      ['inputImageTokens', state.pricing.geminiFlash, 'imageTokensPerPage'],
      ['inputThinkingTokens', state.pricing.geminiFlash, 'thinkingTokensPerEvaluation'],
      ['inputImageGen', state.pricing.geminiImageGen, 'costPerImageUSD'],
      ['inputSarvamChatIn', state.pricing.sarvamChat105b, 'inputPer1M_INR'],
      ['inputSarvamChatOut', state.pricing.sarvamChat105b, 'outputPer1M_INR'],
      ['inputEmbeddingRate', state.pricing.geminiEmbedding, 'costPer1M_USD'],
    ];
    if (fields.some(([id]) => document.getElementById(id) && !document.getElementById(id).checkValidity())) return;
    fields.forEach(([id, target, key]) => {
      const el = document.getElementById(id);
      if (el) target[key] = Number(el.value);
    });

    if (document.getElementById('inputWhatsappRate')) {
      state.pricing.notifications.whatsappINR = Number(document.getElementById('inputWhatsappRate').value);
    }
    if (document.getElementById('inputSmsRate')) {
      state.pricing.notifications.smsINR = Number(document.getElementById('inputSmsRate').value);
    }
    if (document.getElementById('inputEmailRate')) {
      state.pricing.notifications.emailINR = Number(document.getElementById('inputEmailRate').value);
    }
    if (document.getElementById('inputFixedCloudBill')) {
      state.pricing.cloudInfra.fixedMonthlyInfraUSD = Number(document.getElementById('inputFixedCloudBill').value);
    }

    modal.classList.remove('open');
    recalculateAndRender();
  });

  // Export CSV
  document.getElementById('btnExportCsv').addEventListener('click', exportCostToCsv);
}

// Initial Boot
function init() {
  setupEventListeners();
  recalculateAndRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

