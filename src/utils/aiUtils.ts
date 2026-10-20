/**
 * AI & Indic Language Utilities for Paatam Backend
 */

/**
 * Normalizes Indic numerals (Devanagari, Telugu) into standard Arabic digits (0-9)
 */
export function normalizeIndicDigits(text: string): string {
  if (!text) return text;
  return text
    // Devanagari numerals: ०-९
    .replace(/०/g, '0')
    .replace(/१/g, '1')
    .replace(/२/g, '2')
    .replace(/३/g, '3')
    .replace(/४/g, '4')
    .replace(/५/g, '5')
    .replace(/६/g, '6')
    .replace(/७/g, '7')
    .replace(/८/g, '8')
    .replace(/९/g, '9')
    // Telugu numerals: ౦-౯
    .replace(/౦/g, '0')
    .replace(/౧/g, '1')
    .replace(/౨/g, '2')
    .replace(/౩/g, '3')
    .replace(/౪/g, '4')
    .replace(/౫/g, '5')
    .replace(/౬/g, '6')
    .replace(/౭/g, '7')
    .replace(/౮/g, '8')
    .replace(/౯/g, '9');
}

/**
 * Extracts a normalized, canonical question key (e.g. "1", "1a", "2", "Q1")
 */
export function canonicalQuestionKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = normalizeIndicDigits(String(value)).trim();
  if (!str) return null;

  // Match standard numbers: "1", "Q1", "Question 1", "(a)", "1(a)"
  const clean = str.replace(/^(question|q|que|प्रश्न|ప్రశ్న)\s*/i, '').replace(/[^\w]/g, '').toLowerCase();
  return clean || null;
}

/**
 * Extracts relevant OCR evidence matching the assigned questions,
 * reducing token noise and hallucinations before passing to evaluation LLMs.
 */
export function extractRelevantOcrEvidence(
  ocrText: string,
  assignedQuestions: any[] = [],
  maxChars = 14000
): string {
  if (!ocrText) return '';
  if (ocrText.length <= maxChars) return ocrText;

  // If text exceeds limit, focus on question-prefixed regions
  const lines = ocrText.split('\n');
  const relevantLines: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    relevantLines.push(line);
    currentLength += line.length + 1;
    if (currentLength >= maxChars) break;
  }

  return relevantLines.join('\n');
}
