export const LEAP_SLUG = "ladwp-landscape-efficiency-assistance";
export const LEAP_EXTERNAL_ID = "LADWP-WATER-LEAP";
export const LEAP_RESEARCHED_AT = "2026-09-12";
export const LEAP_VERIFIED_AT = "2026-09-12T00:00:00.000Z";

export const LEAP_PAGE_HEADING =
  "LADWP LEAP: How to Get Free Landscaping in Los Angeles";
export const LEAP_TURF_REBATE_WARNING =
  "Already used or started a turf replacement rebate for your front yard? Check LEAP’s rules before proceeding.";

export const LEAP_OFFICIAL = {
  main: "https://www.ladwp.com/residential-services/programs-and-rebates-residential/landscape-efficiency-assistance-program",
  faq: "https://www.ladwp.com/residential-services/programs-and-rebates-residential/landscape-efficiency-assistance-program/landscape-efficiency-assistance-program-leap-faqs",
  terms:
    "https://www.ladwp.com/sites/default/files/2026-03/LEAP%20Terms%20and%20Conditions_03.27.2026.pdf",
  paper:
    "https://www.ladwp.com/sites/default/files/2026-04/LEAP%20Paper%20Application_April%202026.pdf",
  permission:
    "https://www.ladwp.com/sites/default/files/2026-03/Letter%20of%20Permission%20Sample.pdf",
} as const;

export const leapStructuredPatch = {
  name: "LADWP Landscape Efficiency Assistance Program (LEAP)",
  administrator: "Los Angeles Department of Water and Power",
  last_verified_at: LEAP_VERIFIED_AT,
  benefit_type: "FREE_SERVICE" as const,
  benefit_min: null,
  benefit_max: null,
  benefit_summary: "Free front-yard landscaping",
  consumer_headline: "Free front-yard landscaping",
  administrator_display_name: "LADWP",
  audience_tags: ["Single-family home", "LADWP water", "Homeowner or renter"],
  short_description:
    "Qualifying LADWP water customers may receive free front-yard lawn replacement and drought-tolerant landscaping.",
  description:
    "LEAP is a free LADWP landscape design and construction service, not a cash rebate. LADWP says qualifying single-family sites with LADWP water service in a DWR-defined disadvantaged community may receive front-yard lawn replacement and related drought-tolerant improvements. Front yards need 500 to 3,000 square feet of living grass (parkway may count). Owners or renters with written owner permission may apply. Applications are due October 31, 2026; high demand may create a waitlist. Water service, lawn size, and owner permission are asked as follow-up questions. DAC geography stays unmodeled until address-based resolution exists. Prior or current front-yard SoCalWaterSmart turf-rebate participation is a published restriction and is not deterministically matched here.",
  status: "ACTIVE" as const,
  active: true,
  confidence: "HIGH" as const,
  application_deadline: "2026-10-31",
  effective_end: null,
};

