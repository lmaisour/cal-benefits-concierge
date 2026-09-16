import { afterEach, describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import {
  claimIdsBySection,
  composeDraftFromSelectedClaimIds,
  LlmDraftProviderError,
  parseClaimSelection,
} from "@/lib/content-pipeline/compose-selected-claims";
import { createContentDraftProvider } from "@/lib/content-pipeline/create-draft-provider";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import {
  buildFactualClaims,
  FakeContentDraftProvider,
  renderDraftFromClaims,
} from "@/lib/content-pipeline/generate-draft";
import {
  OpenAiClaimDraftProvider,
  type LlmFetch,
} from "@/lib/content-pipeline/llm-provider";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
];

const BAR_LIKE = {
  name: "BAR Consumer Assistance Program Vehicle Retirement",
  slug: "test-home-rebate",
  benefit_summary:
    "$1,350, $1,500, or $2,000 to retire an eligible vehicle, depending on income and Smog Check status",
  benefit_min: 1350,
  benefit_max: 2000,
  benefit_amount_structure: "TIERED" as const,
  benefit_type: "CASH" as const,
  purchase_before_approval_allowed: false,
  has_unmodeled_required_criteria: true,
  unmodeled_required_criteria_summary:
    "The vehicle must meet Smog Check and ownership rules. Higher awards also require an income test that is not fully checked here.",
  benefit_tiers: [
    {
      amount: 1350,
      label: "$1,350 retirement award",
      condition_summary:
        "No household-income test. The vehicle must have failed its most recent Smog Check for a reason other than ignition timing, a gas-cap test, or a tampered emissions control system. Aborted, manual-mode, and training-mode tests do not count.",
      evidence_path: "benefit.tiers.0",
    },
    {
      amount: 1500,
      label: "$1,500 retirement award",
      condition_summary:
        "Gross household income at or below 225% of the federal poverty level, with income documentation. The vehicle must have a completed Smog Check (pass or fail) within 180 days before applying, unless it is not subject to Smog Check. Battery-electric and hydrogen fuel-cell vehicles are not eligible.",
      evidence_path: "benefit.tiers.1",
    },
    {
      amount: 2000,
      label: "$2,000 retirement award",
      condition_summary:
        "Gross household income at or below 225% of the federal poverty level, with income documentation. The vehicle must have failed its most recent Smog Check for a reason other than ignition timing, a gas-cap test, or a tampered emissions control system. Aborted, manual-mode, and training-mode tests do not count.",
      evidence_path: "benefit.tiers.2",
    },
  ],
};

async function pair(record = makeRecord()) {
  const discovered = discoverOpportunities({ records: [record], now: NOW }).candidates[0];
  if (!discovered) {
    throw new Error("expected candidate");
  }
  const opportunity = scoreOpportunity(discovered, { now: NOW });
  const evidence = buildEvidencePackage(record, NOW);
  return { evidence, opportunity };
}

function validate(draft: ContentDraft, evidence: EvidencePackage) {
  return validateDraft({
    draft,
    evidence,
    known_routes: knownRoutes,
    own_slug: "test-home-rebate",
    own_titles: [evidence.official_name],
  });
}

function completion(payload: unknown, extras: Record<string, unknown> = {}) {
  return {
    id: "chatcmpl-test",
    model: "gpt-4o-mini",
    choices: [
      {
        finish_reason: "stop",
        message: { content: JSON.stringify(payload) },
      },
    ],
    usage: { prompt_tokens: 900, completion_tokens: 140, total_tokens: 1040 },
    ...extras,
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-test", ...headers },
  });
}

function mockProvider(fetchImpl: LlmFetch, maxRetries = 0) {
  return new OpenAiClaimDraftProvider({
    config: {
      apiKey: "sk-test-not-a-real-key",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      timeoutMs: 50,
      maxOutputTokens: 400,
      maxRetries,
    },
    fetchImpl,
  });
}

const ENV_KEYS = [
  "CONTENT_PIPELINE_DRAFT_PROVIDER",
  "CONTENT_PIPELINE_LLM_API_KEY",
  "OPENAI_API_KEY",
  "CONTENT_PIPELINE_LLM_TIMEOUT_MS",
  "CONTENT_PIPELINE_LLM_MAX_RETRIES",
  "CONTENT_PIPELINE_LLM_MAX_OUTPUT_TOKENS",
] as const;

