import { describe, expect, it } from "vitest";
import {
  LEAP_OFFICIAL,
  LEAP_SLUG,
  leapBrief,
  leapContent,
  leapEvidence,
  leapFaqs,
  leapStructuredPatch,
} from "@/data/content/ladwp-landscape-efficiency-assistance";
import { CATALOG_FOLLOWUP_SEEDS } from "@/data/programs/followup-seeds";
import { programCatalog } from "@/data/programs/index";
import { validateContentBriefForm } from "@/lib/admin/validate-content-brief";
import { validateContentForm } from "@/lib/admin/validate-content";
import { validateContentEvidenceForm } from "@/lib/admin/validate-content-evidence";
import { validateFaqForm } from "@/lib/admin/validate-faq";

const PROGRAM_ID = "9cb236eb-f818-47c5-865c-aaa802e4d8bf";

const REQUIRED_EVIDENCE = [
  /october 31, 2026/i,
  /waitlist/i,
  /winter 2026/i,
  /first come, first serve/i,
  /free landscape design and construction/i,
  /water service/i,
  /disadvantaged community/i,
  /single-family/i,
  /500 to 3,000/i,
  /parkway/i,
  /written permission/i,
  /terms and conditions/i,
  /socalwatersmart/i,
  /leap online form/i,
  /single session/i,
  /5 photos/i,
  /irrigation system and valves/i,
  /gutters and downspouts/i,
  /paper application/i,
  /site visit/i,
  /design template/i,
  /hoa/i,
  /operable irrigation/i,
  /5 to 7 business days/i,
];

describe("LEAP editorial payload", () => {
  it("keeps a non-dollar FREE_SERVICE shape and ACTIVE status", () => {
    expect(LEAP_SLUG).toBe("ladwp-landscape-efficiency-assistance");
    expect(leapStructuredPatch.benefit_type).toBe("FREE_SERVICE");
    expect(leapStructuredPatch.benefit_min).toBeNull();
    expect(leapStructuredPatch.benefit_max).toBeNull();
    expect(leapStructuredPatch.status).toBe("ACTIVE");
    expect(leapStructuredPatch.active).toBe(true);
    expect(leapStructuredPatch.confidence).toBe("HIGH");
    expect(leapStructuredPatch.administrator).toBe(
      "Los Angeles Department of Water and Power",
    );
    expect(leapStructuredPatch.effective_end).toBe("2026-10-31");
  });

  it("validates the program brief", () => {
    const result = validateContentBriefForm(
      {
        primary_keyword: leapBrief.primary_keyword,
        secondary_keywords: leapBrief.secondary_keywords.join("\n"),
        search_intent: leapBrief.search_intent,
        questions_to_answer: leapBrief.questions_to_answer.join("\n"),
        topics_to_cover: leapBrief.topics_to_cover.join("\n"),
        suggested_title: leapBrief.suggested_title,
        suggested_meta_description: leapBrief.suggested_meta_description,
        competitor_notes: leapBrief.competitor_notes,
        research_notes: leapBrief.research_notes,
        seo_provider: leapBrief.seo_provider,
        provider_document_id: "",
        provider_score: "",
        researched_at: leapBrief.researched_at,
      },
      { contentType: "PROGRAM", programId: PROGRAM_ID },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.primary_keyword).toBe("LADWP LEAP program");
      expect(result.data.seo_provider).toBe("manual");
    }
  });

  it("validates public content, FAQs, and evidence rows", () => {
    expect(validateContentForm(leapContent).ok).toBe(true);
    expect(leapFaqs.length).toBeGreaterThanOrEqual(10);
    expect(leapFaqs.length).toBeLessThanOrEqual(13);
    for (const faq of leapFaqs) {
      expect(
        validateFaqForm({
          question: faq.question,
          answer: faq.answer,
          sort_order: String(faq.sort_order),
        }).ok,
      ).toBe(true);
    }
    expect(leapEvidence.length).toBeGreaterThanOrEqual(REQUIRED_EVIDENCE.length);
    for (const row of leapEvidence) {
      const result = validateContentEvidenceForm(
        {
          content_section: row.content_section,
          claim: row.claim,
          source_url: row.source_url,
          source_title: row.source_title,
          source_publisher: row.source_publisher,
          source_date: row.source_date,
          verified_at: leapStructuredPatch.last_verified_at,
          confidence: "HIGH",
          notes: row.notes ?? "",
        },
        PROGRAM_ID,
      );
      expect(result.ok, row.claim).toBe(true);
      expect(row.source_url.startsWith("https://")).toBe(true);
      expect(row.source_url).toContain("ladwp.com");
      expect(row.source_publisher).toBe("LADWP");
    }
    const claims = leapEvidence.map((row) => row.claim).join("\n");
    for (const pattern of REQUIRED_EVIDENCE) {
      expect(claims).toMatch(pattern);
    }
  });

  it("does not invent dollars, income screens, or exhausted status", () => {
    const blob = [
      leapContent.overview,
      leapContent.benefit_explanation,
      leapContent.how_to_apply,
      leapContent.documents_needed,
      leapContent.important_notes,
      ...leapFaqs.map((faq) => `${faq.question} ${faq.answer}`),
    ].join("\n");
    expect(blob).not.toMatch(/\$\d/);
    expect(blob).not.toMatch(/up to \$/i);
    expect(blob).not.toMatch(/income-qualified/i);
    expect(blob).not.toMatch(/all ladwp customers qualify/i);
    expect(blob).not.toMatch(/guaranteed free landscaping/i);
    expect(blob).not.toMatch(/you qualify/i);
    expect(blob).toMatch(/may qualify/i);
    expect(blob).toMatch(/renters may participate/i);
    expect(blob).toMatch(/written (property-)?owner permission/i);
    expect(blob).toMatch(/address-based DAC eligibility still needs confirmation/i);
    expect(leapStructuredPatch.status).not.toBe("FUNDING_EXHAUSTED");
    expect(leapStructuredPatch.status).not.toBe("EXPIRED");
  });

  it("leaves the approved follow-up keys unchanged", () => {
    const seed = CATALOG_FOLLOWUP_SEEDS.find((item) => item.externalId === "LADWP-WATER-LEAP");
    expect(seed?.questions.map((item) => item.questionKey)).toEqual([
      "ladwp_water_service",
      "front_yard_grass_size",
      "property_owner_permission",
    ]);
  });

  it("does not change unrelated catalog programs", () => {
    const cityPlants = programCatalog.programs.find(
      (program) => program.slug === "city-plants-free-trees",
    );
    expect(cityPlants?.name).toBe("City Plants Free Trees");
    expect(cityPlants?.benefit_type).toBe("FREE_PRODUCT");
    const officialUrls = Object.values(LEAP_OFFICIAL);
    expect(officialUrls).toHaveLength(5);
    expect(new Set(officialUrls).size).toBe(5);
  });
});
