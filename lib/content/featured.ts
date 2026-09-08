import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import type { ProgramStatus } from "@/types/database";

export type FeaturedPlacement<T> = {
  sort_order: number;
  program: T | null;
};

/**
 * Homepage cards must come from admin placements, then from live program
 * rows. Unavailable featured programs are omitted rather than shown as open.
 */
export function selectHomepageFeatured<
  T extends { active: boolean; status: ProgramStatus; name: string },
>(placements: FeaturedPlacement<T>[]): T[] {
  return placements
    .filter((placement): placement is { sort_order: number; program: T } => {
      return placement.program !== null && isCurrentlyAvailable(placement.program);
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.program.name.localeCompare(b.program.name);
    })
    .map((placement) => placement.program);
}