const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = ORIGINAL_ENV[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe("claim-ID composition", () => {
  it("resolves selected IDs to canonical server-owned claims", async () => {
    const { evidence, opportunity } = await pair();
    const allowed = buildFactualClaims(evidence);
    const draft = composeDraftFromSelectedClaimIds(
      claimIdsBySection(allowed),
      allowed,
      evidence,
      opportunity,
    );
    expect(draft.source_claims).toEqual(allowed);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("rejects unknown, relocated, and duplicate claim IDs", async () => {
    const { evidence, opportunity } = await pair();
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        { ...selection, overview: [...selection.overview, "invented-amount"] },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(/unknown claim/i);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        { ...selection, what_you_get: [selection.overview[0] ?? "overview-admin"] },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(/authoritative section/i);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        { ...selection, dek: [...selection.dek, ...selection.dek] },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(/more than once/i);
  });

  it("rejects malformed structured payloads instead of repairing them", () => {
    expect(() => parseClaimSelection("not json")).toThrow(LlmDraftProviderError);
    expect(() => parseClaimSelection({ what_you_get: "Get $99,000" })).toThrow(
      /unsupported top-level/i,
    );
    expect(() =>
      parseClaimSelection({
        sections: claimIdsBySection([]),
        what_you_get: "$1,350 to $2,000",
      }),
    ).toThrow(/unsupported top-level/i);
    expect(() => parseClaimSelection({ sections: claimIdsBySection([]) })).toThrow(
      /no factual claims/i,
    );
  });
});

describe("OpenAI claim-selection provider", () => {
  it("composes a valid BAR-like TIERED draft from selected claim IDs", async () => {
    const { evidence, opportunity } = await pair(makeRecord({ program: BAR_LIKE }));
    expect(evidence.benefit.amount_structure).toBe("TIERED");
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    let capturedBody = "";
    const llm = mockProvider(async (_url, init) => {
      capturedBody = init.body;
      expect(init.headers.Authorization).toMatch(/^Bearer /);
      return jsonResponse(completion({ sections: selection }));
    });
    const draft = await llm.generateDraft({ evidence, opportunity });
    const requestBody = JSON.parse(capturedBody) as {
      temperature: number;
      max_tokens: number;
      response_format: { json_schema: { strict: boolean; name: string } };
      messages: Array<{ role: string; content: string }>;
    };
    expect(requestBody.temperature).toBe(0);
    expect(requestBody.max_tokens).toBe(400);
    expect(requestBody.response_format.json_schema.strict).toBe(true);
    expect(requestBody.response_format.json_schema.name).toBe("content_draft_claim_selection");
    expect(requestBody.messages[0]?.content).toMatch(/UNKNOWN is not PASS/);
    expect(requestBody.messages[0]?.content).toMatch(/Do not turn TIERED awards into a min–max range/);
    expect(capturedBody).not.toContain("sk-test-not-a-real-key");
    const text = `${draft.overview}\n${draft.what_you_get}\n${draft.faqs.map((faq) => faq.answer).join("\n")}`;
    expect(text).toMatch(/\$1,350/);
    expect(text).toMatch(/\$1,500/);
    expect(text).toMatch(/\$2,000/);
    expect(text).not.toMatch(/\$1,350 to \$2,000/);
    expect(text).not.toMatch(/\$1,350–\$2,000/);
    expect(draft.how_to_apply).toMatch(/Apply before you buy/);
    expect(draft.source_claims.some((claim) => claim.claim_id === "benefit-tier-0")).toBe(
      true,
    );
    expect(draft.source_claims.some((claim) => claim.claim_id === "benefit-tier-1")).toBe(
      true,
    );
    expect(draft.source_claims.some((claim) => claim.claim_id === "benefit-tier-2")).toBe(
      true,
    );
    expect(validate(draft, evidence).passed).toBe(true);
    const metadata = llm.takeMetadata();
    expect(metadata?.model).toBe("gpt-4o-mini");
    expect(metadata?.usage?.total_tokens).toBe(1040);
    expect(metadata?.request_id).toBe("req-test");
  });

  it("cannot invent a benefit amount or reuse a real path for invented text", async () => {
    const { evidence, opportunity } = await pair(makeRecord({ program: BAR_LIKE }));
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    const llm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: {
            ...selection,
            what_you_get: [...selection.what_you_get, "benefit-invented-99000"],
          },
        }),
      ),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "UNKNOWN_CLAIM_ID",
    });
    const bypass: ContentDraft = {
      ...(await new FakeContentDraftProvider().generateDraft({ evidence, opportunity })),
    };
    bypass.source_claims = [
      ...bypass.source_claims,
      {
        claim_id: "benefit-invented-99000",
        text: "Households receive $99,000.",
        evidence_path: "benefit.min",
        source_url: "https://example.invalid/official",
        section: "what_you_get",
      },
    ];
    bypass.what_you_get += " Households receive $99,000.";
    const result = validate(bypass, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(true);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_TIER_AMOUNT")).toBe(true);
  });

  it("cannot flatten TIERED awards into a continuous range", async () => {
    const { evidence, opportunity } = await pair(makeRecord({ program: BAR_LIKE }));
    const llm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: claimIdsBySection(buildFactualClaims(evidence)),
          what_you_get: "$1,350 to $2,000",
        }),
      ),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "MALFORMED_OUTPUT",
    });
    const fake = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
    fake.what_you_get += " Get $1,350 to $2,000.";
    const result = validate(fake, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "TIERED_BENEFIT_FLATTENED")).toBe(true);
  });

  it("cannot invent eligibility or a deadline", async () => {
    const { evidence, opportunity } = await pair(
      makeRecord({
        program: { ...BAR_LIKE, application_deadline: null },
      }),
    );
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    const llm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: {
            ...selection,
            who_may_qualify: [...selection.who_may_qualify, "eligibility-homeowner-only"],
          },
        }),
      ),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "UNKNOWN_CLAIM_ID",
    });
    const bypass = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
    bypass.who_may_qualify += " Homeowners automatically qualify.";
    bypass.overview += " Apply by January 1, 1999.";
    const result = validate(bypass, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM" || error.code === "UNSUPPORTED_ELIGIBILITY")).toBe(
      true,
    );
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_DEADLINE")).toBe(true);
  });

  it("cannot change source provenance", async () => {
    const { evidence, opportunity } = await pair();
    const allowed = buildFactualClaims(evidence);
    const draft = composeDraftFromSelectedClaimIds(
      claimIdsBySection(allowed),
      allowed,
      evidence,
      opportunity,
    );
    expect(draft.source_claims.every((claim, index) => claim.source_url === allowed[index]?.source_url)).toBe(
      true,
    );
    const tampered = draft.source_claims.map((claim) => ({
      ...claim,
      source_url: "https://example.invalid/other-official",
    }));
    const mutated = { ...draft, source_claims: tampered };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(true);
  });

  it("cannot turn a loan into free savings or claim exhaustive coverage", async () => {
    const { evidence, opportunity } = await pair(
      makeRecord({
        program: { benefit_type: "LOAN", benefit_min: 5000, benefit_max: 5000, benefit_amount_structure: "SINGLE" },
      }),
    );
    expect(evidence.benefit.repayable).toBe(true);
    const llm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: claimIdsBySection(buildFactualClaims(evidence)),
          overview: "This will save you free money and lists every California program.",
        }),
      ),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "MALFORMED_OUTPUT",
    });
    const bypass = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
    bypass.overview += " This will save you free money. This is every California program.";
    const result = validate(bypass, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "LOAN_FRAMED_AS_SAVINGS")).toBe(true);
    expect(result.errors.some((error) => error.code === "EXHAUSTIVE_CATALOG_CLAIM")).toBe(true);
  });

  it("cannot bypass UNKNOWN or unmodeled criteria", async () => {
    const unknownPair = await pair(
      makeRecord({
        program: {
          benefit_min: 1350,
          benefit_max: 2000,
          benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
        },
      }),
    );
    expect(unknownPair.evidence.benefit.amount_structure).toBe("UNKNOWN");
    const unknownLlm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: claimIdsBySection(buildFactualClaims(unknownPair.evidence)),
          what_you_get: "$1,350 to $2,000",
        }),
      ),
    );
    await expect(
      unknownLlm.generateDraft({
        evidence: unknownPair.evidence,
        opportunity: unknownPair.opportunity,
      }),
    ).rejects.toMatchObject({ code: "MALFORMED_OUTPUT" });

    const { evidence, opportunity } = await pair(
      makeRecord({
        program: {
          has_unmodeled_required_criteria: true,
          unmodeled_required_criteria_summary: "Income documentation is required.",
        },
      }),
    );
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    selection.who_may_qualify = selection.who_may_qualify.filter((id) => id !== "eligibility-unmodeled");
    selection.important_notes = selection.important_notes.filter((id) => id !== "notes-unmodeled");
    expect(() => composeDraftFromSelectedClaimIds(selection, allowed, evidence, opportunity)).toThrow(
      /omitted required claim/i,
    );
    const omittedClaims = allowed.filter(
      (claim) => claim.claim_id !== "eligibility-unmodeled" && claim.claim_id !== "notes-unmodeled",
    );
    const omitted = renderDraftFromClaims(omittedClaims, evidence, opportunity);
    omitted.who_may_qualify = "Income limits may apply.";
    omitted.important_notes = "Confirm details later.";
    omitted.overview = "A rebate exists.";
    const result = validate(omitted, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNMODELED_CRITERIA_OMITTED")).toBe(
      true,
    );
  });

  it("cannot omit a BAR TIERED award path by dropping its claim ID", async () => {
    const { evidence, opportunity } = await pair(makeRecord({ program: BAR_LIKE }));
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    selection.what_you_get = selection.what_you_get.filter((id) => id !== "benefit-tier-1");
    expect(() => composeDraftFromSelectedClaimIds(selection, allowed, evidence, opportunity)).toThrow(
      /omitted required claim/i,
    );
  });

  it("cannot relocate a real claim ID into another factual section", async () => {
    const { evidence, opportunity } = await pair(makeRecord({ program: BAR_LIKE }));
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    const moved = selection.overview[0] ?? "overview-admin";
    const llm = mockProvider(async () =>
      jsonResponse(
        completion({
          sections: {
            ...selection,
            overview: selection.overview.filter((id) => id !== moved),
            what_you_get: [...selection.what_you_get, moved],
          },
        }),
      ),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "CLAIM_SECTION_MISMATCH",
    });
  });

  it("rejects malformed JSON and times out", async () => {
    const { evidence, opportunity } = await pair();
    const malformed = mockProvider(async () =>
      jsonResponse({
        id: "chatcmpl-test",
        choices: [{ message: { content: "{not-json" } }],
      }),
    );
    await expect(malformed.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "MALFORMED_OUTPUT",
    });

    const hanging = mockProvider(async (_url, init) => {
      return await new Promise<Response>((_resolve, reject) => {
        const fail = () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (init?.signal?.aborted) fail();
        init?.signal?.addEventListener("abort", fail);
      });
    });
    await expect(hanging.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("retries retryable HTTP errors then fails closed without falling back to fake", async () => {
    const { evidence, opportunity } = await pair();
    let calls = 0;
    const retrying = new OpenAiClaimDraftProvider({
      config: {
        apiKey: "sk-test-not-a-real-key",
        model: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
        timeoutMs: 200,
        maxOutputTokens: 400,
        maxRetries: 1,
      },
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ error: { message: "upstream" } }, 503);
      },
    });
    await expect(retrying.generateDraft({ evidence, opportunity })).rejects.toMatchObject({
      code: "PROVIDER_HTTP",
    });
    expect(calls).toBe(2);
    expect(retrying.id).toBe("openai");
  });

  it("does not leak the API key in provider errors", async () => {
    const { evidence, opportunity } = await pair();
    const llm = mockProvider(async () =>
      jsonResponse({ error: { message: "bad key sk-test-not-a-real-key" } }, 401),
    );
    await expect(llm.generateDraft({ evidence, opportunity })).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      return !message.includes("sk-test-not-a-real-key") && message.includes("[redacted]");
    });
  });
});

