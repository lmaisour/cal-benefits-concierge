import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { programCatalog } from "@/data/programs/index";
import { loadCatalogJson } from "@/data/programs/load-json";
import { isRepayableBenefit } from "@/lib/programs/labels";
import { validateCatalog } from "@/lib/programs/import/validate-catalog";
import type { ProgramCatalog } from "@/lib/programs/import/types";
import {
  LOCATION_TYPES,
  RULE_OPERATORS,
} from "@/types/database";

function assertQuality(catalog: ProgramCatalog) {
  const issues = validateCatalog(catalog);
  expect(issues).toEqual([]);

  const slugs = new Set<string>();
  const externalIds = new Set<string>();
  const sourcesByProgram = new Map<string, number>();
  for (const source of catalog.sources) {
    sourcesByProgram.set(
      source.program_external_id,
      (sourcesByProgram.get(source.program_external_id) ?? 0) + 1,
    );
    expect(source.url).toMatch(/^https?:\/\//i);
    expect(source.url).not.toContain("example.invalid");
    expect(source.url.trim().length).toBeGreaterThan(0);
  }

  for (const program of catalog.programs) {
    expect(program.name.startsWith("SAMPLE:")).toBe(false);
    expect(externalIds.has(program.external_id)).toBe(false);
    externalIds.add(program.external_id);
    expect(slugs.has(program.slug)).toBe(false);
    slugs.add(program.slug);

    if (program.benefit_min !== null && program.benefit_max !== null) {
      expect(program.benefit_min).toBeLessThanOrEqual(program.benefit_max);
    }

    if (program.benefit_type === "LOAN" || program.benefit_type === "FINANCING") {
      expect(isRepayableBenefit(program.benefit_type)).toBe(true);
    }

    if (program.active) {
      expect(program.external_id.trim().length).toBeGreaterThan(0);
      expect(program.official_url).toMatch(/^https?:\/\//i);
      expect(program.status).not.toBe("EXPIRED");
      expect(program.confidence).not.toBe("LOW");
      expect(sourcesByProgram.get(program.external_id) ?? 0).toBeGreaterThanOrEqual(1);
    }
  }

  const knownIds = new Set(catalog.programs.map((program) => program.external_id));
  for (const relationship of catalog.relationships) {
    expect(knownIds.has(relationship.program_a_external_id)).toBe(true);
    expect(knownIds.has(relationship.program_b_external_id)).toBe(true);
  }

  for (const rule of catalog.rules) {
    expect(RULE_OPERATORS.includes(rule.operator)).toBe(true);
    expect(knownIds.has(rule.program_external_id)).toBe(true);
  }

  for (const location of catalog.locations) {
    expect(LOCATION_TYPES.includes(location.location_type)).toBe(true);
    expect(knownIds.has(location.program_external_id)).toBe(true);
  }

  const activeCount = catalog.programs.filter((program) => program.active).length;
  expect(activeCount).toBeGreaterThanOrEqual(50);
}

describe("Milestone 7A catalog quality", () => {
  it("validates the TypeScript catalog", () => {
    assertQuality(programCatalog);
  });

  it("keeps committed JSON in sync when present", () => {
    const jsonPath = "data/programs/programs.json";
    if (!existsSync(jsonPath)) {
      return;
    }
    const json = loadCatalogJson();
    assertQuality(json);
    expect(json.programs.map((row) => row.external_id)).toEqual(
      programCatalog.programs.map((row) => row.external_id),
    );
    expect(json.rules).toHaveLength(programCatalog.rules.length);
    expect(json.locations).toHaveLength(programCatalog.locations.length);
    expect(json.sources).toHaveLength(programCatalog.sources.length);
    expect(json.relationships).toHaveLength(programCatalog.relationships.length);
  });
});
