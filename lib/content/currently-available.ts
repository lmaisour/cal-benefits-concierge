import type { ProgramStatus } from "@/types/database";

export function isCurrentlyAvailable(program: {
  active: boolean;
  status: ProgramStatus;
}): boolean {
  return program.active && program.status === "ACTIVE";
}
