import { describe, expect, it } from "vitest";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";

const validProfile = {
  zip: "91331",
  household_size: 3,
  housing_status: "owner",
  property_type: "single_family",
  household_income: 65000,
  age: 42,
  homeowner: true,
  veteran: false,
  electric_utility: "PG&E",
  vehicle_condition: "new",
  vehicle_price: 28000,
  interests: ["vehicles", "home-upgrades"],
};

describe("validateUserProfile", () => {
  it("accepts a valid completed profile", () => {
    const result = validateUserProfile(validProfile);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.zip).toBe("91331");
      expect(result.profile.household_size).toBe(3);
      expect(result.profile.housing_status).toBe("owner");
      expect(result.profile.property_type).toBe("single_family");
      expect(result.profile.household_income).toBe(65000);
      expect(result.profile.age).toBe(42);
      expect(result.profile.homeowner).toBe(true);
      expect(result.profile.interests).toEqual(["vehicles", "home-upgrades"]);
    }
  });

  it("rejects a missing ZIP", () => {
    const { zip, ...rest } = validProfile;
    expect(zip).toBe("91331");
    const result = validateUserProfile(rest);
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed ZIP", () => {
    expect(validateUserProfile({ ...validProfile, zip: "9133" }).ok).toBe(false);
    expect(validateUserProfile({ ...validProfile, zip: 91331 }).ok).toBe(false);
  });

  it("rejects household size out of range or non-integer", () => {
    expect(validateUserProfile({ ...validProfile, household_size: 0 }).ok).toBe(
      false,
    );
    expect(validateUserProfile({ ...validProfile, household_size: 21 }).ok).toBe(
      false,
    );
    expect(validateUserProfile({ ...validProfile, household_size: 3.5 }).ok).toBe(
      false,
    );
    expect(validateUserProfile({ ...validProfile, household_size: "3" }).ok).toBe(
      false,
    );
  });

  it("rejects an invalid required enum and discards an invalid optional enum", () => {
    expect(
      validateUserProfile({ ...validProfile, housing_status: "landlord" }).ok,
    ).toBe(false);
    const discarded = validateUserProfile({
      ...validProfile,
      vehicle_condition: "lease",
    });
    expect(discarded.ok).toBe(true);
    if (discarded.ok) {
      expect(discarded.profile.vehicle_condition).toBeUndefined();
    }
  });

  it("ignores unknown fields", () => {
    const result = validateUserProfile({
      ...validProfile,
      ssn: "123-45-6789",
      extra: { nested: true },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile).not.toHaveProperty("ssn");
      expect(result.profile).not.toHaveProperty("extra");
    }
  });

  it("does not coerce booleans from strings", () => {
    const result = validateUserProfile({
      ...validProfile,
      veteran: "true",
      disability: "false",
      homeowner: "yes",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.veteran).toBeUndefined();
      expect(result.profile.disability).toBeUndefined();
      expect(result.profile.homeowner).toBe(true);
    }
  });

  it("preserves valid optional fields", () => {
    const result = validateUserProfile(validProfile);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.electric_utility).toBe("PG&E");
      expect(result.profile.vehicle_price).toBe(28000);
      expect(result.profile.vehicle_condition).toBe("new");
      expect(result.profile.age).toBe(42);
    }
  });

  it("preserves known interests", () => {
    const result = validateUserProfile({
      ...validProfile,
      interests: ["vehicles", "solar", "tax-credits"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.interests).toEqual([
        "vehicles",
        "solar",
        "tax-credits",
      ]);
    }
  });

  it("discards unknown interests without rejecting the profile", () => {
    const result = validateUserProfile({
      ...validProfile,
      interests: ["everything", "not-a-real-interest"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.interests).toBeUndefined();
      expect(result.profile.zip).toBe("91331");
    }
  });

  it("keeps only valid interests when mixed with invalid values", () => {
    const result = validateUserProfile({
      ...validProfile,
      interests: ["vehicles", "everything", "water", "", 12, "solar"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.interests).toEqual(["vehicles", "water", "solar"]);
    }
  });

  it("deduplicates valid interests", () => {
    const result = validateUserProfile({
      ...validProfile,
      interests: ["vehicles", "vehicles", " home-upgrades ", "home-upgrades"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.interests).toEqual(["vehicles", "home-upgrades"]);
    }
  });

  it("derives homeowner from housing status instead of trusting input", () => {
    const renter = validateUserProfile({
      ...validProfile,
      housing_status: "renter",
      homeowner: true,
    });
    expect(renter.ok).toBe(true);
    if (renter.ok) expect(renter.profile.homeowner).toBe(false);

    const owner = validateUserProfile({ ...validProfile, homeowner: false });
    expect(owner.ok).toBe(true);
    if (owner.ok) expect(owner.profile.homeowner).toBe(true);
  });

  it("derives first_ev from owned_zev_before instead of trusting input", () => {
    const first = validateUserProfile({
      ...validProfile,
      owned_zev_before: false,
      first_ev: false,
    });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.profile.first_ev).toBe(true);

    const notFirst = validateUserProfile({
      ...validProfile,
      owned_zev_before: true,
      first_ev: true,
    });
    expect(notFirst.ok).toBe(true);
    if (notFirst.ok) expect(notFirst.profile.first_ev).toBe(false);
  });

  it("ignores incoming first_ev when owned_zev_before is unknown", () => {
    const result = validateUserProfile({ ...validProfile, first_ev: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.first_ev).toBeUndefined();
  });

  it("derives home improvement interest only from sanitized interests", () => {
    for (const interest of ["home-upgrades", "solar", "home-repairs"]) {
      const result = validateUserProfile({ ...validProfile, interests: [interest] });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.profile.home_improvement_interest).toBe(true);
    }

    const unrelated = validateUserProfile({
      ...validProfile,
      interests: ["vehicles"],
      home_improvement_interest: true,
    });
    expect(unrelated.ok).toBe(true);
    if (unrelated.ok) {
      expect(unrelated.profile.home_improvement_interest).toBeUndefined();
    }
  });
});
