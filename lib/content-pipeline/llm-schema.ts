import { FACTUAL_DRAFT_SECTIONS } from "@/lib/content-pipeline/types";

const claimIdArray = {
  type: "array",
  items: { type: "string" },
} as const;

export const LLM_CLAIM_SELECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    sections: {
      type: "object",
      additionalProperties: false,
      required: [...FACTUAL_DRAFT_SECTIONS],
      properties: Object.fromEntries(
        FACTUAL_DRAFT_SECTIONS.map((section) => [section, claimIdArray]),
      ),
    },
  },
} as const;

export const LLM_CLAIM_SELECTION_SCHEMA_NAME = "content_draft_claim_selection";
