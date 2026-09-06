import type { BenefitType, ProgramStatus } from "@/types/database";
import type { Program } from "@/types/program";
import { toNumber } from "@/lib/programs/format";

export type ProgramSort = "value" | "verified" | "alpha";

export type ProgramDirectoryFilters = {
  query?: string;
  category?: string;
  benefitType?: BenefitType | "";
  status?: ProgramStatus | "";
  sort?: ProgramSort;
};

export function filterAndSortPrograms(
  programs: Program[],
  filters: ProgramDirectoryFilters,
): Program[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim() ?? "";
  const benefitType = filters.benefitType ?? "";
  const status = filters.status ?? "";
  const sort = filters.sort ?? "verified";

  const filtered = programs.filter((program) => {
    if (category && program.category !== category) {
      return false;
    }
    if (benefitType && program.benefit_type !== benefitType) {
      return false;
    }
    if (status && program.status !== status) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      program.name,
      program.administrator ?? "",
      program.short_description ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const sorted = [...filtered];
  if (sort === "alpha") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "value") {
    sorted.sort((a, b) => {
      const aMax = toNumber(a.benefit_max) ?? -1;
      const bMax = toNumber(b.benefit_max) ?? -1;
      return bMax - aMax;
    });
  } else {
    sorted.sort((a, b) => {
      const aTime = a.last_verified_at ? Date.parse(a.last_verified_at) : 0;
      const bTime = b.last_verified_at ? Date.parse(b.last_verified_at) : 0;
      return bTime - aTime;
    });
  }

  return sorted;
}