export const leapBrief = {
  seo_provider: "manual",
  primary_keyword: "LADWP LEAP program",
  secondary_keywords: [
    "LADWP free landscaping",
    "free lawn replacement Los Angeles",
    "LADWP LEAP eligibility",
    "LADWP LEAP application",
    "free drought tolerant landscaping Los Angeles",
    "Los Angeles lawn replacement program",
  ],
  search_intent:
    "Informational + eligibility + application. Searchers want to know whether LEAP is truly free, who may qualify, how to apply, the 2026 deadline, and what to prepare.",
  questions_to_answer: [
    "Is LADWP LEAP really free?",
    "Who qualifies for LEAP?",
    "Do I need to own the home?",
    "Can renters apply?",
    "How much grass do I need?",
    "Does my property need LADWP water service?",
    "How do I know if my property is in a disadvantaged community?",
    "Can I choose my own plants and design?",
    "Can I apply if I already used a turf replacement rebate?",
    "Can I save the LEAP application and finish later?",
    "What photos or documents do I need?",
    "When is the LEAP application deadline?",
    "What happens after I apply?",
  ],
  topics_to_cover: [
    "free service, not a cash rebate",
    "October 31, 2026 application deadline",
    "high demand and possible waitlist",
    "Winter 2026 or until funding is exhausted",
    "first-come, first-served",
    "LADWP water service",
    "DWR disadvantaged community",
    "address-based DAC confirmation",
    "single-family residence",
    "500 to 3,000 square feet of living front-yard grass",
    "parkway may count",
    "owner or renter with written owner permission",
    "SoCalWaterSmart front-yard turf-rebate restriction",
    "pre-approved templates",
    "HOA responsibility",
    "no new irrigation if none is operable",
    "online application cannot be saved",
  ],
  suggested_title:
    "LADWP LEAP: Free Landscaping Program Eligibility & How to Apply (2026)",
  suggested_meta_description:
    "LADWP customers may qualify for free lawn replacement and drought-tolerant landscaping through LEAP. See eligibility, requirements, the 2026 deadline and how to apply.",
  competitor_notes:
    "Prioritize official LADWP facts: free design/construction rather than a rebate, the October 31, 2026 deadline, waitlist and funding risk, renter pathway with owner permission, and the front-yard turf-rebate restriction. Do not treat City of Los Angeles residency or household income as a standalone LEAP rule.",
  research_notes:
    "Primary facts verified from the official LADWP LEAP page, FAQ, Terms and Conditions (March 27, 2026), April 2026 paper application, and owner-permission sample on September 12, 2026. LEAP is a free service, not a cash rebate, and no dollar value is published. The application deadline is October 31, 2026; LADWP’s FAQ says the program is estimated to run through Winter 2026 or until grant funding is exhausted. High demand may place applicants on a waitlist. Matching keeps DAC unresolved until address-based lookup exists; ZIP or city alone is not enough. Renters are not categorically excluded if they have written owner permission. The SoCalWaterSmart turf-rebate restriction is front-yard specific and is surfaced as a warning because this site does not collect enough verified data to evaluate it. Location schema cannot represent LADWP water service plus DWR DAC, so geography stays at the existing safe California state row.",
  researched_at: LEAP_RESEARCHED_AT,
};

export const leapContent = {
  seo_title:
    "LADWP LEAP: Free Landscaping Program Eligibility & How to Apply (2026)",
  meta_description:
    "LADWP customers may qualify for free lawn replacement and drought-tolerant landscaping through LEAP. See eligibility, requirements, the 2026 deadline and how to apply.",
  overview: `${LEAP_PAGE_HEADING}

LEAP is LADWP’s Landscape Efficiency Assistance Program. LADWP says qualifying customers may receive free landscape design and construction to replace a traditional front lawn with California Friendly or native drought-tolerant landscaping. This is a free service, not a cash rebate, and LADWP does not publish a dollar value.

Who may qualify, according to LADWP:
• Single-family property
• LADWP water service at the site
• A qualifying DWR-defined disadvantaged community
• 500–3,000 sq ft of living green grass in the front yard (parkway area may count)
• Owner of record, or a renter with written owner permission

No general household income limit is listed as a LEAP eligibility rule; the disadvantaged-community requirement is location-based. Address-based DAC eligibility still needs confirmation and is not inferred from ZIP or city alone.`,
  benefit_explanation:
    "If you may qualify, LADWP says an assigned contractor can provide landscape design and construction at no cost to you. Actual work depends on the property and the pre-approved template you select. Depending on the site, services may include removing and replacing a traditional front-yard lawn; California Friendly and/or native drought-tolerant plantings; a rain-capture or stormwater feature such as a rain barrel, rain garden, or rock garden; converting an operable irrigation system to drip; a weather-based irrigation controller; smart water monitoring; or high-efficiency sprinklers as an alternative if turf replacement is not preferred. LADWP says not every participant receives every listed improvement. If the property does not have an operable irrigation system, LEAP does not install a brand-new irrigation system.",
  how_to_apply: `Gather everything before you start. LADWP says the online application cannot be saved and must be finished in one session.

1. Create or log in to your online LADWP account. LADWP’s page says to call 1-800-DIAL-DWP if you need help setting one up.
2. Review the official LEAP application checklist and How to Apply video on LADWP’s LEAP page.
3. Have owner permission, photos, and a landscape template from your Water District ready.
4. In your LADWP account, open Rebates & Programs, then the LEAP Online Form.
5. Upload the required documents and photos, then submit.

After you apply, LADWP says you should receive a confirmation email, then a follow-up after eligibility review. If the application moves forward, a contractor contacts you to schedule a site visit. A paper application is also available; mail it to the address on page 2 of that form.`,
  documents_needed: `LADWP asks applicants to prepare these items before starting:

• Online LADWP account
• Official checklist and How to Apply video steps
• Written owner-permission letter if you are not the owner of record (a sample letter is posted by LADWP)
• Five photos of the existing front-yard landscape
• About 3–5 photos of the existing irrigation system and valves
• About 3–5 photos of existing rain gutters and downspouts, if applicable, or the existing roof
• Your selected pre-approved landscape template for your Water District

Estimate front-yard grass square footage before you apply. Legible PDFs and photo files are acceptable.`,
  important_notes: `${LEAP_TURF_REBATE_WARNING}

LADWP lists an application deadline of October 31, 2026. The official page warns that high demand may place applicants on a waitlist. The FAQ says LEAP is estimated to run through Winter 2026 or until grant funding is exhausted, and that work is first-come, first-served.

The LEAP Terms and Conditions say the applicant must not have previously participated in the SoCalWaterSmart Turf Replacement Rebate Program for that front yard, or started construction as a current turf-replacement rebate participant for that front yard. That restriction is about prior or current front-yard turf-rebate participation, not a blanket ban on every other LADWP program.

Designs come from pre-approved templates for your Water District. LADWP says you cannot choose unique design features or specific plants, and the template cannot be rewritten to match unique HOA rules. If the home is in an HOA, the homeowner is responsible for getting HOA permission.

If the property does not have an operable irrigation system, LADWP says no new irrigation system or high-efficiency sprinklers will be installed or converted to drip.

This site does not confirm disadvantaged-community status from ZIP or city. Address-based DAC eligibility still needs confirmation.`,
};

