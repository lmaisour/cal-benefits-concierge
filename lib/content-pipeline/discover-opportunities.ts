import { isStaleVerification } from "@/lib/content-pipeline/freshness";
import { isGoldStandardEditorial } from "@/lib/content-pipeline/gold-standard";
import { hasOfficialSource } from "@/lib/content-pipeline/official-sources";
import {
  CONTENT_PIPELINE_OPPORTUNITY_TYPE,
  type DiscoveredOpportunity,
  type DiscoveryRecord,
  type DiscoverySkipReason,
  type SkippedDiscovery,
} from "@/lib/content-pipeline/types";

export type DiscoverOpportunitiesInput = {
  records: DiscoveryRecord[];
  now?: Date;
};

export type DiscoverOpportunitiesResult = {
  candidates: DiscoveredOpportunity[];
  skipped: SkippedDiscovery[];
};

function skipReason(record: DiscoveryRecord, nowMs: number): DiscoverySkipReason | null {
  const program = record.program;
  if (program.status !== "ACTIVE") {
    return "STATUS_NOT_ACTIVE";
  }
  if (program.active === false) {
    return "INACTIVE";
  }
  if (program.confidence === "LOW") {
    return "LOW_CONFIDENCE";
  }
  if (
    !hasOfficialSource({
      official_url: program.official_url,
      sources: record.sources,
    })
  ) {
    return "MISSING_OFFICIAL_SOURCE";
  }
  if (isStaleVerification(program.last_verified_at, nowMs)) {
    return "STALE_VERIFICATION";
  }
  if (isGoldStandardEditorial(record.content, record.faqs)) {
    return "GOLD_STANDARD_COMPLETE";
  }
  return null;
}

function proposedTitle(record: DiscoveryRecord): string {
  return (
    record.brief?.suggested_title?.trim() ||
    record.program.consumer_headline?.trim() ||
    `${record.program.name}: who may qualify`
  );
}

function primaryKeyword(record: DiscoveryRecord): string {
  return (
    record.brief?.primary_keyword?.trim() ||
    record.program.consumer_headline?.trim() ||
    record.program.name
  );
}

function discoveryReason(record: DiscoveryRecord): string {
  const missingFaqs = record.faqs.length < 2;
  const missingContent = !record.content;
  const parts = [
    `${record.program.name} is ACTIVE with ${record.program.confidence} confidence and an official source.`,
  ];
  if (missingContent) {
    parts.push("Catalog editorial content is incomplete, so a program guide is an opportunity.");
  } else {
    parts.push("Existing editorial content is not at gold-standard completeness.");
  }
  if (missingFaqs) {
    parts.push("FAQ coverage is missing or thin.");
  }
  if (record.program.featured) {
    parts.push("The program is featured.");
  }
  return parts.join(" ");
}

export function discoverOpportunities(
  input: DiscoverOpportunitiesInput,
): DiscoverOpportunitiesResult {
  const nowMs = (input.now ?? new Date()).getTime();
  const candidates: DiscoveredOpportunity[] = [];
  const skipped: SkippedDiscovery[] = [];

  for (const record of input.records) {
    const reason = skipReason(record, nowMs);
    if (reason) {
      skipped.push({
        external_id: record.program.external_id || record.program_id,
        slug: record.program.slug,
        reason,
      });
      continue;
    }

    const secondary =
      record.brief?.secondary_keywords?.filter((keyword) => keyword.trim().length > 0) ?? [];

    candidates.push({
      opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      program_id: record.program_id,
      external_id: record.program.external_id || record.program_id,
      proposed_slug: record.program.slug,
      proposed_title: proposedTitle(record),
      primary_keyword: primaryKeyword(record),
      secondary_keywords: secondary,
      discovery_reason: discoveryReason(record),
      record,
    });
  }

  return { candidates, skipped };
}
