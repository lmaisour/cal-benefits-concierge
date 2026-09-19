import { createHash } from "node:crypto";
import { collectOfficialSources } from "@/lib/content-pipeline/official-sources";
import type { DiscoveryRecord, EditorialEvidenceRow } from "@/lib/content-pipeline/types";
import { AutomationError } from "@/lib/content-pipeline/automation-types";

const FINGERPRINT_VERSION = 1;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, stable((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function relevantEvidence(rows: EditorialEvidenceRow[]): unknown[] {
  return rows
    .filter((row) => row.confidence === "HIGH" && Boolean(row.verified_at?.trim()))
    .map((row) => ({
      content_section: row.content_section,
      claim: row.claim,
      source_url: row.source_url,
      source_title: row.source_title ?? null,
      confidence: row.confidence ?? null,
      verified_at: row.verified_at ?? null,
    }))
    .sort((a, b) =>
      `${a.content_section}:${a.source_url}:${a.claim}`.localeCompare(
        `${b.content_section}:${b.source_url}:${b.claim}`,
      ),
    );
}

export function authoritativeStatePayload(record: DiscoveryRecord): unknown {
  const program = record.program;
  return {
    version: FINGERPRINT_VERSION,
    program: {
      id: record.program_id,
      external_id: program.external_id,
      slug: program.slug,
      name: program.name,
      status: program.status,
      active: program.active,
      official_url: program.official_url,
      application_url: program.application_url,
      benefit_type: program.benefit_type,
      benefit_min: program.benefit_min,
      benefit_max: program.benefit_max,
      benefit_period: program.benefit_period,
      benefit_amount_structure: program.benefit_amount_structure ?? null,
      benefit_summary: program.benefit_summary,
      application_deadline: program.application_deadline,
      effective_end: program.effective_end,
      has_unmodeled_required_criteria: program.has_unmodeled_required_criteria,
      unmodeled_required_criteria_summary: program.unmodeled_required_criteria_summary,
    },
    benefit_tiers: (program.benefit_tiers ?? [])
      .map((tier) => ({
        amount: tier.amount,
        label: tier.label,
        condition_summary: tier.condition_summary,
      }))
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label) || (a.amount ?? 0) - (b.amount ?? 0),
      ),
    eligibility_rules: record.rules
      .map((rule) => ({
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        required: rule.required,
        rule_group: rule.rule_group,
        group_operator: rule.group_operator,
      }))
      .sort((a, b) => `${a.rule_group}:${a.field}:${a.operator}`.localeCompare(`${b.rule_group}:${b.field}:${b.operator}`)),
    locations: record.locations
      .map((location) => ({
        location_type: location.location_type,
        location_value: location.location_value,
      }))
      .sort((a, b) =>
        `${a.location_type}:${a.location_value}`.localeCompare(`${b.location_type}:${b.location_value}`),
      ),
    official_sources: collectOfficialSources({
      official_url: program.official_url,
      sources: record.sources,
    })
      .map((source) => ({
        url: source.url,
        organization: source.organization,
        source_type: source.source_type,
      }))
      .sort((a, b) => a.url.localeCompare(b.url)),
    brief: record.brief
      ? {
          primary_keyword: record.brief.primary_keyword ?? null,
          suggested_title: record.brief.suggested_title ?? null,
          suggested_meta_description: record.brief.suggested_meta_description ?? null,
          questions_to_answer: record.brief.questions_to_answer ?? [],
          topics_to_cover: record.brief.topics_to_cover ?? [],
        }
      : null,
    verified_evidence: relevantEvidence(record.evidence_rows),
  };
}

export function fingerprintAuthoritativeState(record: DiscoveryRecord): string {
  const encoded = JSON.stringify(stable(authoritativeStatePayload(record)));
  return createHash("sha256").update(encoded).digest("hex");
}

export function assertAutonomousPublicationEligible(
  generationFingerprint: string | null | undefined,
  currentFingerprint: string | null | undefined,
): void {
  if (!generationFingerprint) {
    throw new AutomationError(
      "missing_authoritative_fingerprint",
      "Historical runs without an authoritative fingerprint are not autonomously publishable.",
    );
  }
  if (!currentFingerprint || currentFingerprint !== generationFingerprint) {
    throw new AutomationError(
      "stale_authoritative_state",
      "Authoritative program state changed since this draft was generated.",
    );
  }
}
