export function gaMeasurementId(): string | null {
  const value = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!value || !/^G-[A-Z0-9]+$/i.test(value)) {
    return null;
  }
  return value;
}
