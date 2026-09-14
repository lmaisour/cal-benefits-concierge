import { describe, expect, it } from "vitest";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { scoreOpportunity, scoreOpportunities } from "@/lib/content-pipeline/score-opportunity";
import { selectOpportunity, sortScoredOpportunities } from "@/lib/content-pipeline/select-opportunity";
import { makeRecord, NOW } from "./fixtures";

function discovered(program: Parameters<typeof makeRecord>[0] = {}) {
  const result = discoverOpportunities({ records: [makeRecord(program)], now: NOW });
  if (!result.candidates[0]) {
    throw new Error("expected a candidate");
  }
  return result.candidates[0];
}

describe("scoreOpportunity", () => {
  it("is deterministic for the same record", () => {
    const candidate = discovered();
    const first = scoreOpportunity(candidate, { now: NOW });
    const second = scoreOpportunity(candidate, { now: NOW });
    expect(first.score).toBe(second.score);
    expect(first.score_breakdown).toEqual(second.score_breakdown);
    expect(first.score).toBeGreaterThan(0);
    expect(first.score).toBeLessThanOrEqual(100);
  });

  it("does not treat loan amounts as savings", () => {
    const rebate = scoreOpportunity(discovered(), { now: NOW });
    const loan = scoreOpportunity(
      discovered({
        program: {
          external_id: "TEST-LOAN-1",
          slug: "test-loan",
          name: "Test Loan",
          benefit_type: "LOAN",
          benefit_min: 50000,
          benefit_max: 250000,
          benefit_summary: "A repayable loan",
        },
      }),
      { now: NOW },
    );
    const rebateNonRepayable = rebate.score_breakdown.components.find(
      (component) => component.key === "non_repayable_value_kind",
    );
    const loanNonRepayable = loan.score_breakdown.components.find(
      (component) => component.key === "non_repayable_value_kind",
    );
    expect(rebateNonRepayable?.points).toBe(10);
    expect(loanNonRepayable?.points).toBe(0);
    expect(loan.score).toBeLessThan(rebate.score);
    expect(loan.score_breakdown.notes.join(" ")).toMatch(/not scored as consumer savings/i);
  });

  it("penalizes stale verification when scored directly", () => {
    const candidate = discovered();
    candidate.record.program.last_verified_at = "2026-08-01T00:00:00.000Z";
    const scored = scoreOpportunity(candidate, { now: NOW });
    const stale = scored.score_breakdown.components.find(
      (component) => component.key === "stale_verification",
    );
    expect(stale?.points).toBe(-15);
  });
});

describe("selectOpportunity", () => {
  it("selects the highest score and breaks ties by slug then id", () => {
    const first = scoreOpportunity(
      discovered({
        program: { external_id: "B-PROG", slug: "beta-program", name: "Beta" },
      }),
      { now: NOW },
    );
    const second = scoreOpportunity(
      discovered({
        program: {
          external_id: "A-PROG",
          slug: "alpha-program",
          name: "Alpha",
          featured: true,
        },
      }),
      { now: NOW },
    );
    const selected = selectOpportunity([first, second]);
    expect(selected?.external_id).toBe(second.score >= first.score ? second.external_id : first.external_id);

    const tiedA = { ...first, score: 40, external_id: "Z-ID", proposed_slug: "zeta" };
    const tiedB = { ...second, score: 40, external_id: "A-ID", proposed_slug: "alpha" };
    expect(selectOpportunity([tiedA, tiedB])?.proposed_slug).toBe("alpha");
    expect(sortScoredOpportunities([tiedA, tiedB]).map((item) => item.proposed_slug)).toEqual([
      "alpha",
      "zeta",
    ]);
  });

  it("returns null when there is no safe candidate", () => {
    expect(selectOpportunity([])).toBeNull();
    expect(scoreOpportunities([])).toEqual([]);
  });
});
