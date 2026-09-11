import "server-only";

import { followupRowsFromCatalogSeeds } from "@/lib/programs/catalog-followup";
import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Program,
  ProgramFollowupQuestion,
  ProgramFollowupRule,
  ProgramLocation,
  ProgramRule,
} from "@/types/program";

export type MatchableProgramData = {
  programs: Program[];
  rules: ProgramRule[];
  locations: ProgramLocation[];
  followupQuestions: ProgramFollowupQuestion[];
  followupRules: ProgramFollowupRule[];
};

/**
 * Active, non-expired programs plus their rules, locations, and optional
 * follow-up questions/rules. Uses the publishable-key server client (RLS).
 * Throws on data errors. Missing follow-up tables fall back to catalog seeds
 * so matching still works before the migration is applied. Database rows win
 * once the tables exist.
 */
export async function getMatchableProgramData(): Promise<MatchableProgramData> {
  const programs = await getActivePrograms();

  if (programs.length === 0) {
    return {
      programs: [],
      rules: [],
      locations: [],
      followupQuestions: [],
      followupRules: [],
    };
  }

  const supabase = createSupabaseServerClient();
  const programIds = programs.map((program) => program.id);

  const [rulesResult, locationsResult, questionsResult, followupRulesResult] =
    await Promise.all([
      supabase.from("program_rules").select("*").in("program_id", programIds),
      supabase.from("program_locations").select("*").in("program_id", programIds),
      supabase
        .from("program_followup_questions")
        .select("*")
        .in("program_id", programIds)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("program_followup_rules").select("*").in("program_id", programIds),
    ]);

  if (rulesResult.error) {
    throw new Error(
      `Failed to load program rules for matching: ${rulesResult.error.message}`,
    );
  }
  if (locationsResult.error) {
    throw new Error(
      `Failed to load program locations for matching: ${locationsResult.error.message}`,
    );
  }

  const questionsMissing = Boolean(
    questionsResult.error && isMissingRelationError(questionsResult.error),
  );
  const rulesMissing = Boolean(
    followupRulesResult.error && isMissingRelationError(followupRulesResult.error),
  );
  if (questionsResult.error && !questionsMissing) {
    throw new Error(
      `Failed to load follow-up questions for matching: ${questionsResult.error.message}`,
    );
  }
  if (followupRulesResult.error && !rulesMissing) {
    throw new Error(
      `Failed to load follow-up rules for matching: ${followupRulesResult.error.message}`,
    );
  }

  let followupQuestions: ProgramFollowupQuestion[] = questionsMissing
    ? []
    : questionsResult.data ?? [];
  let followupRules: ProgramFollowupRule[] = rulesMissing
    ? []
    : followupRulesResult.data ?? [];

  if (questionsMissing || rulesMissing) {
    const catalog = followupRowsFromCatalogSeeds(programs);
    followupQuestions = catalog.questions;
    followupRules = catalog.rules;
  }

  return {
    programs,
    rules: rulesResult.data,
    locations: locationsResult.data,
    followupQuestions,
    followupRules,
  };
}
