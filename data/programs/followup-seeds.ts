import type { RuleOperator } from "@/types/program";

export type CatalogFollowupOption = {
  value: string;
  label: string;
  unknown?: boolean;
};

export type CatalogFollowupQuestionSeed = {
  questionKey: string;
  question: string;
  helpText: string | null;
  options: CatalogFollowupOption[];
  sortOrder: number;
  required: boolean;
  displayWhenField: string | null;
  displayWhenOperator: RuleOperator | null;
  displayWhenValue: unknown;
  ctaLabel: string | null;
  operator: RuleOperator;
  expectedValue: unknown;
  ruleRequired: boolean;
  explanation: string;
  /** OR alternative for a core `program_rules.rule_group`. Null = independent AND. */
  satisfiesRuleGroup?: number | null;
};

export type CatalogFollowupProgramSeed = {
  externalId: string;
  questions: CatalogFollowupQuestionSeed[];
};

/**
 * Catalog-defined follow-up questions used only when the
 * `program_followup_*` tables are not yet available. Database rows win once
 * the migration has been applied. The eligibility evaluator stays generic.
 */
export const CATALOG_FOLLOWUP_SEEDS: CatalogFollowupProgramSeed[] = [
  {
    externalId: "LADWP-WATER-LEAP",
    questions: [
      {
        questionKey: "ladwp_water_service",
        question: "Does LADWP provide water service to this property?",
        helpText: "LEAP is for LADWP water customers. Choose Not sure if you do not know.",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure", unknown: true },
        ],
        sortOrder: 10,
        required: true,
        displayWhenField: null,
        displayWhenOperator: null,
        displayWhenValue: null,
        ctaLabel: "Check LEAP eligibility",
        operator: "equals",
        expectedValue: "yes",
        ruleRequired: true,
        explanation: "LADWP must provide water service to the property.",
      },
      {
        questionKey: "front_yard_grass_size",
        question: "About how much living grass is currently in your front yard?",
        helpText:
          "Parkway grass may count toward the published range. Choose Not sure if you have not measured.",
        options: [
          { value: "under_500", label: "Less than 500 sq. ft." },
          { value: "500_to_3000", label: "500–3,000 sq. ft." },
          { value: "over_3000", label: "More than 3,000 sq. ft." },
          { value: "not_sure", label: "Not sure", unknown: true },
        ],
        sortOrder: 20,
        required: true,
        displayWhenField: null,
        displayWhenOperator: null,
        displayWhenValue: null,
        ctaLabel: null,
        operator: "equals",
        expectedValue: "500_to_3000",
        ruleRequired: true,
        explanation: "The front yard must have about 500 to 3,000 square feet of living grass.",
      },
      {
        questionKey: "property_owner_permission",
        question:
          "Can you get written permission from the property owner for the landscaping project?",
        helpText: "Required when you are not the owner of record.",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure", unknown: true },
        ],
        sortOrder: 30,
        required: true,
        displayWhenField: "housing_status",
        displayWhenOperator: "not_equals",
        displayWhenValue: "owner",
        ctaLabel: null,
        operator: "equals",
        expectedValue: "yes",
        ruleRequired: true,
        explanation:
          "Written permission from the property owner is required when you do not own the home.",
      },
    ],
  },
  {
    externalId: "LA-VEH-METRO-LIFE",
    questions: [
      {
        questionKey: "life_qualifying_public_benefit",
        question: "Are you currently enrolled in any of these programs?",
        helpText:
          "Some LIFE applicants can qualify through participation in another public-benefit program even if household income is above the listed LIFE limit. Examples include CalFresh / SNAP / EBT, Medi-Cal, reduced-price or free school lunch where Metro recognizes it, Social Security, Social Security Disability, and TANF.",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "I'm not sure", unknown: true },
        ],
        sortOrder: 10,
        required: true,
        displayWhenField: null,
        displayWhenOperator: null,
        displayWhenValue: null,
        ctaLabel: "Check LIFE eligibility",
        operator: "equals",
        expectedValue: "yes",
        ruleRequired: true,
        explanation:
          "Enrollment in a qualifying public-benefit program can satisfy LIFE financial eligibility.",
        satisfiesRuleGroup: 1,
      },
      {
        questionKey: "life_other_transit_subsidy",
        question:
          "Are you currently getting free or discounted transit through another transit program?",
        helpText:
          "Metro’s LIFE page lists GoPass, College U-Pass, and Employer Pass as conflicting examples. Another discount program is not treated as an automatic conflict here unless Metro names it.",
        options: [
          { value: "no", label: "No" },
          { value: "gopass", label: "GoPass" },
          { value: "college_upass", label: "College U-Pass" },
          { value: "employer_pass", label: "Employer transit pass" },
          {
            value: "other",
            label: "Another transit discount program",
            unknown: true,
          },
          { value: "not_sure", label: "I'm not sure", unknown: true },
        ],
        sortOrder: 20,
        required: true,
        displayWhenField: null,
        displayWhenOperator: null,
        displayWhenValue: null,
        ctaLabel: null,
        operator: "equals",
        expectedValue: "no",
        ruleRequired: true,
        explanation:
          "LIFE cannot be combined with GoPass, College U-Pass, or an employer transit pass.",
      },
    ],
  },
];
