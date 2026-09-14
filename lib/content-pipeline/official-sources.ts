import { isHttpUrl } from "@/lib/admin/validate-program";
import type { CatalogSource } from "@/lib/programs/import/types";
import type { EvidenceSource } from "@/lib/content-pipeline/types";

export function isOfficialHttpUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && isHttpUrl(value.trim());
}

export function collectOfficialSources(input: {
  official_url: string | null | undefined;
  sources: CatalogSource[];
}): EvidenceSource[] {
  const collected: EvidenceSource[] = [];
  const seen = new Set<string>();

  const add = (source: EvidenceSource) => {
    const url = source.url.trim();
    if (!isOfficialHttpUrl(url) || seen.has(url)) {
      return;
    }
    seen.add(url);
    collected.push({ ...source, url });
  };

  if (input.official_url) {
    add({
      url: input.official_url,
      organization: null,
      source_type: "OFFICIAL_URL",
      verified_at: null,
      notes: null,
    });
  }

  for (const source of input.sources) {
    add({
      url: source.url,
      organization: source.organization,
      source_type: source.source_type,
      verified_at: source.verified_at,
      notes: source.notes,
    });
  }

  return collected;
}

export function hasOfficialSource(input: {
  official_url: string | null | undefined;
  sources: CatalogSource[];
}): boolean {
  return collectOfficialSources(input).length > 0;
}
