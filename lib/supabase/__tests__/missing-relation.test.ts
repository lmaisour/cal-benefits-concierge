import { describe, expect, it } from "vitest";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";

describe("isMissingRelationError", () => {
  it("detects PostgREST schema-cache misses", () => {
    expect(
      isMissingRelationError({
        code: "PGRST205",
        message: "Could not find the table 'public.guides' in the schema cache",
      }),
    ).toBe(true);
  });

  it("does not swallow unrelated errors", () => {
    expect(isMissingRelationError({ message: "JWT expired" })).toBe(false);
  });
});
