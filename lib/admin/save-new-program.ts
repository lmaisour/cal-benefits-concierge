import type { FieldErrors, ProgramWritePayload } from "@/lib/admin/validate-program";

export type SavedNewProgram = {
  id: string;
  slug: string;
};

export type SaveNewProgramResult =
  | { ok: true; program: SavedNewProgram }
  | { ok: false; errors?: FieldErrors; formError?: string };

export type NewProgramWriter = {
  slugIsTaken: (slug: string) => Promise<boolean>;
  createProgram: (data: ProgramWritePayload) => Promise<SavedNewProgram>;
};

/**
 * Insert a program and map database/slug failures to form errors.
 * Callers must invoke Next.js redirect() after a successful result so
 * the redirect exception is not swallowed by this try/catch.
 */
export async function saveNewProgram(
  data: ProgramWritePayload,
  writer: NewProgramWriter,
): Promise<SaveNewProgramResult> {
  try {
    if (await writer.slugIsTaken(data.slug)) {
      return {
        ok: false,
        errors: { slug: "That slug is already in use." },
      };
    }
    const program = await writer.createProgram(data);
    return { ok: true, program };
  } catch (error) {
    return {
      ok: false,
      formError:
        error instanceof Error ? error.message : "Could not save program.",
    };
  }
}
