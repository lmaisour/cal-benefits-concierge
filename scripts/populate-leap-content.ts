import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  LEAP_OFFICIAL,
  LEAP_SLUG,
  leapBrief,
  leapContent,
  leapEvidence,
  leapFaqs,
  leapStructuredPatch,
} from "@/data/content/ladwp-landscape-efficiency-assistance";
import { validateContentBriefForm } from "@/lib/admin/validate-content-brief";
import { validateContentForm } from "@/lib/admin/validate-content";
import {
  validateContentEvidenceForm,
  type ContentEvidenceFormValues,
} from "@/lib/admin/validate-content-evidence";
import { validateFaqForm } from "@/lib/admin/validate-faq";
import type { Database, SourceType } from "@/types/database";

loadEnvLocal();

const LEAP_SOURCES: Array<{
  source_type: SourceType;
  url: string;
  notes: string;
}> = [
  {
    source_type: "GENERAL",
    url: LEAP_OFFICIAL.main,
    notes: "Official LEAP program page: deadline, services, eligibility, and how to apply.",
  },
  {
    source_type: "ELIGIBILITY",
    url: LEAP_OFFICIAL.faq,
    notes:
      "Official FAQ: DAC definition, first-come first-served, Winter 2026 or funding exhaustion, construction timing.",
  },
  {
    source_type: "ELIGIBILITY",
    url: LEAP_OFFICIAL.terms,
    notes:
      "Terms dated March 27, 2026: LADWP water service, area range, renter pathway, SoCalWaterSmart front-yard restriction.",
  },
  {
    source_type: "APPLICATION",
    url: LEAP_OFFICIAL.paper,
    notes: "April 2026 paper application and mailing instructions.",
  },
  {
    source_type: "APPLICATION",
    url: LEAP_OFFICIAL.permission,
    notes: "Sample owner permission letter for applicants who are not the owner of record.",
  },
];

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requiredEnv("SUPABASE_SECRET_KEY");
  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("slug", LEAP_SLUG)
    .maybeSingle();
  if (programError) {
    throw new Error(programError.message);
  }
  if (!program) {
    throw new Error(`Program ${LEAP_SLUG} was not found.`);
  }

  const programId = program.id;
  await assertMatchingShape(supabase, programId);

  const briefParsed = validateContentBriefForm(
    {
      primary_keyword: leapBrief.primary_keyword,
      secondary_keywords: leapBrief.secondary_keywords.join("\n"),
      search_intent: leapBrief.search_intent,
      questions_to_answer: leapBrief.questions_to_answer.join("\n"),
      topics_to_cover: leapBrief.topics_to_cover.join("\n"),
      suggested_title: leapBrief.suggested_title,
      suggested_meta_description: leapBrief.suggested_meta_description,
      competitor_notes: leapBrief.competitor_notes,
      research_notes: leapBrief.research_notes,
      seo_provider: leapBrief.seo_provider,
      provider_document_id: "",
      provider_score: "",
      researched_at: leapBrief.researched_at,
    },
    { contentType: "PROGRAM", programId },
  );
  if (!briefParsed.ok) {
    throw new Error(`Brief validation failed: ${JSON.stringify(briefParsed.errors)}`);
  }

  const contentParsed = validateContentForm(leapContent);
  if (!contentParsed.ok) {
    throw new Error(`Content validation failed: ${JSON.stringify(contentParsed.errors)}`);
  }

  const faqPayloads = leapFaqs.map((faq) => {
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

  const evidencePayloads = leapEvidence.map((row) => {
    const values: ContentEvidenceFormValues = {
      content_section: row.content_section,
      claim: row.claim,
      source_url: row.source_url,
      source_title: row.source_title,
      source_publisher: row.source_publisher,
      source_date: row.source_date,
      verified_at: leapStructuredPatch.last_verified_at,
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
      name: leapStructuredPatch.name,
      administrator: leapStructuredPatch.administrator,
      last_verified_at: leapStructuredPatch.last_verified_at,
      benefit_type: leapStructuredPatch.benefit_type,
      benefit_min: leapStructuredPatch.benefit_min,
      benefit_max: leapStructuredPatch.benefit_max,
      benefit_summary: leapStructuredPatch.benefit_summary,
      short_description: leapStructuredPatch.short_description,
      description: leapStructuredPatch.description,
      status: leapStructuredPatch.status,
      active: leapStructuredPatch.active,
      confidence: leapStructuredPatch.confidence,
      application_deadline: leapStructuredPatch.application_deadline,
      effective_end: leapStructuredPatch.effective_end,
      consumer_headline: leapStructuredPatch.consumer_headline,
      administrator_display_name: leapStructuredPatch.administrator_display_name,
      audience_tags: leapStructuredPatch.audience_tags,
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

  const { error: deleteSourcesError } = await supabase
    .from("program_sources")
    .delete()
    .eq("program_id", programId);
  if (deleteSourcesError) {
    throw new Error(deleteSourcesError.message);
  }
  const { error: sourceInsertError } = await supabase.from("program_sources").insert(
    LEAP_SOURCES.map((source) => ({
      program_id: programId,
      source_type: source.source_type,
      organization: "LADWP",
      url: source.url,
      verified_at: leapStructuredPatch.last_verified_at,
      notes: source.notes,
    })),
  );
  if (sourceInsertError) {
    throw new Error(sourceInsertError.message);
  }

  const [{ count: briefCount }, { count: evidenceCount }, { count: faqCount }, { count: sourceCount }] =
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
      supabase
        .from("program_sources")
        .select("id", { count: "exact", head: true })
        .eq("program_id", programId),
    ]);

  console.log(
    JSON.stringify(
      {
        programId,
        slug: LEAP_SLUG,
        briefs: briefCount,
        evidence: evidenceCount,
        faqs: faqCount,
        sources: sourceCount,
        name: leapStructuredPatch.name,
        last_verified_at: leapStructuredPatch.last_verified_at,
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

  const forbiddenFields = new Set(["homeowner", "income", "household_income"]);
  for (const rule of rules ?? []) {
    const field = rule.field.toLowerCase();
    if ([...forbiddenFields].some((item) => field.includes(item))) {
      throw new Error(`Refusing to proceed: unexpected matching rule ${rule.field}`);
    }
  }

  const propertyType = (rules ?? []).some(
    (row) => row.field === "property_type" && row.operator === "equals" && row.value === "single_family",
  );
  if (!propertyType) {
    throw new Error("Expected required property_type = single_family rule.");
  }

  const city = (locations ?? []).some((row) => row.location_type === "CITY");
  const zip = (locations ?? []).some((row) => row.location_type === "ZIP");
  const state = (locations ?? []).some(
    (row) => row.location_type === "STATE" && row.location_value === "CA",
  );
  if (!state) {
    throw new Error("Expected STATE = CA location row.");
  }
  if (city || zip) {
    throw new Error("LEAP must not invent city or ZIP geography.");
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
