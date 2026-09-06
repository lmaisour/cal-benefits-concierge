import { catalogSummary, programCatalog, writeCatalogJson } from "@/data/programs/index";
import { validateCatalog } from "@/lib/programs/import/validate-catalog";

const issues = validateCatalog(programCatalog);
if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.code}: ${issue.message}`);
  }
  process.exit(1);
}

const files = writeCatalogJson();
const summary = catalogSummary();
console.log(`Wrote ${files.length} catalog JSON files.`);
console.log(
  `Programs: ${summary.total} (active ${summary.active}, inactive ${summary.inactive})`,
);
console.log(`Sources: ${summary.sources}; relationships: ${summary.relationships}`);
