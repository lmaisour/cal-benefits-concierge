import type { ProgramStatus } from "@/types/database";
import type { Program } from "@/types/program";
import { programNeedsReview } from "@/lib/admin/needs-review";

export type AdminProgramListQuery = {
  q: string;
  status: string;
  category: string;
  confidence: string;
  needsReview: boolean;
};

export function parseAdminProgramListQuery(
  params: Record<string, string | string[] | undefined>,
): AdminProgramListQuery {
  return {
    q: readOne(params.q).trim(),
    status: readOne(params.status).trim(),
    category: readOne(params.category).trim(),
    confidence: readOne(params.confidence).trim(),
    needsReview: readOne(params.review) === "1",
  };
}

export function filterAdminPrograms(
  programs: Program[],
  query: AdminProgramListQuery,
  nowMs = Date.now(),
): Program[] {
  const needle = query.q.toLowerCase();
  return programs.filter((program) => {
    if (needle) {
      const name = program.name.toLowerCase();
      const administrator = (program.administrator ?? "").toLowerCase();
      if (!name.includes(needle) && !administrator.includes(needle)) {
        return false;
      }
    }
    if (query.status && program.status !== query.status) {
      return false;
    }
    if (query.category && program.category !== query.category) {
      return false;
    }
    if (query.confidence && program.confidence !== query.confidence) {
      return false;
    }
    if (query.needsReview && !programNeedsReview(program, nowMs)) {
      return false;
    }
    return true;
  });
}

export function countByStatus(
  programs: Program[],
): Record<ProgramStatus, number> {
  const counts: Record<ProgramStatus, number> = {
    ACTIVE: 0,
    WAITLIST: 0,
    PAUSED: 0,
    FUNDING_EXHAUSTED: 0,
    UPCOMING: 0,
    EXPIRED: 0,
    UNCERTAIN: 0,
  };
  for (const program of programs) {
    counts[program.status] += 1;
  }
  return counts;
}

function readOne(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
