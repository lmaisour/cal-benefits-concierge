import { isRepayableBenefit } from "@/lib/programs/labels";
import {
  CATALOG_CATEGORIES,
  type CatalogProgram,
  type ProgramCatalog,
} from "@/lib/programs/import/types";
import {
  BENEFIT_TYPES,
  CONFIDENCE_LEVELS,
  LOCATION_TYPES,
  PROGRAM_STATUSES,
  RELATIONSHIP_TYPES,
  RULE_GROUP_OPERATORS,
  RULE_OPERATORS,
  SOURCE_TYPES,
  type LocationType,
  type RuleOperator,
} from "@/types/database";

export type CatalogIssue = {
  code: string;
  message: string;
  externalId?: string;
};

const HTTP_URL = /^https?:\/\/.+/i;

function isHttpUrl(value: string): boolean {
  return HTTP_URL.test(value.trim());
}

export function validateCatalog(catalog: ProgramCatalog): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const programsById = new Map<string, CatalogProgram>();
  const slugs = new Set<string>();

  for (const program of catalog.programs) {
    if (programsById.has(program.external_id)) {
      issues.push({
        code: "duplicate_external_id",
        message: `Duplicate external_id ${program.external_id}`,
        externalId: program.external_id,
      });
    }
    programsById.set(program.external_id, program);

    if (slugs.has(program.slug)) {
      issues.push({
        code: "duplicate_slug",
        message: `Duplicate slug ${program.slug}`,
        externalId: program.external_id,
      });
    }
    slugs.add(program.slug);

    if (program.name.startsWith("SAMPLE:")) {
      issues.push({
        code: "sample_name",
        message: `${program.external_id} uses a SAMPLE: name`,
        externalId: program.external_id,
      });
    }

    const urls = [program.official_url, program.application_url];
    for (const url of urls) {
      if (url?.includes("example.invalid")) {
        issues.push({
          code: "example_invalid",
          message: `${program.external_id} uses example.invalid`,
          externalId: program.external_id,
        });
      }
    }

    if (!CATALOG_CATEGORIES.includes(program.category)) {
      issues.push({
        code: "category",
        message: `${program.external_id} has unsupported category ${program.category}`,
        externalId: program.external_id,
      });
    }
    if (!BENEFIT_TYPES.includes(program.benefit_type)) {
      issues.push({
        code: "benefit_type",
        message: `${program.external_id} has unsupported benefit_type`,
        externalId: program.external_id,
      });
    }
    if (!PROGRAM_STATUSES.includes(program.status)) {
      issues.push({
        code: "status",
        message: `${program.external_id} has unsupported status`,
        externalId: program.external_id,
      });
    }
    if (!CONFIDENCE_LEVELS.includes(program.confidence)) {
      issues.push({
        code: "confidence",
        message: `${program.external_id} has unsupported confidence`,
        externalId: program.external_id,
      });
    }

    if (
      program.benefit_min !== null &&
      program.benefit_max !== null &&
      program.benefit_min > program.benefit_max
    ) {
      issues.push({
        code: "benefit_range",
        message: `${program.external_id} benefit_min exceeds benefit_max`,
        externalId: program.external_id,
      });
    }

    if (program.active) {
      if (!program.external_id.trim()) {
        issues.push({
          code: "active_external_id",
          message: "Active program is missing external_id",
        });
      }
      if (!program.official_url || !isHttpUrl(program.official_url)) {
        issues.push({
          code: "active_official_url",
          message: `${program.external_id} is active without an official HTTP URL`,
          externalId: program.external_id,
        });
      }
      if (program.status === "EXPIRED") {
        issues.push({
          code: "active_expired",
          message: `${program.external_id} is active with EXPIRED status`,
          externalId: program.external_id,
        });
      }
      if (program.confidence === "LOW") {
        issues.push({
          code: "active_low_confidence",
          message: `${program.external_id} is active with LOW confidence`,
          externalId: program.external_id,
        });
      }
    }

    if (
      isRepayableBenefit(program.benefit_type) &&
      program.benefit_type !== "LOAN" &&
      program.benefit_type !== "FINANCING"
    ) {
      issues.push({
        code: "repayable",
        message: `${program.external_id} repayable classification mismatch`,
        externalId: program.external_id,
      });
    }
  }

  const sourcesByProgram = new Map<string, number>();
  for (const source of catalog.sources) {
    if (!programsById.has(source.program_external_id)) {
      issues.push({
        code: "source_program",
        message: `Source references unknown program ${source.program_external_id}`,
        externalId: source.program_external_id,
      });
    }
    if (!SOURCE_TYPES.includes(source.source_type)) {
      issues.push({
        code: "source_type",
        message: `Unsupported source type on ${source.program_external_id}`,
        externalId: source.program_external_id,
      });
    }
    if (!source.url.trim() || !isHttpUrl(source.url) || source.url.includes("example.invalid")) {
      issues.push({
        code: "source_url",
        message: `Invalid source URL on ${source.program_external_id}`,
        externalId: source.program_external_id,
      });
    }
    sourcesByProgram.set(
      source.program_external_id,
      (sourcesByProgram.get(source.program_external_id) ?? 0) + 1,
    );
  }

  for (const program of catalog.programs) {
    if (program.active && (sourcesByProgram.get(program.external_id) ?? 0) < 1) {
      issues.push({
        code: "active_source",
        message: `${program.external_id} is active without a source`,
        externalId: program.external_id,
      });
    }
  }

  for (const rule of catalog.rules) {
    if (!programsById.has(rule.program_external_id)) {
      issues.push({
        code: "rule_program",
        message: `Rule references unknown program ${rule.program_external_id}`,
        externalId: rule.program_external_id,
      });
    }
    if (!RULE_OPERATORS.includes(rule.operator as RuleOperator)) {
      issues.push({
        code: "rule_operator",
        message: `Unsupported operator ${rule.operator} on ${rule.program_external_id}`,
        externalId: rule.program_external_id,
      });
    }
    if (!RULE_GROUP_OPERATORS.includes(rule.group_operator)) {
      issues.push({
        code: "rule_group_operator",
        message: `Unsupported group operator on ${rule.program_external_id}`,
        externalId: rule.program_external_id,
      });
    }
  }

  for (const location of catalog.locations) {
    if (!programsById.has(location.program_external_id)) {
      issues.push({
        code: "location_program",
        message: `Location references unknown program ${location.program_external_id}`,
        externalId: location.program_external_id,
      });
    }
    if (!LOCATION_TYPES.includes(location.location_type as LocationType)) {
      issues.push({
        code: "location_type",
        message: `Unsupported location type on ${location.program_external_id}`,
        externalId: location.program_external_id,
      });
    }
  }

  for (const relationship of catalog.relationships) {
    if (!programsById.has(relationship.program_a_external_id)) {
      issues.push({
        code: "relationship_a",
        message: `Relationship references unknown program ${relationship.program_a_external_id}`,
      });
    }
    if (!programsById.has(relationship.program_b_external_id)) {
      issues.push({
        code: "relationship_b",
        message: `Relationship references unknown program ${relationship.program_b_external_id}`,
      });
    }
    if (!RELATIONSHIP_TYPES.includes(relationship.relationship_type)) {
      issues.push({
        code: "relationship_type",
        message: `Unsupported relationship type`,
      });
    }
  }

  return issues;
}
