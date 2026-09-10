import { describe, expect, it, vi } from "vitest";
import { saveNewGuide } from "@/lib/admin/save-new-guide";
import type { GuideWritePayload } from "@/lib/admin/validate-guide";

const payload: GuideWritePayload = {
  title: "Test guide",
  slug: "test-guide",
  body: "",
  published: false,
};

describe("saveNewGuide", () => {
  it("returns a slug error without creating", async () => {
    const createGuide = vi.fn();
    const result = await saveNewGuide(payload, [], {
      slugIsTaken: async () => true,
      createGuide,
      replaceGuidePrograms: async () => undefined,
    });
    expect(result.ok).toBe(false);
    expect(createGuide).not.toHaveBeenCalled();
  });

  it("creates then attaches related programs", async () => {
    const replaceGuidePrograms = vi.fn();
    const result = await saveNewGuide(
      payload,
      ["11111111-1111-1111-1111-111111111111"],
      {
        slugIsTaken: async () => false,
        createGuide: async () => ({ id: "guide-1", slug: "test-guide" }),
        replaceGuidePrograms,
      },
    );
    expect(result).toEqual({
      ok: true,
      guide: { id: "guide-1", slug: "test-guide" },
    });
    expect(replaceGuidePrograms).toHaveBeenCalledWith("guide-1", [
      "11111111-1111-1111-1111-111111111111",
    ]);
  });
});
