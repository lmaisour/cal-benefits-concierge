import { siteConfig } from "@/lib/config/site";
import type { CatalogCategory } from "@/lib/programs/import/types";
import type {
  ContentBriefRow,
  ContentEvidenceRow,
  HomepageFeatureRow,
  ProgramContentRow,
  ProgramFaqRow,
  ProgramLocationRow,
  ProgramRow,
  ProgramRuleRow,
  ProgramSourceRow,
} from "@/types/database";
import type {
  DiscoveryRecord,
  DuplicateIndex,
  PipelineCatalogContext,
} from "@/lib/content-pipeline/types";

export type LivePipelineClient = {
  from: (table: string) => {
    select: (columns?: string) => unknown;
  };
};

export class LivePipelineLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LivePipelineLoadError";
  }
}

const STATIC_ROUTES = [
  siteConfig.urls.home,
  siteConfig.urls.check,
  siteConfig.urls.results,
  siteConfig.urls.programs,
  siteConfig.urls.guides,
];

async function loadTable<T>(
  client: LivePipelineClient,
  table: string,
): Promise<T[]> {
  const { data, error } = (await Promise.resolve(client.from(table).select("*"))) as {
    data: T[] | null;
    error: { message: string; code?: string } | null;
  };
  if (error) {
    throw new LivePipelineLoadError(`Failed to load ${table}: ${error.message}`);
  }
  return (data ?? []) as T[];
}

function toCatalogProgram(
  program: ProgramRow,
  featured: boolean,
): DiscoveryRecord["program"] {
  return {
    external_id: program.external_id ?? program.id,
    name: program.name,
    slug: program.slug,
    administrator: program.administrator,
    consumer_headline: program.consumer_headline,
    administrator_display_name: program.administrator_display_name,
    consumer_tags: program.consumer_tags,
    category: program.category as CatalogCategory,
    subcategory: program.subcategory,
    short_description: program.short_description,
    description: program.description,
    benefit_summary: program.benefit_summary,
    benefit_type: program.benefit_type,
    benefit_min: program.benefit_min,
    benefit_max: program.benefit_max,
    benefit_period: program.benefit_period,
    status: program.status,
    official_url: program.official_url ?? "",
    application_url: program.application_url,
    statewide: program.statewide,
    preapproval_required: program.preapproval_required,
    purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    effective_start: program.effective_start,
    effective_end: program.effective_end,
    application_deadline: program.application_deadline,
    last_verified_at: program.last_verified_at ?? "",
    confidence: program.confidence ?? "MEDIUM",
    featured,
    active: program.active,
    has_unmodeled_required_criteria: program.has_unmodeled_required_criteria,
    unmodeled_required_criteria_summary: program.unmodeled_required_criteria_summary,
  };
}

