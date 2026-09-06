import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { benefitCatalog } from "@/data/programs/benefits";
import { energyWaterCatalog } from "@/data/programs/energy-water";
import { familyHealthCatalog } from "@/data/programs/family-health";
import { housingCatalog } from "@/data/programs/housing";
import { inactiveCatalog } from "@/data/programs/inactive";
import { utilityCatalog } from "@/data/programs/utilities";
import { utilityHardshipCatalog } from "@/data/programs/utility-hardship";
import { vehicleCatalog } from "@/data/programs/vehicles";
import type {
  CatalogRelationship,
  ProgramCatalog,
} from "@/lib/programs/import/types";

const parts = [
  vehicleCatalog,
  utilityCatalog,
  utilityHardshipCatalog,
  benefitCatalog,
  familyHealthCatalog,
  housingCatalog,
  energyWaterCatalog,
  inactiveCatalog,
];

const relationships: CatalogRelationship[] = [
  {
    program_a_external_id: "CA-VEH-MYFIRSTEV",
    program_b_external_id: "CA-VEH-DCAP",
    relationship_type: "CONDITIONALLY_STACKABLE",
    notes:
      "CARB MyFirstEV materials describe stacking with DCAP in some cases. DCAP materials say the program cannot be combined with other CARB incentives. Treat as conditional, not guaranteed additive.",
  },
  {
    program_a_external_id: "CA-VEH-MYFIRSTEV",
    program_b_external_id: "BAAQMD-VEH-CC4A",
    relationship_type: "CONDITIONALLY_STACKABLE",
    notes:
      "CARB MyFirstEV materials describe stacking with Clean Cars 4 All in some cases. Confirm with both administrators before assuming both awards apply.",
  },
  {
    program_a_external_id: "CA-VEH-MYFIRSTEV",
    program_b_external_id: "SDAPCD-VEH-CC4A",
    relationship_type: "CONDITIONALLY_STACKABLE",
    notes:
      "CARB MyFirstEV materials describe stacking with Clean Cars 4 All in some cases. Confirm with both administrators before assuming both awards apply.",
  },
  {
    program_a_external_id: "CA-VEH-BAR-RETIRE",
    program_b_external_id: "BAAQMD-VEH-CC4A",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes:
      "Do not treat BAR retirement and a Clean Cars 4 All scrap-and-replace award as additive for the same surrendered vehicle.",
  },
  {
    program_a_external_id: "CA-VEH-BAR-RETIRE",
    program_b_external_id: "SDAPCD-VEH-CC4A",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes:
      "Do not treat BAR retirement and a Clean Cars 4 All scrap-and-replace award as additive for the same surrendered vehicle.",
  },
  {
    program_a_external_id: "CA-VEH-BAR-RETIRE",
    program_b_external_id: "CA-VEH-DCAP",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes:
      "Do not treat BAR retirement and DCAP scrap-and-replace as additive for the same surrendered vehicle.",
  },
  {
    program_a_external_id: "PGE-VEH-POEV",
    program_b_external_id: "SCE-VEH-POEV",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes: "The same vehicle cannot receive more than one IOU pre-owned EV rebate.",
  },
  {
    program_a_external_id: "PGE-VEH-POEV",
    program_b_external_id: "SDGE-VEH-POEV",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes: "The same vehicle cannot receive more than one IOU pre-owned EV rebate.",
  },
  {
    program_a_external_id: "SCE-VEH-POEV",
    program_b_external_id: "SDGE-VEH-POEV",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes: "The same vehicle cannot receive more than one IOU pre-owned EV rebate.",
  },
  {
    program_a_external_id: "CA-UTIL-CARE",
    program_b_external_id: "CA-UTIL-FERA",
    relationship_type: "MUTUALLY_EXCLUSIVE",
    notes: "FERA cannot be combined with CARE on the same electric account.",
  },
  {
    program_a_external_id: "CA-TAX-CALEITC",
    program_b_external_id: "CA-TAX-YCTC",
    relationship_type: "REQUIRES_SEQUENCE",
    notes: "Young Child Tax Credit generally requires CalEITC qualification, with a published zero-income exception.",
  },
  {
    program_a_external_id: "PGE-REACH",
    program_b_external_id: "PGE-MATCH-MY-PAYMENT",
    relationship_type: "CONDITIONALLY_STACKABLE",
    notes:
      "PG&E’s official pages say some customers may receive both REACH and Match My Payment, subject to each program’s rules and remaining funds.",
  },
];

export const programCatalog: ProgramCatalog = {
  programs: parts.flatMap((part) => part.programs),
  rules: parts.flatMap((part) => part.rules),
  locations: parts.flatMap((part) => part.locations),
  sources: parts.flatMap((part) => part.sources),
  relationships,
};

export function catalogSummary(catalog: ProgramCatalog = programCatalog) {
  const byStatus = new Map<string, number>();
  const byConfidence = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byAdministrator = new Map<string, number>();
  let active = 0;
  let inactive = 0;
  let withRules = 0;
  let withLocations = 0;
  let withApplicationUrl = 0;
  let withMultipleSources = 0;

  const rulesByProgram = new Set(catalog.rules.map((row) => row.program_external_id));
  const locationsByProgram = new Set(catalog.locations.map((row) => row.program_external_id));
  const sourceCounts = new Map<string, number>();
  for (const source of catalog.sources) {
    sourceCounts.set(source.program_external_id, (sourceCounts.get(source.program_external_id) ?? 0) + 1);
  }

  for (const program of catalog.programs) {
    byStatus.set(program.status, (byStatus.get(program.status) ?? 0) + 1);
    byConfidence.set(program.confidence, (byConfidence.get(program.confidence) ?? 0) + 1);
    byCategory.set(program.category, (byCategory.get(program.category) ?? 0) + 1);
    const admin = program.administrator ?? "Unknown";
    byAdministrator.set(admin, (byAdministrator.get(admin) ?? 0) + 1);
    if (program.active) {
      active += 1;
    } else {
      inactive += 1;
    }
    if (rulesByProgram.has(program.external_id)) {
      withRules += 1;
    }
    if (locationsByProgram.has(program.external_id)) {
      withLocations += 1;
    }
    if (program.application_url) {
      withApplicationUrl += 1;
    }
    if ((sourceCounts.get(program.external_id) ?? 0) > 1) {
      withMultipleSources += 1;
    }
  }

  return {
    total: catalog.programs.length,
    active,
    inactive,
    byStatus: Object.fromEntries(byStatus),
    byConfidence: Object.fromEntries(byConfidence),
    byCategory: Object.fromEntries(byCategory),
    byAdministrator: Object.fromEntries(byAdministrator),
    withRules,
    withLocations,
    withApplicationUrl,
    withMultipleSources,
    sources: catalog.sources.length,
    relationships: catalog.relationships.length,
  };
}

export function writeCatalogJson(directory = defaultCatalogDir()): string[] {
  const files = [
    ["programs.json", programCatalog.programs],
    ["program-rules.json", programCatalog.rules],
    ["program-locations.json", programCatalog.locations],
    ["program-sources.json", programCatalog.sources],
    ["program-relationships.json", programCatalog.relationships],
  ] as const;

  const written: string[] = [];
  for (const [name, payload] of files) {
    const path = join(directory, name);
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
    written.push(path);
  }
  return written;
}

function defaultCatalogDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}