describe("draft provider configuration", () => {
  it("keeps fake as the default and fails closed for invalid or unconfigured openai", () => {
    delete process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
    delete process.env.CONTENT_PIPELINE_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(createContentDraftProvider().id).toBe("fake");
    expect(createContentDraftProvider("fake").id).toBe("fake");
    expect(() => createContentDraftProvider("openai")).toThrow(/API key/i);
    expect(() => createContentDraftProvider("frase")).toThrow(/not supported/i);
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
    expect(() => createContentDraftProvider()).toThrow(/API key/i);
    process.env.CONTENT_PIPELINE_LLM_API_KEY = "sk-test-not-a-real-key";
    expect(createContentDraftProvider().id).toBe("openai");
    process.env.CONTENT_PIPELINE_LLM_TIMEOUT_MS = "0";
    expect(() => createContentDraftProvider()).toThrow(/greater than or equal to 1/i);
  });
});

describe("pipeline metadata", () => {
  it("records openai model usage on the dry-run without publishing", async () => {
    const record = makeRecord({ program: BAR_LIKE });
    const { evidence, opportunity } = await pair(record);
    const allowed = buildFactualClaims(evidence);
    const llm = mockProvider(async () =>
      jsonResponse(completion({ sections: claimIdsBySection(allowed) })),
    );
    const store = new MemoryContentPipelineStore();
    const result = await runDryRunContentPipeline({
      context: {
        records: [record],
        known_routes: knownRoutes,
        duplicates: { slugs: [record.program.slug], titles: [record.program.name] },
      },
      provider: llm,
      store,
      now: NOW,
    });
    expect(result.published).toBe(false);
    expect(result.run.status).toBe("COMPLETED");
    expect(result.validation?.passed).toBe(true);
    expect(result.run.provider_metadata?.provider).toBe("openai");
    expect(result.run.provider_metadata?.model).toBe("gpt-4o-mini");
    expect(result.run.provider_metadata?.usage?.total_tokens).toBe(1040);
    expect(JSON.stringify(result)).not.toContain("sk-test-not-a-real-key");
    void opportunity;
  });
});
