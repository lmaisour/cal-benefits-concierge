import type { ScoredOpportunity } from "@/lib/content-pipeline/types";

function compareOpportunities(a: ScoredOpportunity, b: ScoredOpportunity): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const slug = a.proposed_slug.localeCompare(b.proposed_slug);
  if (slug !== 0) {
    return slug;
  }
  return a.external_id.localeCompare(b.external_id);
}

export function sortScoredOpportunities(
  opportunities: ScoredOpportunity[],
): ScoredOpportunity[] {
  return [...opportunities].sort(compareOpportunities);
}

export function selectOpportunity(
  opportunities: ScoredOpportunity[],
): ScoredOpportunity | null {
  const ranked = sortScoredOpportunities(opportunities);
  return ranked[0] ?? null;
}

export function selectionReason(selected: ScoredOpportunity): string {
  const top = selected.score_breakdown.components
    .filter((component) => component.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((component) => `${component.key} (${component.points})`)
    .join(", ");
  return `Selected ${selected.external_id} with score ${selected.score} because it ranked first for the current catalog state. Top positive components: ${top || "none"}.`;
}
