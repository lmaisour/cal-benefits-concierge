import { describe, expect, it } from "vitest";
import { toMatchResponse } from "@/lib/eligibility/consumer-match";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import { sanitizeFollowupAnswers } from "@/lib/eligibility/validate-followup";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import {
  makeFollowupQuestion,
  makeFollowupRule,
  makeProgram,
  makeRule,
  matchingEvProfile,
  statewideLocations,
  valleyFirstEvLocations,
  valleyFirstEvProgram,
  valleyFirstEvRules,
} from "@/lib/eligibility/__tests__/fixtures";

const LEAP_ID = "leap-followup-program";
const leapProgram = makeProgram({
  id: LEAP_ID,
  name: "Sample Landscape Program",
  slug: "sample-landscape-followup",
  statewide: true,
  has_unmodeled_required_criteria: true,
  unmodeled_required_criteria_summary:
    "You must live in a qualifying disadvantaged community. Address-based DAC eligibility is not confirmed here.",
});
const leapLocations = statewideLocations(LEAP_ID);
const propertyRule = makeRule({
  program_id: LEAP_ID,
  field: "property_type",
  operator: "equals",
  value: "single_family",
  explanation: "Published for qualifying single-family homes.",
});

const waterQuestion = makeFollowupQuestion({
  id: "q-water",
  program_id: LEAP_ID,
  question_key: "ladwp_water_service",
  question: "Does LADWP provide water service to this property?",
  sort_order: 10,
  cta_label: "Check LEAP eligibility",
});
const grassQuestion = makeFollowupQuestion({
  id: "q-grass",
  program_id: LEAP_ID,
  question_key: "front_yard_grass_size",
  question: "About how much living grass is currently in your front yard?",
  options: [
    { value: "under_500", label: "Less than 500 sq. ft." },
    { value: "500_to_3000", label: "500–3,000 sq. ft." },
    { value: "over_3000", label: "More than 3,000 sq. ft." },
    { value: "not_sure", label: "Not sure", unknown: true },
  ],
  sort_order: 20,
});
const permissionQuestion = makeFollowupQuestion({
  id: "q-permission",
  program_id: LEAP_ID,
  question_key: "property_owner_permission",
  question: "Can you get written permission from the property owner for the landscaping project?",
  sort_order: 30,
  display_when_field: "housing_status",
  display_when_operator: "not_equals",
  display_when_value: "owner",
});

const leapQuestions = [waterQuestion, grassQuestion, permissionQuestion];
const leapFollowupRules = [
  makeFollowupRule({
    program_id: LEAP_ID,
    question_id: waterQuestion.id,
    expected_value: "yes",
    explanation: "LADWP must provide water service to the property.",
  }),
  makeFollowupRule({
    program_id: LEAP_ID,
    question_id: grassQuestion.id,
    expected_value: "500_to_3000",
    explanation: "The front yard must have about 500 to 3,000 square feet of living grass.",
  }),
  makeFollowupRule({
    program_id: LEAP_ID,
    question_id: permissionQuestion.id,
    expected_value: "yes",
    explanation: "Written permission from the property owner is required when you do not own the home.",
  }),
];

const ownerProfile = {
  zip: "91331",
  household_size: 2,
  housing_status: "owner" as const,
  property_type: "single_family" as const,
};

const renterProfile = {
  ...ownerProfile,
  housing_status: "renter" as const,
};

const passingAnswers = {
  ladwp_water_service: "yes",
  front_yard_grass_size: "500_to_3000",
  property_owner_permission: "yes",
};

function evaluateLeap(
  profile: typeof ownerProfile | typeof renterProfile,
  answers: Record<string, unknown> = {},
) {
  return evaluateProgram(leapProgram, [propertyRule], leapLocations, profile, {
    questions: leapQuestions,
    rules: leapFollowupRules,
    answers,
  });
}

describe("programs without follow-ups", () => {
  it("keep the same buckets whether follow-up input is omitted or empty", () => {
    const profile = { ...matchingEvProfile, household_size: 2, housing_status: "owner" as const, property_type: "single_family" as const };
    const without = matchPrograms(
      [valleyFirstEvProgram],
      valleyFirstEvRules,
      valleyFirstEvLocations,
      profile,
    );
    const withEmpty = matchPrograms(
      [valleyFirstEvProgram],
      valleyFirstEvRules,
      valleyFirstEvLocations,
      profile,
      { questions: [], rules: [], answersByProgramId: {} },
    );
    expect(without.likelyEligible.map((item) => item.status)).toEqual(
      withEmpty.likelyEligible.map((item) => item.status),
    );
    expect(without.possiblyEligible).toEqual(withEmpty.possiblyEligible);
    expect(without.notEligible.map((item) => item.program.id)).toEqual(
      withEmpty.notEligible.map((item) => item.program.id),
    );
    const consumer = toMatchResponse(without);
    expect(consumer.likelyEligible[0]?.followup).toBeNull();
    expect(consumer.notEligible).toEqual([]);
  });
});

