import { loc, pack, program, rule, src, type Draft } from "@/data/programs/helpers";

const pgeElectricOrGas = (id: string) => [
  rule(
    id,
    "electric_utility",
    "in",
    ["PG&E"],
    "PG&E hardship programs are for PG&E electric and/or gas residential customers.",
    { rule_group: 1, group_operator: "OR" },
  ),
  rule(
    id,
    "gas_utility",
    "in",
    ["PG&E"],
    "A PG&E gas account can also qualify if you do not take PG&E electricity.",
    { rule_group: 1, group_operator: "OR" },
  ),
];

const sdgeElectricOrGas = (id: string) => [
  rule(
    id,
    "electric_utility",
    "in",
    ["SDG&E"],
    "Neighbor-to-Neighbor is for SDG&E residential customers.",
    { rule_group: 1, group_operator: "OR" },
  ),
  rule(
    id,
    "gas_utility",
    "in",
    ["SDG&E"],
    "An SDG&E gas account can also qualify.",
    { rule_group: 1, group_operator: "OR" },
  ),
];

const drafts: Draft[] = [
  {
    program: program({
      external_id: "PGE-REACH",
      name: "PG&E REACH",
      slug: "pge-reach",
      administrator: "Pacific Gas and Electric Company",
      category: "utilities",
      subcategory: "hardship",
      short_description:
        "A one-time PG&E bill credit of up to $800 for income-eligible customers with a disconnection notice.",
      description:
        "Relief for Energy Assistance through Community Help (REACH) applies an energy credit of up to $800 toward the past-due portion of a PG&E bill. Official 2026 eligibility includes a 15-day or 48-hour disconnection notice, no REACH award in the same calendar year, and income at or below 200% of the federal poverty level using CARE guidelines. AMP customers are not eligible. Funding is first-come. The income table is not encoded as a single household_income number.",
      benefit_summary: "Up to $800 toward a past-due PG&E bill",
      benefit_type: "BILL_SAVINGS",
      benefit_min: null,
      benefit_max: 800,
      benefit_period: "one_time",
      status: "ACTIVE",
      official_url:
        "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/relief-for-energy-assistance-through-community-help.html",
      application_url: "https://myappconnect.com/pge/",
      statewide: false,
      preapproval_required: true,
      purchase_before_approval_allowed: null,
      effective_start: "2026-01-01",
      effective_end: "2026-12-31",
      confidence: "HIGH",
      featured: false,
      active: true,
    }),
    sources: [
      src(
        "PGE-REACH",
        "GENERAL",
        "PG&E",
        "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/relief-for-energy-assistance-through-community-help.html",
      ),
      src("PGE-REACH", "APPLICATION", "Dollar Energy Fund", "https://myappconnect.com/pge/"),
      src(
        "PGE-REACH",
        "BENEFIT",
        "PG&E",
        "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/relief-for-energy-assistance-through-community-help.html",
      ),
    ],
    rules: pgeElectricOrGas("PGE-REACH"),
  },
  {
    program: program({
      external_id: "PGE-MATCH-MY-PAYMENT",
      name: "PG&E Match My Payment",
      slug: "pge-match-my-payment",
      administrator: "Pacific Gas and Electric Company",
      category: "utilities",
      subcategory: "hardship",
      short_description:
        "Dollar-for-dollar matching of qualifying payments toward a past-due PG&E bill, up to $1,000.",
      description:
        "PG&E’s official Match My Payment page offers a match of every dollar you pay, up to $1,000, toward a past-due balance of at least $100. You must make a $50–$1,000 payment after enrollment. Income must be below 400% of the federal poverty level through May 31, 2027. AMP customers are not eligible. Funding is first-come. The 400% FPL table is not encoded as a single household_income number.",
      benefit_summary: "Up to $1,000 in matching payments toward a past-due PG&E bill",
      benefit_type: "BILL_SAVINGS",
      benefit_min: null,
      benefit_max: 1000,
      benefit_period: "one_time",
      status: "ACTIVE",
      official_url:
        "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/match-my-payment-program.html",
      application_url: "https://myappconnect.com/pge/",
      statewide: false,
      preapproval_required: true,
      purchase_before_approval_allowed: null,
      effective_start: null,
      effective_end: "2027-05-31",
      confidence: "HIGH",
      featured: false,
      active: true,
    }),
    sources: [
      src(
        "PGE-MATCH-MY-PAYMENT",
        "GENERAL",
        "PG&E",
        "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/match-my-payment-program.html",
      ),
      src("PGE-MATCH-MY-PAYMENT", "APPLICATION", "Dollar Energy Fund", "https://myappconnect.com/pge/"),
    ],
    rules: pgeElectricOrGas("PGE-MATCH-MY-PAYMENT"),
  },
  {
    program: program({
      external_id: "SCE-EAF",
      name: "SCE Energy Assistance Fund",
      slug: "sce-energy-assistance-fund",
      administrator: "Southern California Edison",
      category: "utilities",
      subcategory: "hardship",
      short_description: "One-time SCE bill help of up to $200, or $300 for an all-electric household.",
      description:
        "SCE’s Energy Assistance Fund, administered with United Way, can apply up to $200 (or $300 for an all-electric household) toward an SCE bill once in a 12-month period. Official income guidelines on the page match the June 1, 2026–May 31, 2027 CARE table. Those household-size amounts are not encoded as a single income number.",
      benefit_summary: "Up to $200, or $300 for an all-electric household, toward an SCE bill",
      benefit_type: "BILL_SAVINGS",
      benefit_min: null,
      benefit_max: 300,
      benefit_period: "one_time",
      status: "ACTIVE",
      official_url: "https://www.sce.com/residential/assistance/energy-assistance-fund",
      application_url: "https://www.sce.com/residential/assistance/energy-assistance-fund",
      statewide: false,
      preapproval_required: true,
      purchase_before_approval_allowed: null,
      effective_start: "2026-06-01",
      effective_end: "2027-05-31",
      confidence: "HIGH",
      featured: false,
      active: true,
    }),
    sources: [
      src("SCE-EAF", "GENERAL", "Southern California Edison", "https://www.sce.com/residential/assistance/energy-assistance-fund"),
      src("SCE-EAF", "BENEFIT", "Southern California Edison", "https://www.sce.com/residential/assistance/energy-assistance-fund"),
    ],
    locations: [loc("SCE-EAF", "STATE", "CA"), loc("SCE-EAF", "ELECTRIC_UTILITY", "SCE")],
  },
  {
    program: program({
      external_id: "SDGE-N2N",
      name: "SDG&E Neighbor-to-Neighbor",
      slug: "sdge-neighbor-to-neighbor",
      administrator: "San Diego Gas & Electric",
      category: "utilities",
      subcategory: "hardship",
      short_description: "Up to $300 toward past-due SDG&E charges for customers with a final disconnection notice.",
      description:
        "SDG&E’s official Neighbor-to-Neighbor page offers up to $300 toward past-due balances for residential customers who have a final notice before disconnection, have an open account at their primary residence, and have not received an NTN pledge in the past 12 months. The program is shareholder-funded. Hardship reasons are case-specific and are not encoded.",
      benefit_summary: "Up to $300 toward a past-due SDG&E bill",
      benefit_type: "BILL_SAVINGS",
      benefit_min: null,
      benefit_max: 300,
      benefit_period: "one_time",
      status: "ACTIVE",
      official_url:
        "https://www.sdge.com/residential/pay-bill/get-payment-bill-assistance/bill-payment-options-temporary-financial-help/one-time-assistance-bill-assistance",
      application_url:
        "https://www.sdge.com/residential/pay-bill/get-payment-bill-assistance/bill-payment-options-temporary-financial-help/one-time-assistance-bill-assistance/neighbor-neighbor-program-application-form",
      statewide: false,
      preapproval_required: true,
      purchase_before_approval_allowed: null,
      effective_start: null,
      effective_end: null,
      confidence: "HIGH",
      featured: false,
      active: true,
    }),
    sources: [
      src(
        "SDGE-N2N",
        "GENERAL",
        "San Diego Gas & Electric",
        "https://www.sdge.com/residential/pay-bill/get-payment-bill-assistance/bill-payment-options-temporary-financial-help/one-time-assistance-bill-assistance",
      ),
      src(
        "SDGE-N2N",
        "APPLICATION",
        "San Diego Gas & Electric",
        "https://www.sdge.com/residential/pay-bill/get-payment-bill-assistance/bill-payment-options-temporary-financial-help/one-time-assistance-bill-assistance/neighbor-neighbor-program-application-form",
      ),
    ],
    rules: sdgeElectricOrGas("SDGE-N2N"),
  },
];

export const utilityHardshipCatalog = pack(drafts);
