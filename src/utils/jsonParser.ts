/**
 * Universal AI JSON Repair & Parser Engine
 * Recovers valid JSON objects and arrays from LLM outputs even when markdown fences,
 * unquoted option keys, trailing commas, or unescaped control characters are present.
 */

export function parseJsonValue<T = any>(rawText: string | null | undefined, openingCharacter?: '{' | '['): T | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let source = rawText.trim();
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)(?:```|$)/i;
  const match = source.match(fenceRegex);
  if (match && match[1]?.trim()) {
    source = match[1].trim();
  }

  // Auto-repair unquoted parenthesized option values e.g. "correctAnswer": (a) Neutralisation
  source = source
    .replace(/:\s*(\([a-zA-Z0-9][^\n\r,\}\]]*?)\s*(?=[,\}\]\n\r])/g, ': "$1"')
    .replace(/:\s*([A-Da-d]\)[^\n\r,\}\]]*?)\s*(?=[,\}\]\n\r])/g, ': "$1"');

  try {
    return JSON.parse(source) as T;
  } catch {}

  // Boundary finder with balanced bracket counter
  let startIdx = openingCharacter ? source.indexOf(openingCharacter) : -1;
  let openChar: '{' | '[' = openingCharacter || '{';
  let closeChar: '}' | ']' = openChar === '{' ? '}' : ']';

  if (startIdx < 0) {
    const firstBrace = source.indexOf('{');
    const firstBracket = source.indexOf('[');
    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      openChar = '{';
      closeChar = '}';
    } else if (firstBracket >= 0) {
      startIdx = firstBracket;
      openChar = '[';
      closeChar = ']';
    } else {
      return null;
    }
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIdx = -1;

  for (let i = startIdx; i < source.length; i++) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === openChar) depth++;
      else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  let candidate = endIdx >= 0 ? source.substring(startIdx, endIdx + 1) : source.substring(startIdx);
  if (depth > 0) candidate += closeChar.repeat(depth);

  try {
    return JSON.parse(candidate) as T;
  } catch {}

  // Character-level sanitization: escape raw newlines/tabs inside strings only
  let sanitized = '';
  inString = false;
  escaped = false;

  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];
    if (escaped) {
      sanitized += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      const next = candidate[i + 1];
      if (next && '"\\/bfnrtu'.includes(next)) {
        sanitized += char;
        escaped = true;
      } else {
        sanitized += '\\\\';
      }
      continue;
    }
    if (char === '"') {
      inString = !inString;
      sanitized += char;
      continue;
    }
    if (inString) {
      if (char === '\n') sanitized += '\\n';
      else if (char === '\r') sanitized += '\\r';
      else if (char === '\t') sanitized += '\\t';
      else if (char.charCodeAt(0) < 0x20) sanitized += ' ';
      else sanitized += char;
    } else {
      sanitized += char;
    }
  }

  if (inString) sanitized += `"${closeChar}`;
  sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(sanitized) as T;
  } catch {
    return null;
  }
}
