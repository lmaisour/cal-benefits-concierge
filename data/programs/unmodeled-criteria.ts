import type { CatalogProgram } from "@/lib/programs/import/types";

export const UNMODELED_REQUIRED_CRITERIA_MESSAGE =
  "Additional program requirements need to be confirmed.";

/**
 * Consumer-facing summaries for required eligibility the current profile
 * and executable rules/geography cannot evaluate. Keys are program
 * `external_id` values. Programs omitted here are treated as fully modeled.
 */
export const UNMODELED_REQUIRED_CRITERIA: Record<string, string> = {
  "CA-VEH-MYFIRSTEV":
    "The vehicle must be a qualifying new or used battery-electric or hydrogen model from a participating seller, within the published price and model-year limits.",
  "CA-VEH-DCAP":
    "Income must be below 300% of the federal poverty level, and the replacement vehicle must meet the program’s published vehicle rules.",
  "BAAQMD-VEH-CC4A":
    "Income must be at or below 300% of the federal poverty level, and you must live in the Bay Area air district’s service area.",
  "SDAPCD-VEH-CC4A":
    "You must live in the San Diego County air district and meet the program’s published scrap-and-replace rules.",
  "CA-VEH-BAR-RETIRE":
    "The vehicle must meet Smog Check and ownership rules. Higher awards also require an income test that is not fully checked here.",
  "CA-VEH-BAR-REPAIR":
    "Income must be at or below 225% of the federal poverty level, and repairs must follow BAR’s published station and approval rules.",
  "PGE-VEH-POEV":
    "The vehicle, purchase timing, and income-qualified path must meet PG&E’s published pre-owned EV rebate rules.",
  "SCE-VEH-POEV":
    "The vehicle, purchase timing, and income-qualified path must meet SCE’s published pre-owned EV rebate rules.",
  "SDGE-VEH-POEV":
    "The vehicle, purchase timing, household limits, and income-qualified path must meet SDG&E’s published pre-owned EV rebate rules.",
  "LADWP-VEH-USED-EV":
    "The vehicle and LADWP account must meet the published used-EV rebate rules, including any EZ-SAVE or Lifeline adders.",
  "PGE-VEH-HOME-CHARGING":
    "You must be a PG&E customer installing listed charging equipment under the published rebate path.",
  "SCE-VEH-CHARGE-READY-HOME":
    "You must be an SCE customer, and income or disadvantaged-community rules may apply for the published rebate amount.",
  "LADWP-VEH-CHARGER":
    "You must be an LADWP customer installing a qualifying charger under the published rebate rules.",
  "SMUD-VEH-CHARGE-HOME":
    "You must be a SMUD customer, and Energy Assistance Program Rate status may change what is covered.",
  "CA-VEH-CLCA":
    "You must have a valid California driver license, meet the income rules, and have a good driving record.",

  "CA-UTIL-CARE":
    "Income must be at or below 200% of the federal poverty level, or you must qualify through a listed assistance program.",
  "CA-UTIL-FERA":
    "Household size must be at least three, and income must fall between the CARE limit and 250% of the federal poverty level.",
  "CA-UTIL-ESA":
    "Income must be at or below 250% of the federal poverty level, or you must qualify through a listed assistance program.",
  "CA-UTIL-MEDICAL-BASELINE":
    "A licensed medical practitioner must certify a qualifying medical condition or life-support equipment.",
  "CA-UTIL-LIHEAP":
    "Income must meet the published state-median-income table, and help depends on local funding.",
  "CA-HOME-WAP":
    "Income must meet the published weatherization table, and a local provider must be able to serve your home.",
  "CA-UTIL-DAC-GT":
    "You must be CARE or FERA eligible and live in a designated disadvantaged community, and enrollment capacity may be limited.",
  "CA-UTIL-AMP":
    "You must already be on CARE or FERA and meet the published past-due balance and payment rules.",
  "LADWP-UTIL-EZ-SAVE":
    "Income must meet LADWP’s published EZ-SAVE table for your household size.",
  "SMUD-UTIL-EAPR":
    "Income must meet SMUD’s published federal-poverty-level bands for the Energy Assistance Program Rate.",

  "PGE-REACH":
    "You must have a qualifying disconnection notice, meet the 200% federal poverty level income test, and not have received REACH this calendar year.",
  "PGE-MATCH-MY-PAYMENT":
    "Income must be below 400% of the federal poverty level, and the past-due balance and payment rules must be met.",
  "SCE-EAF":
    "Income must meet the published CARE table, and assistance is limited to once in a 12-month period.",
  "SDGE-N2N":
    "You must have a final disconnection notice, an open account at your primary residence, and no Neighbor-to-Neighbor pledge in the past 12 months.",

  "CA-TAX-CALEITC":
    "You must have qualifying earned income and meet the published CalEITC filing and qualifying-child rules.",
  "CA-TAX-YCTC":
    "A qualifying child must be under 6, and you generally must also qualify for CalEITC.",
  "CA-TAX-FYTC":
    "You must be 18–25 at year-end, qualify for CalEITC, and have qualifying California foster-care history.",
  "CA-TAX-RENTERS-CREDIT":
    "Income limits depend on filing status, you must have paid rent for at least half the year, and you cannot have claimed a homeowners’ exemption.",

  "CA-FOOD-CALFRESH":
    "Income, resources, and household composition must meet CalFresh rules, including the net-income test.",
  "CA-FOOD-CFAP":
    "You must be ineligible for CalFresh solely because of immigration-status rules and still meet CalFresh income tests.",
  "CA-FOOD-SUN-BUCKS":
    "The child must be eligible through CalFresh, CalWORKs, school meals, or an approved summer application.",
  "CA-FAM-CALWORKS-CHILD-CARE":
    "You must be a current or former CalWORKs recipient in an approved activity, and the child must meet the age rules.",
  "CA-FAM-CAPP":
    "Income must be at or below 85% of state median income, and a local agency must have an available voucher.",
  "CA-FAM-CSPP":
    "Income must meet the published state-median-income preschool ceilings, and a local contractor must have space.",
  "CA-FAM-CHILD-CARE-BRIDGE":
    "The child must be in an eligible foster or emergency placement in a participating county.",
  "CA-COMM-LIFELINE":
    "Income or participation in a qualifying assistance program must meet California LifeLine rules.",
  "CA-COMM-LIFELINE-BROADBAND":
    "You must meet California LifeLine eligibility for this broadband discount.",

  "CA-FAM-WIC":
    "You must be pregnant, a new parent, or caring for a child under 5, and income must meet the published WIC tables.",
  "CA-FAM-CALWORKS":
    "Income, resources, and family composition must meet CalWORKs rules.",
  "CA-HLTH-MEDICAL":
    "Income must meet Medi-Cal’s federal-poverty-level rules, and citizenship or immigration rules may apply.",
  "CA-HLTH-COVEREDCA":
    "Premium help depends on household income, household size, and location, which are not fully calculated here.",
  "CA-FAM-IHSS":
    "You must be eligible for Medi-Cal and need in-home care because of age, blindness, or disability.",
  "CA-FAM-CAPI":
    "You must be aged, blind, or disabled, ineligible for SSI/SSP solely due to immigration status, and meet resource rules.",
  "CA-FOOD-UNIVERSAL-MEALS":
    "The student must attend a participating California public or charter school that serves the meals.",
  "CA-EDU-CALGRANT":
    "You must file a timely FAFSA or CADAA, have a verified GPA, and meet Cal Grant income, asset, and school rules.",
  "CA-EDU-MCS":
    "You must attend an eligible UC, CSU, or CCC bachelor’s program and meet CSAC income and asset rules.",
  "CA-FAM-SSP":
    "SSA must determine that you qualify for SSI using federal income and resource rules.",
  "CA-EDU-CALKIDS":
    "The child must have been born in California on or after July 1, 2022, or otherwise qualify as a listed public-school student.",
  "CA-FAM-PFL":
    "You generally must have earned at least $300 and paid into State Disability Insurance, and the leave reason must qualify.",
  "CA-FAM-SDI":
    "You generally must have earned at least $300 with SDI withheld, and a qualifying non-work-related disability must keep you from working.",

  "CA-HOUS-CALHFA-MYHOME":
    "County income limits, first-time buyer rules, and an eligible first mortgage must be met. This is repayable financing.",
  "CA-HOUS-GSFA-PLATINUM":
    "Loan, occupancy, and lender rules must be met. This is repayable financing.",
  "CA-HOUS-GSFA-ASSIST-TO-OWN":
    "You must be employed by a listed GSFA member county, and the home must be a primary residence.",
  "CA-HOUS-RECOVERCA":
    "The home must be in a listed disaster area with qualifying damage, and income generally must be at or below 120% of area median income.",
  "USDA-HOUS-504":
    "The home must be in an eligible rural area, and income must be very low on USDA county tables.",
  "FRE-HOUS-OORP":
    "Income must meet the published low-income limits, and after-rehab value cannot exceed the posted cap.",
  "KIN-HOUS-FTHB":
    "You must meet the first-time buyer definition and the published income limits.",
  "KIN-HOUS-REHAB":
    "Income and property rules must meet the county rehabilitation guidelines.",
  "LAC-GREENLINE":
    "Priority census-tract and occupancy rules apply, and funding is limited.",
  "LAC-HOUS-HANDYWORKER":
    "The home must be in the listed unincorporated supervisorial districts, occupied at least one year, and income generally must be at or below 80% of area median income.",
  "LAC-HOUS-SENIOR-GRANT":
    "The home must be in a listed unincorporated district, occupied at least 12 months, and income generally must be at or below 80% of area median income.",
  "LAC-HOUS-HOP":
    "You must be a first-time buyer with no ownership in the last three years, use a participating lender, and buy in an eligible area.",
  "LA-HOUS-LIPA":
    "Income generally must be at or below 80% of area median income, and only a participating lender can submit an application.",
  "LA-HOUS-MIPA":
    "Income and reservation-window rules apply, and only a participating lender can submit an application.",
  "MTY-HOUS-EMERGENCY-REPAIR":
    "Income generally must be at or below 80% of area median income, and city funding must still be available.",
  "NAP-HOUS-PROXIMITY":
    "The home generally must be within 20 miles of the workplace, and income must meet county guidelines.",
  "NAP-HOUS-REHAB":
    "Income generally must be at or below 80% of area median income.",
  "NEV-HOUS-DPA":
    "Income, occupancy, and remaining-funds rules must be confirmed with the county before a purchase contract.",
  "PLA-HOUS-WHPP":
    "Local employment and a deed restriction apply.",
  "SMC-HOUS-EDPAP":
    "You must be a full-time permanent County or HACSM employee for at least 18 months and cannot already own in San Mateo County.",
  "STA-HOUS-REHAB":
    "Income and property rules must meet the Housing Authority guidelines.",
  "TUO-HOUS-FTHB":
    "You must meet the first-time buyer definition and the published income limits.",
  "TUO-HOUS-REHAB":
    "Income and owner-occupancy rules must meet the county rehabilitation guidelines.",
  "CA-HOUS-PROP-TAX-POSTPONEMENT":
    "You must have at least 40% equity and household income at or below the published limit, among other Controller requirements.",

  "CA-HOME-EBD":
    "Income generally must be at or below 80% of area median income or meet categorical eligibility, and the home must be in a designated community focus area.",
  "CA-HOME-DAC-SASH":
    "You must meet CARE or FERA guidelines and live in a top 25% CalEnviroScreen disadvantaged community or California Indian Country.",
  "SCG-HOME-REBATES":
    "You must be a SoCalGas customer installing a listed qualifying product while funds remain.",
  "LADWP-HOME-CONSUMER-REBATE":
    "You must be an LADWP customer installing a listed qualifying product under the published rebate rules.",
  "SMUD-HOME-GO-ELECTRIC":
    "You must be a SMUD customer, and a participating contractor must submit the rebate.",
  "CPA-HOME-AC-SAVINGS":
    "You must be a Clean Power Alliance CARE or FERA customer.",
  "CPA-HOME-SUN-STORAGE":
    "You must be a Clean Power Alliance customer, and PSPS, medical, or income adders have extra rules.",
  "MCE-HOME-HEAT-PUMP":
    "You must have lived in the single-family home for at least 12 months and be an MCE customer.",
  "PCE-HOME-WESTLIGHT":
    "You must be a Peninsula Clean Energy customer installing a listed upgrade.",
  "SVCE-HOME-REBATES":
    "You must be a Silicon Valley Clean Energy customer, and reservations must be approved before install.",
  "AVA-HOME-SMARTHOME-BATTERY":
    "You must be an Ava Community Energy customer, and CARE/FERA status changes the published amount.",
  "3CE-HOME-ELECTRIFY":
    "You must be a Central Coast Community Energy customer installing a listed heat-pump measure in the published window.",
  "SDCP-HOME-SOLAR-BATTERY":
    "You must be a San Diego Community Power customer, and nonmarket adders require CARE/FERA or Community of Concern status.",

  "MWD-WATER-SOCAL-WATERSMART":
    "You must be a customer of a participating Metropolitan member agency.",
  "LADWP-WATER-CONSERVATION":
    "You must be an LADWP customer applying under the published conservation rebate rules.",
  "SCVWD-WATER-LANDSCAPE":
    "You must be a Valley Water customer, and some work cannot start before approval.",
  "EBMUD-WATER-REBATES":
    "You must be an East Bay MUD customer, and lawn conversion requires pre-approval.",
  "SDCWA-WATER-RESIDENTIAL":
    "You must be a customer of a participating San Diego County Water Authority member agency.",

  "US-VEH-30D":
    "This federal credit has expired. Historical income, assembly, and vehicle rules are not evaluated here.",
  "US-VEH-25E":
    "This federal credit has expired. Historical buyer and vehicle rules are not evaluated here.",
  "US-HOME-25C":
    "This federal credit has expired. Historical equipment and tax-filing rules are not evaluated here.",
  "US-HOME-25D":
    "This federal credit has expired. Historical equipment and tax-filing rules are not evaluated here.",
  "US-VEH-30C":
    "This federal credit has expired. Historical census-tract and equipment rules are not evaluated here.",
  "US-HOME-HEEHRA-SF":
    "Reservations were fully reserved. Historical income and contractor rules are not evaluated here.",
  "US-HOME-HEEHRA-MF":
    "New Stage 1 submissions are paused. Historical building and income rules are not evaluated here.",
  "CA-HOME-TECH-SF":
    "Standard TECH incentives are funding-exhausted. Historical contractor and equipment rules are not evaluated here.",
  "CA-HOME-SGIP-RSSE":
    "This pathway is waitlisted. Equity and developer rules are not evaluated here.",
  "SCG-GAF":
    "The Gas Assistance Fund is closed. Historical income and hardship rules are not evaluated here.",
};

export function withUnmodeledCriteria(program: CatalogProgram): CatalogProgram {
  const summary = UNMODELED_REQUIRED_CRITERIA[program.external_id];
  if (!summary) {
    return {
      ...program,
      has_unmodeled_required_criteria: false,
      unmodeled_required_criteria_summary: null,
    };
  }
  return {
    ...program,
    has_unmodeled_required_criteria: true,
    unmodeled_required_criteria_summary: summary,
  };
}

export function unmodeledCriteriaNote(program: Pick<
  CatalogProgram,
  "has_unmodeled_required_criteria" | "unmodeled_required_criteria_summary"
>): string | null {
  if (!program.has_unmodeled_required_criteria) {
    return null;
  }
  const summary = program.unmodeled_required_criteria_summary?.trim();
  return summary && summary.length > 0 ? summary : UNMODELED_REQUIRED_CRITERIA_MESSAGE;
}
