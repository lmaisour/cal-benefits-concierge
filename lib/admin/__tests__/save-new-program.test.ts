import { describe, expect, it, vi } from "vitest";
import { saveNewProgram } from "@/lib/admin/save-new-program";
import type { ProgramWritePayload } from "@/lib/admin/validate-program";

const payload: ProgramWritePayload = {
  name: "Test Program",
  slug: "test-program",
  category: "vehicles",
  benefit_type: "REBATE",
  status: "ACTIVE",
};

describe("saveNewProgram", () => {
  it("returns a slug error without calling create", async () => {
    const createProgram = vi.fn();
    const result = await saveNewProgram(payload, {
      slugIsTaken: async () => true,
      createProgram,
    });
    expect(result).toEqual({
      ok: false,
      errors: { slug: "That slug is already in use." },
    });
    expect(createProgram).not.toHaveBeenCalled();
  });

  it("maps thrown database errors to a form error", async () => {
    const result = await saveNewProgram(payload, {
      slugIsTaken: async () => false,
      createProgram: async () => {
        throw new Error("insert failed");
      },
    });
    expect(result).toEqual({
      ok: false,
      formError: "insert failed",
    });
  });

  it("returns the created program so the caller can redirect outside try/catch", async () => {
    const result = await saveNewProgram(payload, {
      slugIsTaken: async () => false,
      createProgram: async () => ({ id: "prog-1", slug: "test-program" }),
    });
    expect(result).toEqual({
      ok: true,
      program: { id: "prog-1", slug: "test-program" },
    });
  });
});
