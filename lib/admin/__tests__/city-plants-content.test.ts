import { describe, expect, it } from "vitest";
import {
  CITY_PLANTS_SLUG,
  cityPlantsBrief,
  cityPlantsContent,
  cityPlantsEvidence,
  cityPlantsFaqs,
  cityPlantsStructuredPatch,
} from "@/data/content/city-plants-free-trees";
import { validateContentBriefForm } from "@/lib/admin/validate-content-brief";
import { validateContentForm } from "@/lib/admin/validate-content";
import { validateContentEvidenceForm } from "@/lib/admin/validate-content-evidence";
import { validateFaqForm } from "@/lib/admin/validate-faq";

const PROGRAM_ID = "8a982a29-6872-4436-9995-8a70b34659b7";

describe("City Plants editorial payload", () => {
  it("keeps a non-dollar FREE_PRODUCT shape", () => {
    expect(CITY_PLANTS_SLUG).toBe("city-plants-free-trees");
    expect(cityPlantsStructuredPatch.benefit_type).toBe("FREE_PRODUCT");
    expect(cityPlantsStructuredPatch.benefit_min).toBeNull();
    expect(cityPlantsStructuredPatch.benefit_max).toBeNull();
    expect(cityPlantsStructuredPatch.status).toBe("ACTIVE");
    expect(cityPlantsStructuredPatch.active).toBe(true);
  });

  it("validates the program brief", () => {
    const result = validateContentBriefForm(
      {
        primary_keyword: cityPlantsBrief.primary_keyword,
        secondary_keywords: cityPlantsBrief.secondary_keywords.join("\n"),
        search_intent: cityPlantsBrief.search_intent,
        questions_to_answer: cityPlantsBrief.questions_to_answer.join("\n"),
        topics_to_cover: cityPlantsBrief.topics_to_cover.join("\n"),
        suggested_title: cityPlantsBrief.suggested_title,
        suggested_meta_description: cityPlantsBrief.suggested_meta_description,
        competitor_notes: cityPlantsBrief.competitor_notes,
        research_notes: cityPlantsBrief.research_notes,
        seo_provider: cityPlantsBrief.seo_provider,
        provider_document_id: "",
        provider_score: "",
        researched_at: cityPlantsBrief.researched_at,
      },
      { contentType: "PROGRAM", programId: PROGRAM_ID },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.seo_provider).toBe("manual");
      expect(result.data.guide_id).toBeNull();
    }
  });

  it("validates public content, FAQs, and evidence rows", () => {
    expect(validateContentForm(cityPlantsContent).ok).toBe(true);
    expect(cityPlantsFaqs).toHaveLength(11);
    for (const faq of cityPlantsFaqs) {
      expect(
        validateFaqForm({
          question: faq.question,
          answer: faq.answer,
          sort_order: String(faq.sort_order),
        }).ok,
      ).toBe(true);
    }
    expect(cityPlantsEvidence.length).toBeGreaterThanOrEqual(12);
    for (const row of cityPlantsEvidence) {
      const result = validateContentEvidenceForm(
        {
          content_section: row.content_section,
          claim: row.claim,
          source_url: row.source_url,
          source_title: row.source_title,
          source_publisher: row.source_publisher,
          source_date: "",
          verified_at: cityPlantsStructuredPatch.last_verified_at,
          confidence: "HIGH",
          notes: row.notes ?? "",
        },
        PROGRAM_ID,
      );
      expect(result.ok).toBe(true);
    }
  });
});
