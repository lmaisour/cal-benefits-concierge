import { describe, expect, it } from "vitest";
import { LIFE_ANNUAL_INCOME_LIMITS_BY_HOUSEHOLD_SIZE } from "@/data/programs/life-income-limits";
import { programCatalog } from "@/data/programs/index";
import { toMatchResponse } from "@/lib/eligibility/consumer-match";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import { sanitizeFollowupAnswers } from "@/lib/eligibility/validate-followup";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import { followupRowsFromCatalogSeeds } from "@/lib/programs/catalog-followup";
import { catalogToEngine } from "@/lib/programs/import/catalog-to-engine";

const engine = catalogToEngine(programCatalog);

function requireCatalogProgram(externalId: string) {
  const program = engine.programs.find((item) => item.external_id === externalId);
  if (!program) {
    throw new Error(`Missing ${externalId} in the catalog.`);
  }
  return program;
}

const lifeProgram = requireCatalogProgram("LA-VEH-METRO-LIFE");

const lifeRules = engine.rules.filter((rule) => rule.program_id === lifeProgram.id);
const lifeLocations = engine.locations.filter((location) => location.program_id === lifeProgram.id);
const lifeFollowup = followupRowsFromCatalogSeeds([lifeProgram]);

const leapProgram = requireCatalogProgram("LADWP-WATER-LEAP");
const leapRules = engine.rules.filter((rule) => rule.program_id === leapProgram.id);
const leapLocations = engine.locations.filter((location) => location.program_id === leapProgram.id);
const leapFollowup = followupRowsFromCatalogSeeds([leapProgram]);

function validatedProfile(
  overrides: Record<string, unknown> = {},
): ReturnType<typeof validateUserProfile> {
  return validateUserProfile({
    zip: "91331",
    household_size: 1,
    housing_status: "owner",
    property_type: "single_family",
    ...overrides,
  });
}

function evaluateLife(
  profileOverrides: Record<string, unknown> = {},
  answers: Record<string, unknown> = {},
) {
  const validated = validatedProfile(profileOverrides);
  expect(validated.ok).toBe(true);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  return evaluateProgram(lifeProgram, lifeRules, lifeLocations, validated.profile, {
    questions: lifeFollowup.questions,
    rules: lifeFollowup.rules,
    answers,
  });
}

function followupKeys(evaluation: ReturnType<typeof evaluateLife>): string[] {
  return evaluation.followupResults.map((result) => result.question.question_key);
}

function followupStatus(
  evaluation: ReturnType<typeof evaluateLife>,
  key: string,
): string | undefined {
  return evaluation.followupResults.find((result) => result.question.question_key === key)?.status;
}

describe("LIFE catalog model", () => {
  it("keeps consumer presentation and models only LIFE rules", () => {
    expect(lifeProgram.name).toBe("LA Metro LIFE Program");
    expect(lifeProgram.consumer_headline).toBe("Free rides for 90 days");
    expect(lifeProgram.administrator_display_name).toBe("LA Metro");
    expect(lifeProgram.consumer_tags).toEqual(["Low income", "Transit", "Los Angeles County"]);
    expect(lifeProgram.has_unmodeled_required_criteria).toBe(false);
    expect(lifeRules).toHaveLength(1);
    expect(lifeRules[0]?.operator).toBe("less_than_or_equal_by_household_size");
    expect(lifeRules[0]?.value).toEqual(LIFE_ANNUAL_INCOME_LIMITS_BY_HOUSEHOLD_SIZE);
    expect(lifeFollowup.questions.map((item) => item.question_key)).toEqual([
      "life_qualifying_public_benefit",
      "life_other_transit_subsidy",
    ]);
  });
});

