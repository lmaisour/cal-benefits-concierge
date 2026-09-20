/**
 * Preview review fixtures are readable only on Vercel Preview and local
 * development. They never run on Production.
 */
export function isPreviewReviewEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.VERCEL_ENV === "production") {
    return false;
  }
  if (env.VERCEL_ENV === "preview") {
    return true;
  }
  return env.NODE_ENV !== "production";
}
