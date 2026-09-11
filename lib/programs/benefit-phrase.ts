export const MAX_BENEFIT_PHRASE_CHARS = 48;
export const MAX_BENEFIT_PHRASE_WORDS = 8;

export function conciseBenefitPhrase(summary: string | null | undefined): string | null {
  if (!summary) {
    return null;
  }
  let text = summary.trim();
  if (!text || /[\n\r]/.test(text)) {
    return null;
  }
  text = text.replace(/[.]+$/g, "").trim();
  if (!text || /[.!?;:]/.test(text)) {
    return null;
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_BENEFIT_PHRASE_WORDS) {
    return null;
  }
  if (text.length > MAX_BENEFIT_PHRASE_CHARS) {
    return null;
  }
  if (/^(this|the program|applicants?|eligible|you)\b/i.test(text)) {
    return null;
  }
  if (/^[A-Z][a-z]/.test(text)) {
    return text[0].toLowerCase() + text.slice(1);
  }
  return text;
}
