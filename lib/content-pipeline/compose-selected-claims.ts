import { renderDraftFromClaims } from "@/lib/content-pipeline/generate-draft";
import {
  FACTUAL_DRAFT_SECTIONS,
  type ContentDraft,
  type EvidencePackage,
  type FactualDraftSection,
  type ScoredOpportunity,
  type SourceClaim,
} from "@/lib/content-pipeline/types";

export type LlmDraftProviderErrorCode =
  | "MALFORMED_OUTPUT"
  | "UNKNOWN_CLAIM_ID"
  | "CLAIM_SECTION_MISMATCH"
  | "DUPLICATE_CLAIM_ID"
  | "INCOMPLETE_SELECTION"
  | "TIMEOUT"
  | "PROVIDER_HTTP"
  | "MISSING_API_KEY"
  | "INVALID_PROVIDER";

export class LlmDraftProviderError extends Error {
  readonly code: LlmDraftProviderErrorCode;

  constructor(code: LlmDraftProviderErrorCode, message: string) {
    super(message);
    this.name = "LlmDraftProviderError";
    this.code = code;
  }
}

export function sanitizeProviderMessage(value: string, apiKey = ""): string {
  const withoutKey = apiKey ? value.split(apiKey).join("[redacted]") : value;
  return withoutKey
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

export type SectionClaimIds = Record<FactualDraftSection, string[]>;

export function emptySectionClaimIds(): SectionClaimIds {
  return Object.fromEntries(
    FACTUAL_DRAFT_SECTIONS.map((section) => [section, [] as string[]]),
  ) as SectionClaimIds;
}

export function claimIdsBySection(claims: SourceClaim[]): SectionClaimIds {
  const grouped = emptySectionClaimIds();
  for (const claim of claims) {
    grouped[claim.section].push(claim.claim_id);
  }
  return grouped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseClaimSelection(raw: unknown): SectionClaimIds {
  if (!isRecord(raw)) {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider returned a non-object payload.",
    );
  }
  const extraTopLevel = Object.keys(raw).filter((key) => key !== "sections");
  if (extraTopLevel.length > 0) {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider returned unsupported top-level fields.",
    );
  }
  if (!isRecord(raw.sections)) {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider omitted the required sections object.",
    );
  }

  const extraSections = Object.keys(raw.sections).filter(
    (key) => !FACTUAL_DRAFT_SECTIONS.includes(key as FactualDraftSection),
  );
  if (extraSections.length > 0) {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider returned unknown draft sections.",
    );
  }

  const selection = emptySectionClaimIds();
  let total = 0;
  for (const section of FACTUAL_DRAFT_SECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(raw.sections, section)) {
      throw new LlmDraftProviderError(
        "INCOMPLETE_SELECTION",
        `Draft provider omitted section ${section}.`,
      );
    }
    const ids = raw.sections[section];
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      throw new LlmDraftProviderError(
        "MALFORMED_OUTPUT",
        `Draft provider returned invalid claim IDs for section ${section}.`,
      );
    }
    const trimmed = ids.map((id) => id.trim());
    if (trimmed.some((id) => id.length === 0)) {
      throw new LlmDraftProviderError(
        "MALFORMED_OUTPUT",
        `Draft provider returned an empty claim ID in section ${section}.`,
      );
    }
    selection[section] = trimmed;
    total += trimmed.length;
  }
  if (total === 0) {
    throw new LlmDraftProviderError(
      "INCOMPLETE_SELECTION",
      "Draft provider selected no factual claims.",
    );
  }
  return selection;
}

export function composeDraftFromSelectedClaimIds(
  selection: SectionClaimIds,
  allowed: SourceClaim[],
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  const byId = new Map<string, SourceClaim>();
  for (const claim of allowed) {
    byId.set(claim.claim_id, claim);
  }

  const seen = new Set<string>();
  const selected: SourceClaim[] = [];
  const selectedIds = new Set(
    FACTUAL_DRAFT_SECTIONS.flatMap((section) => selection[section]),
  );
  for (const claim of allowed) {
    if (isRequiredSelectedClaim(claim) && !selectedIds.has(claim.claim_id)) {
      throw new LlmDraftProviderError(
        "INCOMPLETE_SELECTION",
        `Draft provider omitted required claim ${claim.claim_id}.`,
      );
    }
  }
  for (const section of FACTUAL_DRAFT_SECTIONS) {
    const sectionSeen = new Set<string>();
    for (const claimId of selection[section]) {
      const canonical = byId.get(claimId);
      if (!canonical) {
        throw new LlmDraftProviderError(
          "UNKNOWN_CLAIM_ID",
          `Draft provider selected unknown claim ${claimId}.`,
        );
      }
      if (canonical.section !== section) {
        throw new LlmDraftProviderError(
          "CLAIM_SECTION_MISMATCH",
          `Draft provider moved claim ${claimId} out of its authoritative section.`,
        );
      }
      if (sectionSeen.has(claimId) || seen.has(claimId)) {
        throw new LlmDraftProviderError(
          "DUPLICATE_CLAIM_ID",
          `Draft provider selected claim ${claimId} more than once.`,
        );
      }
      sectionSeen.add(claimId);
      seen.add(claimId);
      selected.push(canonical);
    }
  }

  return renderDraftFromClaims(selected, evidence, opportunity);
}

function isRequiredSelectedClaim(claim: SourceClaim): boolean {
  return (
    claim.claim_id === "eligibility-unmodeled" ||
    claim.claim_id === "notes-unmodeled" ||
    claim.claim_id === "how-to-apply-before-purchase" ||
    claim.claim_id === "notes-not-exhaustive" ||
    /(?:^|-)tier-\d+$/.test(claim.claim_id) ||
    /^benefit\.tiers\.\d+/.test(claim.evidence_path)
  );
}
