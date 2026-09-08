import { describe, expect, it, vi } from "vitest";
import {
  HOMEPAGE_FEATURE_NOT_FOUND_ERROR,
  HOMEPAGE_FEATURE_UNAVAILABLE_ERROR,
  featureProgramOnHomepage,
  homepageFeatureEligibility,
} from "@/lib/admin/homepage-feature-eligibility";
import { PROGRAM_STATUSES, type ProgramStatus } from "@/types/database";

describe("homepageFeatureEligibility", () => {
  it("allows ACTIVE programs that are active", () => {
    expect(
      homepageFeatureEligibility({ active: true, status: "ACTIVE" }),
    ).toEqual({ ok: true });
  });

  it("rejects ACTIVE programs that are inactive", () => {
    expect(
      homepageFeatureEligibility({ active: false, status: "ACTIVE" }),
    ).toEqual({
      ok: false,
      formError: HOMEPAGE_FEATURE_UNAVAILABLE_ERROR,
    });
  });

  it.each(
    PROGRAM_STATUSES.filter((status) => status !== "ACTIVE") as ProgramStatus[],
  )("rejects %s programs even when active", (status) => {
    expect(homepageFeatureEligibility({ active: true, status })).toEqual({
      ok: false,
      formError: HOMEPAGE_FEATURE_UNAVAILABLE_ERROR,
    });
  });

  it("rejects a missing program", () => {
    expect(homepageFeatureEligibility(null)).toEqual({
      ok: false,
      formError: HOMEPAGE_FEATURE_NOT_FOUND_ERROR,
    });
  });
});

describe("featureProgramOnHomepage", () => {
  it("upserts only after a currently available program is loaded", async () => {
    const upsertHomepageFeature = vi.fn();
    const result = await featureProgramOnHomepage("prog-1", 10, {
      loadProgram: async () => ({ active: true, status: "ACTIVE" }),
      upsertHomepageFeature,
    });
    expect(result).toEqual({ ok: true });
    expect(upsertHomepageFeature).toHaveBeenCalledWith("prog-1", 10);
  });

  it("does not upsert WAITLIST or inactive programs", async () => {
    const upsertHomepageFeature = vi.fn();
    const waitlisted = await featureProgramOnHomepage("prog-wait", 10, {
      loadProgram: async () => ({ active: true, status: "WAITLIST" }),
      upsertHomepageFeature,
    });
    const inactive = await featureProgramOnHomepage("prog-off", 10, {
      loadProgram: async () => ({ active: false, status: "ACTIVE" }),
      upsertHomepageFeature,
    });
    expect(waitlisted.ok).toBe(false);
    expect(inactive.ok).toBe(false);
    expect(upsertHomepageFeature).not.toHaveBeenCalled();
  });
});