export const leapFaqs = [
  {
    sort_order: 10,
    question: "Is LADWP LEAP really free?",
    answer:
      "LADWP describes LEAP as free landscape design and construction for customers who may qualify. The Terms and Conditions say the contractor provides the listed turf-replacement and related work at no cost to the customer. This is a free service, not a cash rebate, and LADWP does not publish a dollar award.",
  },
  {
    sort_order: 20,
    question: "Who qualifies for LEAP?",
    answer:
      "LADWP says customers may qualify if they live in a single-family residence in a DWR-defined disadvantaged community, have 500 to 3,000 square feet of green grass in the front yard (parkway may count), are the owner of record or have written owner permission, and agree to the LEAP Terms and Conditions. The site must currently receive LADWP water service. No general household income limit is listed as a LEAP eligibility rule; the DAC screen is location-based.",
  },
  {
    sort_order: 30,
    question: "Do I need to own the home?",
    answer:
      "You do not have to be the owner if you have written permission from the owner of record. LADWP’s eligibility list is “Owner of Record with LADWP or have written permission from the Property Owner.” The terms also refer to renters with owner permission.",
  },
  {
    sort_order: 40,
    question: "Can renters apply?",
    answer:
      "Yes, renters may participate if they obtain written property-owner permission. LADWP’s paper application includes a “Renter with permission” option and asks for a letter of permission when you are not the owner. Renters are not categorically excluded.",
  },
  {
    sort_order: 50,
    question: "How much grass do I need?",
    answer:
      "LADWP requires 500 to 3,000 square feet of living green grass in the front yard. Official copy says that square footage can include the parkway. The terms say any area above 3,000 or below 500 square feet is outside the agreement.",
  },
  {
    sort_order: 60,
    question: "Does my property need LADWP water service?",
    answer:
      "Yes. The Terms and Conditions require that the site address is currently served by LADWP for water service. Living in the City of Los Angeles or having LADWP electric service is not the published water-service rule.",
  },
  {
    sort_order: 70,
    question: "How do I know if my property is in a disadvantaged community?",
    answer:
      "LADWP uses the Department of Water Resources definition of a disadvantaged community and points applicants to DWR’s DAC Mapping Tool. Enter the property address and see whether it falls in a mapped DAC or SDAC census-tract layer. A ZIP code or city name is not enough. This site does not confirm DAC status; address-based eligibility still needs confirmation. LADWP says you can also call the Water Conservation Hotline at 1-800-544-4498, press 5, or email LEAP@ladwp.com.",
  },
  {
    sort_order: 80,
    question: "Can I choose my own plants and design?",
    answer:
      "No. LADWP uses pre-approved landscape and irrigation templates for your Water District. A contractor adapts the selected template to the existing front-yard layout, but LADWP says you cannot choose unique design features or specific plants, and you cannot pick a template from another district.",
  },
  {
    sort_order: 90,
    question: "Can I apply if I already used a turf replacement rebate?",
    answer:
      "Check LEAP’s rules before you proceed. The Terms and Conditions say the applicant must not have previously participated in the SoCalWaterSmart Turf Replacement Rebate Program for that front yard, or started construction as a current turf-replacement rebate participant for that front yard. The restriction is specific to prior or current front-yard turf-rebate participation. LADWP’s FAQ says you may still apply to other LADWP discount or rebate programs, with separate eligibility rules, except you will not qualify for individual rebates for work LEAP already installed.",
  },
  {
    sort_order: 100,
    question: "Can I save the LEAP application and finish later?",
    answer:
      "No. LADWP says the online application does not automatically save your progress and must be completed in a single session. Gather documents and photos before you start.",
  },
  {
    sort_order: 110,
    question: "What photos or documents do I need?",
    answer:
      "LADWP asks for a letter of permission if you are not the owner, five front-yard landscape photos, about 3 to 5 irrigation and valve photos, and about 3 to 5 photos of gutters and downspouts or the existing roof. You also need an online LADWP account and a selected landscape template. A paper application is available if you do not apply online.",
  },
  {
    sort_order: 120,
    question: "When is the LEAP application deadline?",
    answer:
      "LADWP lists an application deadline of October 31, 2026. The official page warns that high demand may place applicants on a waitlist. The FAQ says the program is estimated to run through Winter 2026 or until grant funding is exhausted, and that applicants are handled first-come, first-served.",
  },
  {
    sort_order: 130,
    question: "What happens after I apply?",
    answer:
      "LADWP says you should receive a confirmation email after submitting. A follow-up email comes after staff review your application and determine eligibility or ask for more information. If you are eligible, you are notified by email and a contractor contacts you to schedule a site visit. The FAQ estimates construction at about 5 to 7 business days once the contractor schedules the work and mobilizes—that is not the total time from application to completion. Paper applicants may receive confirmation by email, letter, or phone.",
  },
];

