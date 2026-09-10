import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  CITY_PLANTS_SLUG,
  cityPlantsBrief,
  cityPlantsContent,
  cityPlantsEvidence,
  cityPlantsFaqs,
  cityPlantsStructuredPatch,
} from "@/data/content/city-plants-free-trees";
import { validateContentBriefForm } from "@/lib/admin/validate-content-brief";
import { validateContentForm } from "@/lib/admin/validate-content";
import {
  validateContentEvidenceForm,
  type ContentEvidenceFormValues,
} from "@/lib/admin/validate-content-evidence";
import { validateFaqForm } from "@/lib/admin/validate-faq";
import type { Database } from "@/types/database";

loadEnvLocal();

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requiredEnv("SUPABASE_SECRET_KEY");
  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("slug", CITY_PLANTS_SLUG)
    .maybeSingle();
  if (programError) {
    throw new Error(programError.message);
  }
  if (!program) {
    throw new Error(`Program ${CITY_PLANTS_SLUG} was not found.`);
  }

  const programId = program.id;
  await assertMatchingShape(supabase, programId);

  const briefParsed = validateContentBriefForm(
    {
      primary_keyword: cityPlantsBrief.primary_keyword,
      secondary_keywords: cityPlantsBrief.secondary_keywords.join("\n"),
      search_intent: cityPlantsBrief.search_intent,
      questions_to_answer: cityPlantsBrief.questions_to_answer.join("\n"),
      topics_to_cover: cityPlantsBrief.topics_to_cover.join("\n"),
      suggested_title: cityPlantsBrief.suggested_title,
      suggested_meta_description: cityPlantsBrief.suggested_meta_description,
      competitor_notes: cityPlantsBrief.competitor_notes,
      research_notes: cityPlantsBrief.research_notes,
      seo_provider: cityPlantsBrief.seo_provider,
      provider_document_id: "",
      provider_score: "",
      researched_at: cityPlantsBrief.researched_at,
    },
    { contentType: "PROGRAM", programId },
  );
  if (!briefParsed.ok) {
    throw new Error(`Brief validation failed: ${JSON.stringify(briefParsed.errors)}`);
  }

  const contentParsed = validateContentForm(cityPlantsContent);
  if (!contentParsed.ok) {
    throw new Error(`Content validation failed: ${JSON.stringify(contentParsed.errors)}`);
  }

  const faqPayloads = cityPlantsFaqs.map((faq) => {
    const parsed = validateFaqForm({
      question: faq.question,
      answer: faq.answer,
      sort_order: String(faq.sort_order),
    });
    if (!parsed.ok) {
      throw new Error(`FAQ validation failed for "${faq.question}": ${JSON.stringify(parsed.errors)}`);
    }
    return parsed.data;
  });

  const evidencePayloads = cityPlantsEvidence.map((row) => {
    const values: ContentEvidenceFormValues = {
      content_section: row.content_section,
      claim: row.claim,
      source_url: row.source_url,
      source_title: row.source_title,
      source_publisher: row.source_publisher,
      source_date: "",
      verified_at: cityPlantsStructuredPatch.last_verified_at,
      confidence: "HIGH",
      notes: row.notes ?? "",
    };
    const parsed = validateContentEvidenceForm(values, programId);
    if (!parsed.ok) {
      throw new Error(`Evidence validation failed for "${row.claim}": ${JSON.stringify(parsed.errors)}`);
    }
    return parsed.data;
  });

  const { error: programUpdateError } = await supabase
    .from("programs")
    .update({
      administrator: cityPlantsStructuredPatch.administrator,
      last_verified_at: cityPlantsStructuredPatch.last_verified_at,
      benefit_type: cityPlantsStructuredPatch.benefit_type,
      benefit_min: cityPlantsStructuredPatch.benefit_min,
      benefit_max: cityPlantsStructuredPatch.benefit_max,
      status: cityPlantsStructuredPatch.status,
      active: cityPlantsStructuredPatch.active,
    })
    .eq("id", programId);
  if (programUpdateError) {
    throw new Error(programUpdateError.message);
  }

  const { error: briefError } = await supabase.from("content_briefs").upsert(
    {
      ...briefParsed.data,
    },
    { onConflict: "program_id" },
  );
  if (briefError) {
    throw new Error(briefError.message);
  }

  const { error: contentError } = await supabase.from("program_content").upsert(
    { program_id: programId, ...contentParsed.data },
    { onConflict: "program_id" },
  );
  if (contentError) {
    throw new Error(contentError.message);
  }

  const { error: deleteFaqsError } = await supabase
    .from("program_faqs")
    .delete()
    .eq("program_id", programId);
  if (deleteFaqsError) {
    throw new Error(deleteFaqsError.message);
  }
  const { error: faqInsertError } = await supabase.from("program_faqs").insert(
    faqPayloads.map((faq) => ({ program_id: programId, ...faq })),
  );
  if (faqInsertError) {
    throw new Error(faqInsertError.message);
  }

  const { error: deleteEvidenceError } = await supabase
    .from("content_evidence")
    .delete()
    .eq("program_id", programId);
  if (deleteEvidenceError) {
    throw new Error(deleteEvidenceError.message);
  }
  const { error: evidenceInsertError } = await supabase.from("content_evidence").insert(
    evidencePayloads.map((row) => ({ program_id: programId, ...row })),
  );
  if (evidenceInsertError) {
    throw new Error(evidenceInsertError.message);
  }

  const [{ count: briefCount }, { count: evidenceCount }, { count: faqCount }] =
    await Promise.all([
      supabase
        .from("content_briefs")
        .select("id", { count: "exact", head: true })
        .eq("program_id", programId),
      supabase
        .from("content_evidence")
        .select("id", { count: "exact", head: true })
        .eq("program_id", programId),
      supabase
        .from("program_faqs")
        .select("id", { count: "exact", head: true })
        .eq("program_id", programId),
    ]);

  console.log(
    JSON.stringify(
      {
        programId,
        slug: CITY_PLANTS_SLUG,
        briefs: briefCount,
        evidence: evidenceCount,
        faqs: faqCount,
        administrator: cityPlantsStructuredPatch.administrator,
        last_verified_at: cityPlantsStructuredPatch.last_verified_at,
      },
      null,
      2,
    ),
  );
}

async function assertMatchingShape(
  supabase: ReturnType<typeof createClient<Database>>,
  programId: string,
) {
  const [{ data: rules, error: rulesError }, { data: locations, error: locError }] =
    await Promise.all([
      supabase.from("program_rules").select("field,operator,value").eq("program_id", programId),
      supabase
        .from("program_locations")
        .select("location_type,location_value")
        .eq("program_id", programId),
    ]);
  if (rulesError) throw new Error(rulesError.message);
  if (locError) throw new Error(locError.message);

  const forbiddenFields = new Set(["homeowner", "income", "household_income", "utility", "ladwp"]);
  for (const rule of rules ?? []) {
    const field = rule.field.toLowerCase();
    if ([...forbiddenFields].some((item) => field.includes(item))) {
      throw new Error(`Refusing to proceed: unexpected matching rule ${rule.field}`);
    }
  }

  const city = (locations ?? []).some(
    (row) => row.location_type === "CITY" && row.location_value === "Los Angeles",
  );
  const county = (locations ?? []).some((row) => row.location_type === "COUNTY");
  if (!city) {
    throw new Error("Expected CITY = Los Angeles location row.");
  }
  if (county) {
    throw new Error("Found a COUNTY location row; City Plants must not be county-wide.");
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is not set.`);
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
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
