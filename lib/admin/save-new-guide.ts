import type { GuideWritePayload } from "@/lib/admin/validate-guide";
import type { FieldErrors } from "@/lib/admin/validate-program";

export async function saveNewGuide(
  payload: GuideWritePayload,
  relatedProgramIds: string[],
  deps: {
    slugIsTaken: (slug: string) => Promise<boolean>;
    createGuide: (payload: GuideWritePayload) => Promise<{ id: string; slug: string }>;
    replaceGuidePrograms: (guideId: string, programIds: string[]) => Promise<void>;
  },
): Promise<
  | { ok: true; guide: { id: string; slug: string } }
  | { ok: false; errors?: FieldErrors; formError?: string }
> {
  try {
    if (await deps.slugIsTaken(payload.slug)) {
      return { ok: false, errors: { slug: "That slug is already in use." } };
    }
    const created = await deps.createGuide(payload);
    await deps.replaceGuidePrograms(created.id, relatedProgramIds);
    return { ok: true, guide: created };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not create guide.",
    };
  }
}
