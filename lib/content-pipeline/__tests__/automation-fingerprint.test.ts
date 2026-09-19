import { describe, expect, it } from "vitest";
import {
  assertAutonomousPublicationEligible,
  fingerprintAuthoritativeState,
} from "@/lib/content-pipeline/automation-fingerprint";
import { AutomationError } from "@/lib/content-pipeline/automation-types";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import {
  AUTOMATION_NOW,
  automationStore,
  catalogContext,
  countingProvider,
} from "./automation-helpers";
import { makeRecord, makeSource } from "./fixtures";

function highEvidence(claim = "Official rebate amount is documented.") {
  return {
    content_section: "what_you_get",
    claim,
    source_url: "https://example.invalid/official",
    source_title: "Official page",
    confidence: "HIGH" as const,
    verified_at: "2026-09-10T00:00:00.000Z",
  };
}

describe("fingerprintAuthoritativeState", () => {
  it("matches when authoritative factual inputs are unchanged", () => {
    const record = makeRecord({
      evidence_rows: [highEvidence()],
      program: {
        benefit_amount_structure: "TIERED",
        benefit_tiers: [
          { amount: 1000, label: "Standard", condition_summary: "Standard path", evidence_path: "tiers.0" },
        ],
      },
    });
    expect(fingerprintAuthoritativeState(record)).toBe(fingerprintAuthoritativeState(structuredClone(record)));
  });

  it("changes when the benefit amount structure changes", () => {
    const base = makeRecord();
    const changed = makeRecord({ program: { benefit_min: 999 } });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });

  it("changes when a benefit tier changes", () => {
    const base = makeRecord({
      program: {
        benefit_amount_structure: "TIERED",
        benefit_tiers: [
          { amount: 1000, label: "Standard", condition_summary: "Standard path", evidence_path: "tiers.0" },
        ],
      },
    });
    const changed = makeRecord({
      program: {
        benefit_amount_structure: "TIERED",
        benefit_tiers: [
          { amount: 2000, label: "Standard", condition_summary: "Standard path", evidence_path: "tiers.0" },
        ],
      },
    });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });

  it("changes when an eligibility rule changes", () => {
    const base = makeRecord();
    const changed = makeRecord({
      rules: [
        {
          program_external_id: "TEST-REBATE-1",
          field: "household_income",
          operator: "less_than_or_equal",
          value: 50000,
          rule_group: 1,
          group_operator: "AND",
          required: true,
          explanation: "Lower limit",
        },
      ],
    });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });

  it("changes when program status changes", () => {
    const base = makeRecord();
    const changed = makeRecord({ program: { status: "PAUSED" } });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });

  it("changes when an official source changes", () => {
    const base = makeRecord();
    const changed = makeRecord({
      program: { official_url: "https://example.invalid/official-v2" },
      sources: [makeSource("TEST-REBATE-1", { url: "https://example.invalid/official-v2" })],
    });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });

  it("changes when relevant verified evidence changes", () => {
    const base = makeRecord({ evidence_rows: [highEvidence("Original claim")] });
    const changed = makeRecord({ evidence_rows: [highEvidence("Updated official claim")] });
    expect(fingerprintAuthoritativeState(base)).not.toBe(fingerprintAuthoritativeState(changed));
  });
});

describe("assertAutonomousPublicationEligible", () => {
  it("allows a matching current fingerprint", () => {
    const fingerprint = fingerprintAuthoritativeState(makeRecord());
    expect(() => assertAutonomousPublicationEligible(fingerprint, fingerprint)).not.toThrow();
  });

  it("fails closed when a historical run has no fingerprint", () => {
    const current = fingerprintAuthoritativeState(makeRecord());
    try {
      assertAutonomousPublicationEligible(null, current);
      throw new Error("expected historical runs to be ineligible");
    } catch (error) {
      expect(error).toBeInstanceOf(AutomationError);
      expect((error as AutomationError).code).toBe("missing_authoritative_fingerprint");
    }
  });

  it("blocks a due cycle when authoritative state changes after generation", async () => {
    const store = automationStore();
    const counted = countingProvider();
    let loads = 0;
    const result = await runContentAutomation({
      store,
      loadContext: async () => {
        loads += 1;
        if (loads === 1) {
          return catalogContext([makeRecord()]);
        }
        return catalogContext([makeRecord({ program: { benefit_min: 1 } })]);
      },
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(counted.calls()).toBe(1);
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("stale_authoritative_state");
    expect(result.publish_attempted).toBe(false);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("fails closed as STALE_AUTHORITATIVE_STATE on mismatch", () => {
    const generated = fingerprintAuthoritativeState(makeRecord());
    const current = fingerprintAuthoritativeState(makeRecord({ program: { benefit_max: 9999 } }));
    try {
      assertAutonomousPublicationEligible(generated, current);
      throw new Error("expected stale state to fail closed");
    } catch (error) {
      expect(error).toBeInstanceOf(AutomationError);
      expect((error as AutomationError).code).toBe("stale_authoritative_state");
    }
  });
});
