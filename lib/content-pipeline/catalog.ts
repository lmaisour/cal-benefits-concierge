import {
  CITY_PLANTS_SLUG,
  cityPlantsBrief,
  cityPlantsContent,
  cityPlantsEvidence,
  cityPlantsFaqs,
} from "@/data/content/city-plants-free-trees";
import {
  LEAP_EXTERNAL_ID,
  LEAP_SLUG,
  leapBrief,
  leapContent,
  leapEvidence,
  leapFaqs,
} from "@/data/content/ladwp-landscape-efficiency-assistance";
import { programCatalog } from "@/data/programs/index";
import { siteConfig } from "@/lib/config/site";
import type { ProgramCatalog } from "@/lib/programs/import/types";
import { catalogProgramId } from "@/lib/content-pipeline/ids";
import type {
  DiscoveryRecord,
  DuplicateIndex,
  EditorialBrief,
  EditorialContent,
  EditorialEvidenceRow,
  EditorialFaq,
  PipelineCatalogContext,
} from "@/lib/content-pipeline/types";

export type CatalogEditorialOverlay = {
  slug?: string;
  external_id?: string;
  content: EditorialContent;
  faqs?: EditorialFaq[];
  brief?: EditorialBrief | null;
  evidence_rows?: EditorialEvidenceRow[];
};

const STATIC_ROUTES = [
  siteConfig.urls.home,
  siteConfig.urls.check,
  siteConfig.urls.results,
  siteConfig.urls.programs,
  siteConfig.urls.guides,
];

export function defaultEditorialOverlays(): CatalogEditorialOverlay[] {
  return [
    {
      slug: LEAP_SLUG,
      external_id: LEAP_EXTERNAL_ID,
      content: leapContent,
      faqs: leapFaqs,
      brief: leapBrief,
      evidence_rows: leapEvidence,
    },
    {
      slug: CITY_PLANTS_SLUG,
      content: cityPlantsContent,
      faqs: cityPlantsFaqs,
      brief: cityPlantsBrief,
      evidence_rows: cityPlantsEvidence,
    },
  ];
}

function overlayFor(
  program: { slug: string; external_id: string },
  overlays: CatalogEditorialOverlay[],
): CatalogEditorialOverlay | undefined {
  return overlays.find(
    (overlay) =>
      overlay.slug === program.slug || overlay.external_id === program.external_id,
  );
}

export function buildCatalogContext(
  catalog: ProgramCatalog = programCatalog,
  overlays: CatalogEditorialOverlay[] = defaultEditorialOverlays(),
): PipelineCatalogContext {
  const records: DiscoveryRecord[] = catalog.programs.map((program) => {
    const overlay = overlayFor(program, overlays);
    return {
      program_id: catalogProgramId(program.external_id),
      program,
      rules: catalog.rules.filter((rule) => rule.program_external_id === program.external_id),
      locations: catalog.locations.filter(
        (location) => location.program_external_id === program.external_id,
      ),
      sources: catalog.sources.filter(
        (source) => source.program_external_id === program.external_id,
      ),
      content: overlay?.content ?? null,
      faqs: overlay?.faqs ?? [],
      brief: overlay?.brief ?? null,
      evidence_rows: overlay?.evidence_rows ?? [],
    };
  });

  const known_routes = [
    ...STATIC_ROUTES,
    ...records.map((record) => `/programs/${record.program.slug}`),
  ];

  const titles = new Set<string>();
  const slugs = new Set<string>();
  for (const record of records) {
    slugs.add(record.program.slug);
    titles.add(record.program.name);
    if (record.program.consumer_headline) {
      titles.add(record.program.consumer_headline);
    }
    if (record.content?.seo_title) {
      titles.add(record.content.seo_title);
    }
  }

  const duplicates: DuplicateIndex = {
    slugs: [...slugs],
    titles: [...titles],
  };

  return { records, known_routes, duplicates };
}

export function catalogRecordProgramId(externalId: string): string {
  return catalogProgramId(externalId);
}