describe("LIFE eligibility scenarios", () => {
  it("A: income-qualified LA County resident with no conflicting pass is LIKELY", () => {
    const evaluation = evaluateLife(
      { household_income: 40000 },
      { life_other_transit_subsidy: "no" },
    );
    expect(evaluation.geography.status).toBe("PASS");
    expect(evaluation.passedRequiredRules).toHaveLength(1);
    expect(followupKeys(evaluation)).toEqual(["life_other_transit_subsidy"]);
    expect(followupStatus(evaluation, "life_qualifying_public_benefit")).toBeUndefined();
    expect(followupStatus(evaluation, "life_other_transit_subsidy")).toBe("PASS");
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
  });

  it("B: income over the limit with unanswered benefit stays POSSIBLY and shows the benefit question", () => {
    const evaluation = evaluateLife(
      { household_income: 70000 },
      { life_other_transit_subsidy: "no" },
    );
    expect(evaluation.failedRequiredRules).toHaveLength(1);
    expect(followupStatus(evaluation, "life_qualifying_public_benefit")).toBe("UNKNOWN");
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    const consumer = toMatchResponse(
      { likelyEligible: [], possiblyEligible: [evaluation], notEligible: [] },
      {
        questions: lifeFollowup.questions,
        answersByProgramId: {
          [lifeProgram.id]: { life_other_transit_subsidy: "no" },
        },
      },
    );
    expect(consumer.possiblyEligible[0]?.followup?.questions.map((item) => item.key)).toContain(
      "life_qualifying_public_benefit",
    );
  });

  it("C: income over the limit plus qualifying benefit yes is LIKELY", () => {
    const evaluation = evaluateLife(
      { household_income: 70000 },
      {
        life_qualifying_public_benefit: "yes",
        life_other_transit_subsidy: "no",
      },
    );
    expect(evaluation.failedRequiredRules).toHaveLength(1);
    expect(evaluation.requiredGroups[0]?.status).toBe("PASS");
    expect(followupStatus(evaluation, "life_qualifying_public_benefit")).toBe("PASS");
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
  });

  it("D: income over the limit plus qualifying benefit no is NOT_ELIGIBLE", () => {
    const evaluation = evaluateLife(
      { household_income: 70000 },
      {
        life_qualifying_public_benefit: "no",
        life_other_transit_subsidy: "no",
      },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });

  it("E: income-qualified applicant with GoPass is NOT_ELIGIBLE", () => {
    const evaluation = evaluateLife(
      { household_income: 40000 },
      { life_other_transit_subsidy: "gopass" },
    );
    expect(evaluation.passedRequiredRules).toHaveLength(1);
    expect(followupStatus(evaluation, "life_other_transit_subsidy")).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });

  it("F: income-qualified applicant with another transit program stays POSSIBLY", () => {
    const evaluation = evaluateLife(
      { household_income: 40000 },
      { life_other_transit_subsidy: "other" },
    );
    expect(followupStatus(evaluation, "life_other_transit_subsidy")).toBe("UNKNOWN");
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });

  it("G: missing income plus qualifying benefit yes PASSes the financial OR", () => {
    const evaluation = evaluateLife(
      {},
      {
        life_qualifying_public_benefit: "yes",
        life_other_transit_subsidy: "no",
      },
    );
    expect(evaluation.unknownRequiredRules).toHaveLength(1);
    expect(evaluation.requiredGroups[0]?.status).toBe("PASS");
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
  });

  it("H: a non-Los Angeles County ZIP is NOT_ELIGIBLE regardless of the financial path", () => {
    const evaluation = evaluateLife(
      { zip: "94110", household_income: 40000 },
      {
        life_qualifying_public_benefit: "yes",
        life_other_transit_subsidy: "no",
      },
    );
    expect(evaluation.geography.status).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });
});

describe("LIFE income table boundaries", () => {
  it("passes at the exact published limit and fails one dollar over when benefit is unanswered", () => {
    for (const [size, limit] of Object.entries(LIFE_ANNUAL_INCOME_LIMITS_BY_HOUSEHOLD_SIZE)) {
      const atLimit = evaluateLife(
        { household_size: Number(size), household_income: limit },
        { life_other_transit_subsidy: "no" },
      );
      expect(atLimit.status, `size ${size} at ${limit}`).toBe("LIKELY_ELIGIBLE");
      expect(followupKeys(atLimit)).not.toContain("life_qualifying_public_benefit");

      const over = evaluateLife(
        { household_size: Number(size), household_income: limit + 1 },
        { life_other_transit_subsidy: "no" },
      );
      expect(over.status, `size ${size} at ${limit + 1}`).toBe("POSSIBLY_ELIGIBLE");
      expect(followupStatus(over, "life_qualifying_public_benefit")).toBe("UNKNOWN");
    }
  });

  it("does not invent a limit for household size above 8", () => {
    const evaluation = evaluateLife(
      { household_size: 9, household_income: 40000 },
      { life_other_transit_subsidy: "no" },
    );
    expect(evaluation.unknownRequiredRules[0]?.status).toBe("UNKNOWN");
    expect(evaluation.unknownRequiredRules[0]?.explanation).toMatch(/household size/i);
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });

  it("treats missing income plus benefit no as UNKNOWN, not FAIL", () => {
    const evaluation = evaluateLife(
      {},
      {
        life_qualifying_public_benefit: "no",
        life_other_transit_subsidy: "no",
      },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("UNKNOWN");
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.status).not.toBe("NOT_ELIGIBLE");
  });
});

describe("LIFE conflicting transit follow-up", () => {
  it("fails named Metro conflicts and keeps other/not_sure UNKNOWN", () => {
    expect(
      followupStatus(
        evaluateLife({ household_income: 40000 }, { life_other_transit_subsidy: "college_upass" }),
        "life_other_transit_subsidy",
      ),
    ).toBe("FAIL");
    expect(
      evaluateLife({ household_income: 40000 }, { life_other_transit_subsidy: "college_upass" })
        .status,
    ).toBe("NOT_ELIGIBLE");

    expect(
      evaluateLife({ household_income: 40000 }, { life_other_transit_subsidy: "employer_pass" })
        .status,
    ).toBe("NOT_ELIGIBLE");

    expect(
      followupStatus(
        evaluateLife({ household_income: 40000 }, { life_other_transit_subsidy: "not_sure" }),
        "life_other_transit_subsidy",
      ),
    ).toBe("UNKNOWN");
    expect(
      evaluateLife({ household_income: 40000 }, { life_other_transit_subsidy: "not_sure" }).status,
    ).toBe("POSSIBLY_ELIGIBLE");
  });
});

describe("LIFE profile and supplemental isolation", () => {
  it("does not treat age under 18 as NOT_ELIGIBLE", () => {
    const validated = validatedProfile({ household_income: 40000, age: 16 });
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(validated.profile.age).toBeUndefined();
    const evaluation = evaluateProgram(lifeProgram, lifeRules, lifeLocations, validated.profile, {
      questions: lifeFollowup.questions,
      rules: lifeFollowup.rules,
      answers: { life_other_transit_subsidy: "no" },
    });
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
  });

  it("does not let supplemental answers override core profile facts", () => {
    const validated = validatedProfile({
      zip: "94110",
      household_income: 40000,
      county: "Los Angeles",
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(validated.profile.county).toBe("San Francisco");

    const sneaky = sanitizeFollowupAnswers(
      {
        [lifeProgram.id]: {
          life_qualifying_public_benefit: "yes",
          life_other_transit_subsidy: "no",
          zip: "91331",
          county: "Los Angeles",
          household_income: 10000,
          household_size: 1,
        },
      },
      lifeFollowup.questions,
    );
    expect(sneaky[lifeProgram.id]?.zip).toBeUndefined();
    expect(sneaky[lifeProgram.id]?.county).toBeUndefined();
    expect(sneaky[lifeProgram.id]?.household_income).toBeUndefined();

    const evaluation = evaluateProgram(lifeProgram, lifeRules, lifeLocations, validated.profile, {
      questions: lifeFollowup.questions,
      rules: lifeFollowup.rules,
      answers: {
        ...sneaky[lifeProgram.id],
        zip: "91331",
        county: "Los Angeles",
        household_income: 10000,
      },
    });
    expect(evaluation.geography.status).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });
});

describe("LEAP catalog follow-up is unchanged", () => {
  const ownerProfile = {
    zip: "91331",
    household_size: 2,
    housing_status: "owner" as const,
    property_type: "single_family" as const,
  };

  it("stays POSSIBLY when modeled follow-ups pass because DAC remains unmodeled", () => {
    const evaluation = evaluateProgram(leapProgram, leapRules, leapLocations, ownerProfile, {
      questions: leapFollowup.questions,
      rules: leapFollowup.rules,
      answers: {
        ladwp_water_service: "yes",
        front_yard_grass_size: "500_to_3000",
      },
    });
    expect(leapFollowup.rules.every((rule) => rule.satisfies_rule_group == null)).toBe(true);
    expect(evaluation.failedRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.unknownRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.hasUnmodeledRequiredCriteria).toBe(true);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.status).not.toBe("LIKELY_ELIGIBLE");
  });

  it("still fails when LADWP water service is no", () => {
    const evaluation = evaluateProgram(leapProgram, leapRules, leapLocations, ownerProfile, {
      questions: leapFollowup.questions,
      rules: leapFollowup.rules,
      answers: {
        ladwp_water_service: "no",
        front_yard_grass_size: "500_to_3000",
      },
    });
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });
});
