import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CatalogLocation,
  CatalogProgram,
  CatalogRelationship,
  CatalogRule,
  CatalogSource,
  ProgramCatalog,
} from "@/lib/programs/import/types";

const catalogDir = dirname(fileURLToPath(import.meta.url));

export function loadCatalogJson(directory = catalogDir): ProgramCatalog {
  return {
    programs: JSON.parse(readFileSync(join(directory, "programs.json"), "utf8")) as CatalogProgram[],
    rules: JSON.parse(readFileSync(join(directory, "program-rules.json"), "utf8")) as CatalogRule[],
    locations: JSON.parse(readFileSync(join(directory, "program-locations.json"), "utf8")) as CatalogLocation[],
    sources: JSON.parse(readFileSync(join(directory, "program-sources.json"), "utf8")) as CatalogSource[],
    relationships: JSON.parse(
      readFileSync(join(directory, "program-relationships.json"), "utf8"),
    ) as CatalogRelationship[],
  };
}