export const leapEvidence = [
  {
    content_section: "status",
    claim:
      "LADWP lists an application deadline of October 31, 2026 for LEAP.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Official page copy: “Application Deadline: October 31, 2026.” This is an application deadline, not a modeled program-period end date.",
  },
  {
    content_section: "status",
    claim:
      "LEAP is currently accepting applications; the official page tells customers to check eligibility and apply online.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "High-demand waitlist language is paired with a current apply-online instruction. Status remains ACTIVE; not funding-exhausted.",
  },
  {
    content_section: "status",
    claim:
      "Due to high demand, applicants may be placed on a waitlist and notified accordingly.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "status",
    claim:
      "The LEAP program is estimated to run through Winter 2026 or until grant funding is exhausted.",
    source_url: LEAP_OFFICIAL.faq,
    source_title: "Landscape Efficiency Assistance Program (LEAP) FAQs",
    source_publisher: "LADWP",
    source_date: "",
    notes: "FAQ question “When will LEAP end?” Winter 2026 is not a calendar date, so it is not stored as effective_end.",
  },
  {
    content_section: "status",
    claim: "The program operates on a first come, first serve basis.",
    source_url: LEAP_OFFICIAL.faq,
    source_title: "Landscape Efficiency Assistance Program (LEAP) FAQs",
    source_publisher: "LADWP",
    source_date: "",
    notes: "The April 2026 paper application repeats first-come, first-served until Winter 2026 or funding is exhausted.",
  },
  {
    content_section: "benefit",
    claim:
      "Qualifying LADWP customers may receive free landscape design and construction services to replace traditional lawns with drought-tolerant landscaping.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Free service, not a cash rebate. No dollar value is published.",
  },
  {
    content_section: "benefit",
    claim:
      "The Terms and Conditions say the contractor provides turf replacement and/or applicable irrigation work at no cost to the customer.",
    source_url: LEAP_OFFICIAL.terms,
    source_title: "LEAP Terms and Conditions",
    source_publisher: "LADWP",
    source_date: "2026-03-27",
    notes: null,
  },
  {
    content_section: "eligibility",
    claim:
      "The site address must currently be served by LADWP for water service.",
    source_url: LEAP_OFFICIAL.terms,
    source_title: "LEAP Terms and Conditions",
    source_publisher: "LADWP",
    source_date: "2026-03-27",
    notes: "This is water service, not electric service and not City of Los Angeles residency.",
  },
  {
    content_section: "eligibility",
    claim:
      "Applicants must live in a single-family residence within a Disadvantaged Community as defined by the California Department of Water Resources.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "DAC is location-based. No general household-income screen is listed as a LEAP eligibility rule.",
  },
  {
    content_section: "eligibility",
    claim:
      "LEAP is published for single-family residences.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Modeled as the existing required property_type = single_family rule.",
  },
  {
    content_section: "eligibility",
    claim:
      "The front yard must have 500 to 3,000 square feet of green grass.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Asked as the front_yard_grass_size follow-up; not added as a core UserProfile rule.",
  },
  {
    content_section: "eligibility",
    claim:
      "Front-yard grass square footage can include the parkway.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Official eligibility bullet: “square footage can include parkway.”",
  },
  {
    content_section: "eligibility",
    claim:
      "The applicant must be the property’s Owner of Record with LADWP or have written permission from the property owner.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "Renters are not categorically excluded.",
  },
  {
    content_section: "eligibility",
    claim:
      "The Terms and Conditions expressly cover renters with owner permission.",
    source_url: LEAP_OFFICIAL.terms,
    source_title: "LEAP Terms and Conditions",
    source_publisher: "LADWP",
    source_date: "2026-03-27",
    notes: "Liability waiver language: “owner or renters’ with owner permission.”",
  },
  {
    content_section: "eligibility",
    claim: "Applicants must agree to the LEAP Terms and Conditions.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "important_notes",
    claim:
      "The applicant must not have previously participated in the SoCalWaterSmart Turf Replacement Rebate Program for the front yard, or started construction as a current turf-replacement rebate participant for that front yard.",
    source_url: LEAP_OFFICIAL.terms,
    source_title: "LEAP Terms and Conditions",
    source_publisher: "LADWP",
    source_date: "2026-03-27",
    notes:
      "Front-yard specific. Not modeled as a deterministic matching rule because this site does not collect verified turf-rebate history. The April 2026 paper application also asks about prior LADWP turf-replacement participation.",
  },
  {
    content_section: "application",
    claim:
      "Apply by logging into an LADWP account, opening Rebates & Programs, then the LEAP Online Form.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "application",
    claim:
      "The online application does not automatically save progress and must be completed in a single session.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "FAQ document checklist repeats that the application cannot be saved.",
  },
  {
    content_section: "application",
    claim:
      "Applicants who are not the owner must upload a letter of permission from the property owner.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "A sample permission letter is posted at the official permission URL.",
  },
  {
    content_section: "application",
    claim: "Applicants must upload 5 photos of the existing front-yard landscape.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "application",
    claim:
      "Applicants must upload 3 to 5 photos of the existing irrigation system and valves.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "application",
    claim:
      "Applicants must upload 3 to 5 photos of existing rain gutters and downspouts, if applicable, or the existing roof.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "application",
    claim: "A paper application is also available.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "April 2026 PDF is the official paper form.",
  },
  {
    content_section: "application",
    claim:
      "After online submission, applicants receive a confirmation email and a later eligibility review; if eligible, a contractor contacts them to schedule a site visit.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: "The paper application describes confirmation by email, letter, or phone and a later specialist visit.",
  },
  {
    content_section: "important_notes",
    claim:
      "Landscape design features and the plant palette are limited to the customer’s selected pre-approved design template; customers cannot choose unique design features or specific plants.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "important_notes",
    claim:
      "The landscape design cannot be modified to comply with unique HOA guidelines; if the residence is in an HOA, the homeowner is responsible for obtaining prior HOA permission.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "important_notes",
    claim:
      "If customers do not have an operable irrigation system, no new irrigation system or high-efficiency sprinklers will be installed or converted to drip.",
    source_url: LEAP_OFFICIAL.main,
    source_title: "Landscape Efficiency Assistance Program",
    source_publisher: "LADWP",
    source_date: "",
    notes: null,
  },
  {
    content_section: "faq",
    claim:
      "LADWP estimates construction at 5 to 7 business days once the contractor schedules the work and mobilizes; that is not total application-to-completion time.",
    source_url: LEAP_OFFICIAL.faq,
    source_title: "Landscape Efficiency Assistance Program (LEAP) FAQs",
    source_publisher: "LADWP",
    source_date: "",
    notes: "FAQ: duration varies; the contractor gives a more accurate timeframe once work is scheduled.",
  },
  {
    content_section: "eligibility",
    claim:
      "A DWR disadvantaged community is defined using median household income of the community, not a general applicant household-income limit for LEAP.",
    source_url: LEAP_OFFICIAL.faq,
    source_title: "Landscape Efficiency Assistance Program (LEAP) FAQs",
    source_publisher: "LADWP",
    source_date: "",
    notes:
      "FAQ defines DAC as a community with annual MHI less than 80% of statewide MHI and tells applicants to check the DAC Mapping Tool by address. This site does not infer DAC from ZIP or city.",
  },
];