export function recordsFromLiveRows(input: {
  programs: ProgramRow[];
  rules: ProgramRuleRow[];
  locations: ProgramLocationRow[];
  sources: ProgramSourceRow[];
  content: ProgramContentRow[];
  faqs: ProgramFaqRow[];
  briefs: ContentBriefRow[];
  evidence: ContentEvidenceRow[];
  homepageFeatures: HomepageFeatureRow[];
}): DiscoveryRecord[] {
  const featuredIds = new Set(input.homepageFeatures.map((row) => row.program_id));
  const rulesByProgram = groupBy(input.rules, (row) => row.program_id);
  const locationsByProgram = groupBy(input.locations, (row) => row.program_id);
  const sourcesByProgram = groupBy(input.sources, (row) => row.program_id);
  const contentByProgram = new Map(input.content.map((row) => [row.program_id, row]));
  const faqsByProgram = groupBy(input.faqs, (row) => row.program_id);
  const briefsByProgram = new Map(
    input.briefs
      .filter((row) => row.program_id)
      .map((row) => [row.program_id as string, row]),
  );
  const evidenceByProgram = groupBy(input.evidence, (row) => row.program_id);

  return input.programs.map((program) => {
    const content = contentByProgram.get(program.id);
    const brief = briefsByProgram.get(program.id);
    return {
      program_id: program.id,
      program: toCatalogProgram(
        program,
        program.featured || featuredIds.has(program.id),
      ),
      rules: (rulesByProgram.get(program.id) ?? []).map((rule) => ({
        program_external_id: program.external_id ?? program.id,
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        rule_group: rule.rule_group,
        group_operator: rule.group_operator,
        required: rule.required,
        explanation: rule.explanation,
      })),
      locations: (locationsByProgram.get(program.id) ?? []).map((location) => ({
        program_external_id: program.external_id ?? program.id,
        location_type: location.location_type,
        location_value: location.location_value,
      })),
      sources: (sourcesByProgram.get(program.id) ?? []).map((source) => ({
        program_external_id: program.external_id ?? program.id,
        source_type: source.source_type,
        organization: source.organization,
        url: source.url,
        verified_at: source.verified_at ?? "",
        notes: source.notes,
      })),
      content: content
        ? {
            seo_title: content.seo_title,
            meta_description: content.meta_description,
            overview: content.overview,
            benefit_explanation: content.benefit_explanation,
            how_to_apply: content.how_to_apply,
            documents_needed: content.documents_needed,
            important_notes: content.important_notes,
          }
        : null,
      faqs: (faqsByProgram.get(program.id) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((faq) => ({
          question: faq.question,
          answer: faq.answer,
          sort_order: faq.sort_order,
        })),
      brief: brief
        ? {
            primary_keyword: brief.primary_keyword,
            secondary_keywords: brief.secondary_keywords,
            suggested_title: brief.suggested_title,
            suggested_meta_description: brief.suggested_meta_description,
            questions_to_answer: brief.questions_to_answer,
            topics_to_cover: brief.topics_to_cover,
            search_intent: brief.search_intent,
          }
        : null,
      evidence_rows: (evidenceByProgram.get(program.id) ?? []).map((row) => ({
        content_section: row.content_section,
        claim: row.claim,
        source_url: row.source_url,
        source_title: row.source_title,
        source_publisher: row.source_publisher,
        source_date: row.source_date,
        verified_at: row.verified_at,
        confidence: row.confidence,
        notes: row.notes,
      })),
    };
  });
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = key(item);
    const list = map.get(group);
    if (list) {
      list.push(item);
    } else {
      map.set(group, [item]);
    }
  }
  return map;
}

export function contextFromRecords(records: DiscoveryRecord[]): PipelineCatalogContext {
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
  return {
    records,
    known_routes: [...STATIC_ROUTES, ...records.map((record) => `/programs/${record.program.slug}`)],
    duplicates,
  };
}

export async function loadLivePipelineContext(
  client: LivePipelineClient,
): Promise<PipelineCatalogContext> {
  const [
    programs,
    rules,
    locations,
    sources,
    content,
    faqs,
    briefs,
    evidence,
    homepageFeatures,
  ] = await Promise.all([
    loadTable<ProgramRow>(client, "programs"),
    loadTable<ProgramRuleRow>(client, "program_rules"),
    loadTable<ProgramLocationRow>(client, "program_locations"),
    loadTable<ProgramSourceRow>(client, "program_sources"),
    loadTable<ProgramContentRow>(client, "program_content"),
    loadTable<ProgramFaqRow>(client, "program_faqs"),
    loadTable<ContentBriefRow>(client, "content_briefs"),
    loadTable<ContentEvidenceRow>(client, "content_evidence"),
    loadTable<HomepageFeatureRow>(client, "homepage_features"),
  ]);

  return contextFromRecords(
    recordsFromLiveRows({
      programs,
      rules,
      locations,
      sources,
      content,
      faqs,
      briefs,
      evidence,
      homepageFeatures,
    }),
  );
}
