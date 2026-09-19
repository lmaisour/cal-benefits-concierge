import type { GuideRow } from "@/types/database";
import { persistPublishedGuideTransaction } from "@/lib/content-pipeline/publish-transaction";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";
import type {
  PublishFailAt,
  PublishGuideWrite,
} from "@/lib/content-pipeline/publish-store";

type Row = Record<string, unknown>;
type QueryError = { message: string; code?: string };

export type FakeSupabaseOptions = {
  tables?: Record<string, Row[]>;
  errors?: Record<string, QueryError>;
};

const PIPELINE_INSERT_DEFAULTS = {
  secondary_keywords: [],
  mode: "DRY_RUN",
  opportunity_id: null,
  completed_at: null,
  selected_reason: null,
  evidence_snapshot: null,
  draft_snapshot: null,
  validation_snapshot: null,
  error_message: null,
  provider_metadata: null,
  guide_id: null,
  next_eligible_at: null,
};

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const tables: Record<string, Row[]> = {
    programs: [],
    program_rules: [],
    program_locations: [],
    program_sources: [],
    program_content: [],
    program_faqs: [],
    content_briefs: [],
    content_evidence: [],
    homepage_features: [],
    program_benefit_tiers: [],
    content_opportunities: [],
    content_pipeline_runs: [],
    guides: [],
    guide_programs: [],
    ...(options.tables
      ? Object.fromEntries(
          Object.entries(options.tables).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
        )
      : {}),
  };

  function uniqueViolation(collection: Row[], table: string, incoming: Row): QueryError | null {
    if (incoming.id && collection.some((row) => row.id === incoming.id)) {
      return { message: "duplicate key", code: "23505" };
    }
    if (table === "guides" && collection.some((row) => row.slug === incoming.slug)) {
      return { message: "duplicate key", code: "23505" };
    }
    if (
      table === "content_opportunities" &&
      collection.some(
        (row) =>
          row.opportunity_type === incoming.opportunity_type &&
          row.program_id === incoming.program_id,
      )
    ) {
      return { message: "duplicate key", code: "23505" };
    }
    if (
      table === "guide_programs" &&
      collection.some(
        (row) => row.guide_id === incoming.guide_id && row.program_id === incoming.program_id,
      )
    ) {
      return { message: "duplicate key", code: "23505" };
    }
    return null;
  }

  function from(table: string) {
    const configuredError = options.errors?.[table] ?? null;
    let action: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    const filters: [string, unknown][] = [];

    const matches = (row: Row) =>
      filters.every(([column, value]) => row[column] === value);

    const execute = () => {
      if (configuredError) {
        return { data: null, error: configuredError };
      }
      const now = new Date().toISOString();
      const current = tables[table] ?? (tables[table] = []);
      if (action === "insert" && payload) {
        const incoming = Array.isArray(payload) ? payload : [payload];
        const created: Row[] = [];
        for (const item of incoming) {
          const defaults =
            table === "content_opportunities" || table === "content_pipeline_runs"
              ? PIPELINE_INSERT_DEFAULTS
              : {};
          const row = {
            created_at: now,
            updated_at: now,
            ...defaults,
            ...item,
          };
          const conflict = uniqueViolation(current.concat(created), table, row);
          if (conflict) {
            return { data: null, error: conflict };
          }
          created.push(row);
        }
        current.push(...created);
        tables[table] = current;
        return { data: created.map((row) => ({ ...row })), error: null };
      }
      if (action === "update" && payload && !Array.isArray(payload)) {
        const updated: Row[] = [];
        tables[table] = current.map((row) => {
          if (!matches(row)) {
            return row;
          }
          const next = { ...row, ...payload, updated_at: now };
          const others = current.filter((item) => item !== row);
          const conflict = uniqueViolation(others, table, next);
          if (conflict) {
            throw conflict;
          }
          updated.push(next);
          return next;
        });
        return { data: updated, error: null };
      }
      if (action === "delete") {
        const kept: Row[] = [];
        const removed: Row[] = [];
        for (const row of current) {
          if (matches(row)) {
            removed.push(row);
          } else {
            kept.push(row);
          }
        }
        tables[table] = kept;
        return { data: removed, error: null };
      }
      return { data: current.filter(matches), error: null };
    };

    const query = {
      select() {
        return query;
      },
      insert(row: Row | Row[]) {
        action = "insert";
        payload = row;
        return query;
      },
      update(row: Row) {
        action = "update";
        payload = row;
        return query;
      },
      delete() {
        action = "delete";
        return query;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return query;
      },
      order() {
        return query;
      },
      async maybeSingle() {
        try {
          const { data, error } = execute();
          return { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
        } catch (error) {
          return { data: null, error: error as QueryError };
        }
      },
      async single() {
        try {
          const { data, error } = execute();
          return { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
        } catch (error) {
          return { data: null, error: error as QueryError };
        }
      },
      then(
        resolve: (value: { data: Row[] | null; error: QueryError | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        try {
          return Promise.resolve(execute()).then(resolve, reject);
        } catch (error) {
          return Promise.resolve({ data: null, error: error as QueryError }).then(resolve, reject);
        }
      },
    };
    return query;
  }

  async function rpc(fn: string, args: Record<string, unknown> = {}) {
    if (fn !== "publish_content_guide") {
      return { data: null, error: { message: `Unknown rpc ${fn}` } };
    }
    const write: PublishGuideWrite = {
      id: String(args.p_guide_id),
      opportunity_id: String(args.p_opportunity_id),
      program_id: String(args.p_program_id),
      title: String(args.p_title),
      slug: String(args.p_slug),
      seo_title: args.p_seo_title == null ? null : String(args.p_seo_title),
      meta_description:
        args.p_meta_description == null ? null : String(args.p_meta_description),
      excerpt: args.p_excerpt == null ? null : String(args.p_excerpt),
      body: String(args.p_body ?? ""),
      published_at: String(args.p_published_at),
    };
    const failAt =
      typeof args.p_fail_at === "string" ? (args.p_fail_at as PublishFailAt) : null;
    const guidePrograms = new Map<string, string[]>();
    for (const row of tables.guide_programs ?? []) {
      const guideId = String(row.guide_id);
      const programIds = guidePrograms.get(guideId) ?? [];
      programIds.push(String(row.program_id));
      guidePrograms.set(guideId, programIds);
    }
    const state = {
      guides: new Map(
        (tables.guides ?? []).map((row) => [String(row.id), { ...row } as GuideRow]),
      ),
      guidePrograms,
      opportunityGuideIds: new Map(
        (tables.content_opportunities ?? []).map((row) => [
          String(row.id),
          (row.guide_id as string | null) ?? null,
        ]),
      ),
    };
    try {
      const result = persistPublishedGuideTransaction(state, write, {
        failAt,
        now: write.published_at,
      });
      tables.guides = [...state.guides.values()];
      tables.guide_programs = [...state.guidePrograms.entries()].flatMap(
        ([guide_id, programIds]) =>
          programIds.map((program_id) => ({
            guide_id,
            program_id,
            created_at: write.published_at,
          })),
      );
      tables.content_opportunities = (tables.content_opportunities ?? []).map((row) => ({
        ...row,
        guide_id: state.opportunityGuideIds.has(String(row.id))
          ? state.opportunityGuideIds.get(String(row.id)) ?? null
          : row.guide_id,
      }));
      return { data: { created: result.created, guide: result.guide }, error: null };
    } catch (error) {
      if (error instanceof PublishConflictError) {
        return {
          data: null,
          error: {
            message: error.code,
            code: error.code === "guide_slug_conflict" ? "23505" : "P0002",
          },
        };
      }
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "publish failed",
        },
      };
    }
  }

  return { from, tables, rpc };
}
