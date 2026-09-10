import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import type { ProgramStatus } from "@/types/database";

export type HomepageFeatureCandidate = {
  active: boolean;
  status: ProgramStatus;
};

export const HOMEPAGE_FEATURE_UNAVAILABLE_ERROR =
  "This program is not currently available, so it cannot be featured on the homepage.";

export const HOMEPAGE_FEATURE_NOT_FOUND_ERROR = "That program was not found.";

export function homepageFeatureEligibility(
  program: HomepageFeatureCandidate | null,
): { ok: true } | { ok: false; formError: string } {
  if (!program) {
    return { ok: false, formError: HOMEPAGE_FEATURE_NOT_FOUND_ERROR };
  }
  if (!isCurrentlyAvailable(program)) {
    return { ok: false, formError: HOMEPAGE_FEATURE_UNAVAILABLE_ERROR };
  }
  return { ok: true };
}

export async function featureProgramOnHomepage(
  programId: string,
  sortOrder: number,
  deps: {
    loadProgram: (id: string) => Promise<HomepageFeatureCandidate | null>;
    upsertHomepageFeature: (id: string, sortOrder: number) => Promise<void>;
  },
): Promise<{ ok: true } | { ok: false; formError: string }> {
  const program = await deps.loadProgram(programId);
  const eligibility = homepageFeatureEligibility(program);
  if (!eligibility.ok) {
    return eligibility;
  }
  await deps.upsertHomepageFeature(programId, sortOrder);
  return { ok: true };
}
