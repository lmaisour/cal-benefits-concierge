export const CANONICAL_ORIGIN = "https://benefitsconcierge.org";

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, CANONICAL_ORIGIN).toString();
}