describe("supplemental follow-up evaluation", () => {
  it("keeps a program Possible when all supplemental criteria pass but DAC is unmodeled", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "yes",
      front_yard_grass_size: "500_to_3000",
    });
    expect(evaluation.failedRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.unknownRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.hasUnmodeledRequiredCriteria).toBe(true);
  });

  it("returns NOT_ELIGIBLE when one supplemental criterion fails", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "no",
      front_yard_grass_size: "500_to_3000",
    });
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
    expect(evaluation.failedRequiredFollowupRules.map((item) => item.question.question_key)).toEqual([
      "ladwp_water_service",
    ]);
  });

  it("treats Not sure as UNKNOWN, never FAIL", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "not_sure",
      front_yard_grass_size: "500_to_3000",
    });
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.failedRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.unknownRequiredFollowupRules.map((item) => item.question.question_key)).toEqual([
      "ladwp_water_service",
    ]);
  });

  it("treats a missing answer as UNKNOWN", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      front_yard_grass_size: "500_to_3000",
    });
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.unknownRequiredFollowupRules.map((item) => item.question.question_key)).toEqual([
      "ladwp_water_service",
    ]);
  });

  it("passes for a renter who has owner permission", () => {
    const evaluation = evaluateLeap(renterProfile, passingAnswers);
    expect(
      evaluation.followupResults.find((item) => item.question.question_key === "property_owner_permission")
        ?.status,
    ).toBe("PASS");
    expect(evaluation.failedRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });

  it("fails for a renter who cannot get owner permission", () => {
    const evaluation = evaluateLeap(renterProfile, {
      ...passingAnswers,
      property_owner_permission: "no",
    });
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
    expect(
      evaluation.failedRequiredFollowupRules.map((item) => item.question.question_key),
    ).toEqual(["property_owner_permission"]);
  });

  it("does not ask homeowners the permission question", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "yes",
      front_yard_grass_size: "500_to_3000",
    });
    expect(
      evaluation.followupResults.some(
        (item) => item.question.question_key === "property_owner_permission",
      ),
    ).toBe(false);
    const consumer = toMatchResponse(
      {
        likelyEligible: [],
        possiblyEligible: [evaluation],
        notEligible: [],
      },
      { questions: leapQuestions, answersByProgramId: { [LEAP_ID]: { ladwp_water_service: "yes", front_yard_grass_size: "500_to_3000" } } },
    );
    expect(consumer.possiblyEligible[0]?.followup?.questions.map((item) => item.key)).toEqual([
      "ladwp_water_service",
      "front_yard_grass_size",
    ]);
    expect(consumer.possiblyEligible[0]?.followup?.ctaLabel).toBe("Check LEAP eligibility");
  });

  it("unknown DAC requirement prevents LIKELY_ELIGIBLE even when every executable criterion passes", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "yes",
      front_yard_grass_size: "500_to_3000",
    });
    expect(evaluation.passedRequiredRules).toHaveLength(1);
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(evaluation.unknownRequiredRules).toHaveLength(0);
    expect(evaluation.failedRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.unknownRequiredFollowupRules).toHaveLength(0);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.status).not.toBe("LIKELY_ELIGIBLE");
  });

  it("does not let client-supplied derived facts override the core profile", () => {
    const validated = validateUserProfile({
      ...renterProfile,
      homeowner: true,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(validated.profile.homeowner).toBe(false);

    const sneaky = sanitizeFollowupAnswers(
      {
        [LEAP_ID]: {
          ...passingAnswers,
          homeowner: true,
          housing_status: "owner",
          property_type: "single_family",
        },
      },
      leapQuestions,
    );
    expect(sneaky[LEAP_ID]?.homeowner).toBeUndefined();
    expect(sneaky[LEAP_ID]?.housing_status).toBeUndefined();
    expect(sneaky[LEAP_ID]?.property_type).toBeUndefined();

    const evaluation = evaluateProgram(
      leapProgram,
      [propertyRule],
      leapLocations,
      validated.profile,
      {
        questions: leapQuestions,
        rules: leapFollowupRules,
        answers: {
          ...sneaky[LEAP_ID],
          homeowner: true,
          housing_status: "owner",
        },
      },
    );
    expect(
      evaluation.followupResults.some(
        (item) => item.question.question_key === "property_owner_permission",
      ),
    ).toBe(true);
  });

  it("surfaces a failed follow-up program in the consumer notEligible list", () => {
    const evaluation = evaluateLeap(ownerProfile, {
      ladwp_water_service: "no",
      front_yard_grass_size: "500_to_3000",
    });
    const consumer = toMatchResponse(
      { likelyEligible: [], possiblyEligible: [], notEligible: [evaluation] },
      {
        questions: leapQuestions,
        answersByProgramId: {
          [LEAP_ID]: { ladwp_water_service: "no", front_yard_grass_size: "500_to_3000" },
        },
      },
    );
    expect(consumer.notEligible).toHaveLength(1);
    expect(consumer.notEligible[0]?.eligibilityStatus).toBe("NOT_ELIGIBLE");
    expect(consumer.notEligible[0]?.followup?.criteria.some((item) => item.status === "failed")).toBe(
      true,
    );
  });
});
