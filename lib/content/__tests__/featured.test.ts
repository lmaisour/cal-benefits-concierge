import { describe, expect, it } from "vitest";
import { selectHomepageFeatured } from "@/lib/content/featured";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import type { ProgramStatus } from "@/types/database";

function program(overrides: {
  name: string;
  status?: ProgramStatus;
  active?: boolean;
}) {
  return {
    name: overrides.name,
    status: overrides.status ?? "ACTIVE",
    active: overrides.active ?? true,
  };
}

describe("isCurrentlyAvailable", () => {
  it("requires active and ACTIVE status", () => {
    expect(isCurrentlyAvailable(program({ name: "A" }))).toBe(true);
    expect(isCurrentlyAvailable(program({ name: "A", status: "WAITLIST" }))).toBe(
      false,
    );
    expect(
      isCurrentlyAvailable(program({ name: "A", status: "FUNDING_EXHAUSTED" })),
    ).toBe(false);
    expect(isCurrentlyAvailable(program({ name: "A", active: false }))).toBe(false);
  });
});

describe("selectHomepageFeatured", () => {
  it("keeps only currently available programs and sorts by order then name", () => {
    const selected = selectHomepageFeatured([
      { sort_order: 20, program: program({ name: "City Plants" }) },
      { sort_order: 10, program: program({ name: "MyFirstEV" }) },
      { sort_order: 30, program: program({ name: "SGIP", status: "WAITLIST" }) },
      {
        sort_order: 15,
        program: program({ name: "TECH", status: "FUNDING_EXHAUSTED", active: false }),
      },
      { sort_order: 5, program: null },
    ]);
    expect(selected.map((item) => item.name)).toEqual(["MyFirstEV", "City Plants"]);
  });
});
