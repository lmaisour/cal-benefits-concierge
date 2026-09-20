import { isRepayableBenefit } from "@/lib/programs/labels";
import {
  normalizeBenefitTiers,
  resolveBenefitAmountStructure,
} from "@/lib/content-pipeline/amount-structure";
import {
  amountFaqQuestion,
  metaDescriptionSuffix,
  overviewTieredGuidance,
  tieredAmountGuidance,
  unknownAmountGuidance,
} from "@/lib/content-pipeline/benefit-presentation";
import { isStaleVerification } from "@/lib/content-pipeline/freshness";
import { collectOfficialSources } from "@/lib/content-pipeline/official-sources";
import type { DiscoveryRecord, EvidencePackage } from "@/lib/content-pipeline/types";

export function buildEvidencePackage(
  record: DiscoveryRecord,
  now: Date = new Date(),
): EvidencePackage {
  const program = record.program;
  const official_sources = collectOfficialSources({
    official_url: program.official_url,
    sources: record.sources,
  });
  const repayable = isRepayableBenefit(program.benefit_type);
  const tiers = normalizeBenefitTiers(program.benefit_tiers).map((tier, index) => ({
    ...tier,
    evidence_path: `benefit.tiers.${index}`,
  }));
  const amount_structure = resolveBenefitAmountStructure({
    amount_structure: program.benefit_amount_structure,
    min: program.benefit_min,
    max: program.benefit_max,
    tiers,
  });
  const warnings: string[] = [];

  if (repayable) {
    warnings.push(
      "This benefit is repayable financing. Do not describe it as a grant or as cash the household keeps.",
    );
  }
  if (program.has_unmodeled_required_criteria) {
    warnings.push(
      program.unmodeled_required_criteria_summary?.trim() ||
        "Some required eligibility criteria are not fully modeled and must not be treated as satisfied.",
    );
  }
  if (program.confidence === "LOW" || program.confidence === "MEDIUM") {
    warnings.push(
      `${program.confidence} confidence: qualify every status and eligibility statement; never convert uncertainty into a hard fact.`,
    );
  }
  if (program.status !== "ACTIVE") {
    warnings.push(
      `This program is not listed as active (${program.status.replaceAll("_", " ").toLowerCase()}). Confirm current availability with the official administrator. Catalog status is not the same as open applications.`,
    );
  }

  return {
    program_id: record.program_id,
    external_id: program.external_id || record.program_id,
    official_name: program.name,
    consumer_headline: program.consumer_headline,
    administrator_display_name: program.administrator_display_name,
    category: program.category,
    subcategory: program.subcategory,
    short_description: program.short_description,
    status: program.status,
    active: program.active,
    administrator: program.administrator,
    geography: {
      statewide: program.statewide,
      locations: record.locations.map((location) => ({
        type: location.location_type,
        value: location.location_value,
      })),
    },
    benefit: {
      type: program.benefit_type,
      summary: program.benefit_summary,
      min: program.benefit_min,
      max: program.benefit_max,
      period: program.benefit_period,
      repayable,
      amounts_are_structured_facts:
        program.benefit_min !== null || program.benefit_max !== null,
      amount_structure,
      tiers: amount_structure === "TIERED" ? tiers : [],
    },
    eligibility: {
      modeled_rules: record.rules.map((rule) => ({
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        required: rule.required,
        explanation: rule.explanation,
        rule_group: rule.rule_group,
      })),
      unmodeled_required: program.has_unmodeled_required_criteria,
      unmodeled_summary: program.unmodeled_required_criteria_summary,
      tags_are_not_eligibility: true,
      unknown_is_not_a_fact: true,
    },
    application: {
      official_url: program.official_url,
      application_url: program.application_url,
      how_to_apply: record.content?.how_to_apply ?? null,
      documents: record.content?.documents_needed ?? null,
      preapproval_required: program.preapproval_required,
      purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    },
    deadline: {
      application_deadline: program.application_deadline,
      effective_end: program.effective_end,
      source:
        program.application_deadline || program.effective_end ? "structured" : null,
    },
    warnings,
    official_sources,
    verified_at: program.last_verified_at,
    confidence: program.confidence,
    freshness: {
      is_stale: isStaleVerification(program.last_verified_at, now.getTime()),
      last_verified_at: program.last_verified_at,
    },
    existing_content: record.content,
    faqs: record.faqs,
    brief: record.brief,
    content_evidence: record.evidence_rows,
    boilerplate: {
      not_exhaustive: "This page is not a complete list of California programs.",
      cannot_determine_personal_eligibility:
        "This page cannot determine personal eligibility.",
      confirm_with_administrator:
        "Always confirm eligibility, funding, and deadlines with the official administrator.",
      documents_unlisted:
        "Required documents are not listed here. Use the official application checklist.",
      deadline_none:
        "No application deadline is listed here. Check the official source for current dates.",
      check_official_dates: "Check the official source for current dates.",
      eligibility_rules_limited:
        "Only some eligibility requirements are listed here. Confirm the full requirements on the official source.",
      seo_title_suffix: ": who may qualify and how to apply",
      h1_qualify_suffix: " — who may qualify",
      meta_description_suffix: metaDescriptionSuffix(program.benefit_type),
      faq_who_may_qualify: "Who may qualify?",
      faq_how_to_apply: "How do I apply?",
      faq_documents: "What documents might I need?",
      faq_how_much: amountFaqQuestion(program.benefit_type),
      faq_deadline: "Is there an application deadline?",
      faq_only_consider: "Is this the only California benefit I should consider?",
      faq_documents_pointer:
        "See the documents listed on this page. Confirm the current checklist on the official source.",
      unknown_amount_guidance: unknownAmountGuidance(program.benefit_type),
      tiered_amount_guidance: tieredAmountGuidance(program.benefit_type),
      overview_tiered_guidance: overviewTieredGuidance(program.benefit_type),
      qualify_intro: "You may qualify if you meet the requirements below.",
    },
  };
}
