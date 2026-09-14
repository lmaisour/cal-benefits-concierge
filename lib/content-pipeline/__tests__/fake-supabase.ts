type Row = Record<string, unknown>;
type QueryError = { message: string; code?: string };

export type FakeSupabaseOptions = {
  tables?: Record<string, Row[]>;
  errors?: Record<string, QueryError>;
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
    content_opportunities: [],
    content_pipeline_runs: [],
    ...(options.tables
      ? Object.fromEntries(
          Object.entries(options.tables).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
        )
      : {}),
  };

  function from(table: string) {
    const configuredError = options.errors?.[table] ?? null;
    let action: "select" | "insert" | "update" = "select";
    let payload: Row | null = null;
    const filters: [string, unknown][] = [];

    const matches = (row: Row) =>
      filters.every(([column, value]) => row[column] === value);

    const execute = () => {
      if (configuredError) {
        return { data: null, error: configuredError };
      }
      const now = new Date().toISOString();
      if (action === "insert" && payload) {
        const collection = tables[table] ?? (tables[table] = []);
        if (table === "content_opportunities") {
          const duplicate = collection.some(
            (row) =>
              row.opportunity_type === payload?.opportunity_type &&
              row.program_id === payload?.program_id,
          );
          if (duplicate) {
            return { data: null, error: { message: "duplicate key", code: "23505" } };
          }
        }
        const row = {
          created_at: now,
          updated_at: now,
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
          ...payload,
        };
        collection.push(row);
        return { data: [{ ...row }], error: null };
      }
      const current = tables[table] ?? [];
      if (action === "update" && payload) {
        const updated: Row[] = [];
        tables[table] = current.map((row) => {
          if (!matches(row)) {
            return row;
          }
          const next = { ...row, ...payload, updated_at: now };
          updated.push(next);
          return next;
        });
        return { data: updated, error: null };
      }
      return { data: current.filter(matches), error: null };
    };

    const query = {
      select() {
        return query;
      },
      insert(row: Row) {
        action = "insert";
        payload = row;
        return query;
      },
      update(row: Row) {
        action = "update";
        payload = row;
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
        const { data, error } = execute();
        return { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
      },
      async single() {
        const { data, error } = execute();
        return { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
      },
      then(
        resolve: (value: { data: Row[] | null; error: QueryError | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };
    return query;
  }

  return { from, tables };
}
