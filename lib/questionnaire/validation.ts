export function isValidZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function normalizeNumericInput(raw: string): string {
  return raw.trim().replace(/[$,\s]/g, "");
}

export function parseIntegerInRange(
  raw: string,
  min: number,
  max: number,
): number | undefined {
  const normalized = normalizeNumericInput(raw);
  if (normalized === "") {
    return undefined;
  }
  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }
  const value = Number(normalized);
  if (!Number.isInteger(value) || value < min || value > max) {
    return undefined;
  }
  return value;
}

export function parseNonNegativeNumber(raw: string): number | undefined {
  const normalized = normalizeNumericInput(raw);
  if (normalized === "") {
    return undefined;
  }
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return undefined;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

export function zipError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "Enter a 5-digit ZIP code.";
  }
  if (!isValidZip(trimmed)) {
    return "Enter a 5-digit U.S. ZIP code.";
  }
  return null;
}

export function householdSizeError(raw: string): string | null {
  if (raw.trim() === "") {
    return "Enter how many people are in your household.";
  }
  if (parseIntegerInRange(raw, 1, 20) === undefined) {
    return "Enter a whole number from 1 to 20.";
  }
  return null;
}

export function ageError(raw: string): string | null {
  if (raw.trim() === "") {
    return null;
  }
  if (parseIntegerInRange(raw, 18, 120) === undefined) {
    return "Enter an age from 18 to 120, or choose Prefer not to say.";
  }
  return null;
}

export function incomeError(raw: string): string | null {
  if (raw.trim() === "") {
    return null;
  }
  if (parseNonNegativeNumber(raw) === undefined) {
    return "Enter an annual income of $0 or more, or choose Prefer not to say.";
  }
  return null;
}

export function vehiclePriceError(raw: string): string | null {
  if (raw.trim() === "") {
    return null;
  }
  if (parseNonNegativeNumber(raw) === undefined) {
    return "Enter a price of $0 or more, or skip this question.";
  }
  return null;
}
