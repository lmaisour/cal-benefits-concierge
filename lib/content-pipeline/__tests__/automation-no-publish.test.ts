import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import { isAutoPublishEnabled } from "@/lib/content-pipeline/config";
import {
  AUTOMATION_NOW,
  BAR_PROGRAM_ID,
  automationStore,
  barRecord,
  catalogContext,
  countingProvider,
  otherRecord,
} from "./automation-helpers";

const ROOT = path.resolve(__dirname, "../../..");

function source(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

describe("automation never publishes", () => {
  it("does not import or call publishGuide from the orchestrator", () => {
    const files = [
      "lib/content-pipeline/run-automation.ts",
      "lib/content-pipeline/automation-request.ts",
      "app/api/internal/content/automation/route.ts",
    ];
    for (const file of files) {
      const contents = source(file);
      expect(contents).not.toMatch(/publishGuide\s*\(/);
      expect(contents).not.toMatch(/markSuccessfulPublication/);
      expect(contents).not.toMatch(/CONTENT_PIPELINE_PUBLISH_ENABLED=true/);
    }
    expect(isAutoPublishEnabled()).toBe(false);
  });

  it("cannot change guides, guide_programs, or opportunity.guide_id", async () => {
    const publishGuide = vi.fn();
    const store = automationStore();
    store.publishedProgramIds.add(BAR_PROGRAM_ID);
    await store.pipeline.upsertOpportunity({
      id: "8203c4ad-1fdc-4950-87d6-4608b8b81910",
      opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      program_id: BAR_PROGRAM_ID,
      guide_id: "426de613-e070-4a05-8eb5-b274f76d350e",
      proposed_slug: "bar-vehicle-retirement",
      proposed_title: "BAR Consumer Assistance Program Vehicle Retirement",
      primary_keyword: "BAR vehicle retirement",
      secondary_keywords: [],
      score: 99,
      score_breakdown: { version: 1, total: 99, components: [], notes: [] },
      discovery_reason: "already published",
      status: "READY_FOR_REVIEW",
      next_eligible_at: null,
    });
    const beforeGuideIds = [...store.pipeline.opportunities.values()].map(
      (opportunity) => opportunity.guide_id,
    );
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext([barRecord(), otherRecord()]),
      provider: countingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(publishGuide).not.toHaveBeenCalled();
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
    expect(result.execution.publish_attempted).toBe(false);
    expect(result.execution.publish_succeeded).toBe(false);
    expect(result.execution.guide_id).toBeNull();
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect([...store.pipeline.opportunities.values()].map((opportunity) => opportunity.guide_id)).toEqual(
      expect.arrayContaining(beforeGuideIds),
    );
    const bar = await store.pipeline.getOpportunityByProgram(
      CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      BAR_PROGRAM_ID,
    );
    expect(bar?.guide_id).toBe("426de613-e070-4a05-8eb5-b274f76d350e");
    const generated = [...store.pipeline.opportunities.values()].filter(
      (opportunity) => opportunity.program_id !== BAR_PROGRAM_ID,
    );
    expect(generated.every((opportunity) => opportunity.guide_id === null)).toBe(true);
  });
});
