import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { catalogSummary, programCatalog, writeCatalogJson } from "@/data/programs/index";
import { validateCatalog } from "@/lib/programs/import/validate-catalog";
import type { ProgramCatalog } from "@/lib/programs/import/types";
import type { Database, ProgramInsert } from "@/types/database";

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const catalog = programCatalog;
  const issues = validateCatalog(catalog);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${issue.code}: ${issue.message}`);
    }
    throw new Error(`Catalog failed validation with ${issues.length} issue(s).`);
  }

  const written = writeCatalogJson();
  console.log(`Wrote JSON: ${written.map((path) => path.split("/").pop()).join(", ")}`);

  const summary = catalogSummary(catalog);
  console.log("Catalog counts before database write:");
  printSummary(summary);

  if (dryRun) {
    console.log("Dry run: skipping database upsert.");
    return;
  }

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requiredEnv("SUPABASE_SECRET_KEY");
  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await assertExternalIdColumn(supabase);

  const idByExternal = await upsertPrograms(supabase, catalog);
  await replaceChildren(supabase, catalog, idByExternal);
  const removedSamples = await removeSamplePrograms(supabase);

  const after = await countDatabase(supabase);
  console.log("Import complete.");
  console.log(`Upserted programs: ${idByExternal.size}`);
  console.log(`Removed SAMPLE / example.invalid programs: ${removedSamples}`);
  console.log("Database counts after import:");
  console.log(JSON.stringify(after, null, 2));
}

async function upsertPrograms(
  supabase: SupabaseClient<Database>,
  catalog: ProgramCatalog,
): Promise<Map<string, string>> {
  const idByExternal = new Map<string, string>();

  for (const program of catalog.programs) {
    const row: ProgramInsert = {
      external_id: program.external_id,
      name: program.name,
      slug: program.slug,
      administrator: program.administrator,
      category: program.category,
      subcategory: program.subcategory,
      short_description: program.short_description,
      description: program.description,
      benefit_summary: program.benefit_summary,
      benefit_type: program.benefit_type,
      benefit_min: program.benefit_min,
      benefit_max: program.benefit_max,
      benefit_period: program.benefit_period,
      status: program.status,
      official_url: program.official_url,
      application_url: program.application_url,
      statewide: program.statewide,
      preapproval_required: program.preapproval_required,
      purchase_before_approval_allowed: program.purchase_before_approval_allowed,
      effective_start: program.effective_start,
      effective_end: program.effective_end,
      last_verified_at: program.last_verified_at,
      confidence: program.confidence,
      featured: program.featured,
      active: program.active,
    };

    const { data: existing, error: lookupError } = await supabase
      .from("programs")
      .select("id")
      .eq("external_id", program.external_id)
      .maybeSingle();
    if (lookupError) {
      throw new Error(`Lookup failed for ${program.external_id}: ${lookupError.message}`);
    }

    if (existing?.id) {
      const { error } = await supabase.from("programs").update(row).eq("id", existing.id);
      if (error) {
        throw new Error(`Update failed for ${program.external_id}: ${error.message}`);
      }
      idByExternal.set(program.external_id, existing.id);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("programs")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted) {
      throw new Error(`Insert failed for ${program.external_id}: ${error?.message ?? "no row"}`);
    }
    idByExternal.set(program.external_id, inserted.id);
  }

  return idByExternal;
}

async function replaceChildren(
  supabase: SupabaseClient<Database>,
  catalog: ProgramCatalog,
  idByExternal: Map<string, string>,
) {
  const programIds = [...idByExternal.values()];

  const { error: deleteRules } = await supabase
    .from("program_rules")
    .delete()
    .in("program_id", programIds);
  if (deleteRules) {
    throw new Error(`Failed to replace rules: ${deleteRules.message}`);
  }
  const { error: deleteLocations } = await supabase
    .from("program_locations")
    .delete()
    .in("program_id", programIds);
  if (deleteLocations) {
    throw new Error(`Failed to replace locations: ${deleteLocations.message}`);
  }
  const { error: deleteSources } = await supabase
    .from("program_sources")
    .delete()
    .in("program_id", programIds);
  if (deleteSources) {
    throw new Error(`Failed to replace sources: ${deleteSources.message}`);
  }
  const { error: deleteRelationships } = await supabase
    .from("program_relationships")
    .delete()
    .in("program_a_id", programIds);
  if (deleteRelationships) {
    throw new Error(`Failed to replace relationships: ${deleteRelationships.message}`);
  }

  if (catalog.rules.length > 0) {
    const { error } = await supabase.from("program_rules").insert(
      catalog.rules.map((rule) => ({
        program_id: requireId(idByExternal, rule.program_external_id),
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        rule_group: rule.rule_group,
        group_operator: rule.group_operator,
        required: rule.required,
        explanation: rule.explanation,
      })),
    );
    if (error) {
      throw new Error(`Rule insert failed: ${error.message}`);
    }
  }

  if (catalog.locations.length > 0) {
    const { error } = await supabase.from("program_locations").insert(
      catalog.locations.map((location) => ({
        program_id: requireId(idByExternal, location.program_external_id),
        location_type: location.location_type,
        location_value: location.location_value,
      })),
    );
    if (error) {
      throw new Error(`Location insert failed: ${error.message}`);
    }
  }

  if (catalog.sources.length > 0) {
    const { error } = await supabase.from("program_sources").insert(
      catalog.sources.map((source) => ({
        program_id: requireId(idByExternal, source.program_external_id),
        source_type: source.source_type,
        organization: source.organization,
        url: source.url,
        verified_at: source.verified_at,
        notes: source.notes,
      })),
    );
    if (error) {
      throw new Error(`Source insert failed: ${error.message}`);
    }
  }

  if (catalog.relationships.length > 0) {
    const { error } = await supabase.from("program_relationships").insert(
      catalog.relationships.map((relationship) => ({
        program_a_id: requireId(idByExternal, relationship.program_a_external_id),
        program_b_id: requireId(idByExternal, relationship.program_b_external_id),
        relationship_type: relationship.relationship_type,
        notes: relationship.notes,
      })),
    );
    if (error) {
      throw new Error(`Relationship insert failed: ${error.message}`);
    }
  }
}

async function removeSamplePrograms(supabase: SupabaseClient<Database>): Promise<number> {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, official_url, application_url")
    .or("name.like.SAMPLE:%,official_url.ilike.%example.invalid%,application_url.ilike.%example.invalid%");
  if (error) {
    throw new Error(`Failed to find SAMPLE programs: ${error.message}`);
  }
  if (!data?.length) {
    return 0;
  }
  const ids = data.map((row) => row.id);
  const { error: deleteError } = await supabase.from("programs").delete().in("id", ids);
  if (deleteError) {
    throw new Error(`Failed to delete SAMPLE programs: ${deleteError.message}`);
  }
  return ids.length;
}

async function countDatabase(supabase: SupabaseClient<Database>) {
  const programs = await selectAll(supabase, "programs");
  const rules = await countRows(supabase, "program_rules");
  const locations = await countRows(supabase, "program_locations");
  const sources = await countRows(supabase, "program_sources");
  const relationships = await countRows(supabase, "program_relationships");
  const sampleLeft = programs.filter(
    (row) =>
      row.name.startsWith("SAMPLE:") ||
      row.official_url?.includes("example.invalid") ||
      row.application_url?.includes("example.invalid"),
  ).length;

  const byStatus: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  let active = 0;
  for (const program of programs) {
    byStatus[program.status] = (byStatus[program.status] ?? 0) + 1;
    if (program.confidence) {
      byConfidence[program.confidence] = (byConfidence[program.confidence] ?? 0) + 1;
    }
    if (program.active) {
      active += 1;
    }
  }

  return {
    programs: programs.length,
    active,
    consumerVisible: programs.filter((row) => row.active && row.status !== "EXPIRED").length,
    sampleRemaining: sampleLeft,
    byStatus,
    byConfidence,
    rules,
    locations,
    sources,
    relationships,
  };
}

async function selectAll(
  supabase: SupabaseClient<Database>,
  table: "programs",
) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }
  return data ?? [];
}

async function countRows(
  supabase: SupabaseClient<Database>,
  table: "program_rules" | "program_locations" | "program_sources" | "program_relationships",
): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function assertExternalIdColumn(supabase: SupabaseClient<Database>) {
  const { error } = await supabase.from("programs").select("external_id").limit(1);
  if (!error) {
    return;
  }
  if (error.message.includes("external_id")) {
    throw new Error(
      "programs.external_id does not exist yet. Run supabase/migrations/20260906200000_add_programs_external_id.sql in the Supabase SQL editor, then rerun npm run import:programs.",
    );
  }
  throw new Error(`Could not read programs.external_id: ${error.message}`);
}

function requireId(map: Map<string, string>, externalId: string): string {
  const id = map.get(externalId);
  if (!id) {
    throw new Error(`Missing imported id for ${externalId}`);
  }
  return id;
}

function printSummary(summary: ReturnType<typeof catalogSummary>) {
  console.log(JSON.stringify(summary, null, 2));
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is not set. Add it to .env.local for the import script.`);
  }
  return value;
}

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown import error";
  console.error(message);
  process.exit(1);
});
