import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/research-queries", () => ({
  upsertContentBrief: vi.fn(),
  insertContentEvidence: vi.fn(),
  updateContentEvidence: vi.fn(),
  deleteContentEvidence: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireAdminSession } from "@/lib/admin/auth";
import {
  insertContentEvidence,
  upsertContentBrief,
  updateContentEvidence,
  deleteContentEvidence,
} from "@/lib/admin/research-queries";
import {
  addContentEvidenceAction,
  deleteContentEvidenceAction,
  updateContentEvidenceAction,
  upsertGuideContentBriefAction,
  upsertProgramContentBriefAction,
} from "@/lib/admin/research-actions";
import { emptyContentBriefFormValues } from "@/lib/admin/validate-content-brief";
import { emptyContentEvidenceFormValues } from "@/lib/admin/validate-content-evidence";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const GUIDE_ID = "22222222-2222-4222-8222-222222222222";
const EVIDENCE_ID = "33333333-3333-4333-8333-333333333333";

function briefForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries(emptyContentBriefFormValues())) {
    data.set(key, value);
  }
  return data;
}

function evidenceForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries(emptyContentEvidenceFormValues())) {
    data.set(key, value);
  }
  data.set("content_section", "Overview");
  data.set("claim", "A sourced editorial claim.");
  data.set("source_url", "https://example.ca.gov/source");
  data.set("confidence", "MEDIUM");
  return data;
}

describe("research mutation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockRejectedValue(new Error("Unauthorized"));
  });

  it("does not write a program brief without an admin session", async () => {
    await expect(
      upsertProgramContentBriefAction(PROGRAM_ID, { ok: false }, briefForm()),
    ).rejects.toThrow(/unauthorized/i);
    expect(upsertContentBrief).not.toHaveBeenCalled();
  });

  it("does not write a guide brief without an admin session", async () => {
    await expect(
      upsertGuideContentBriefAction(GUIDE_ID, { ok: false }, briefForm()),
    ).rejects.toThrow(/unauthorized/i);
    expect(upsertContentBrief).not.toHaveBeenCalled();
  });

  it("does not add evidence without an admin session", async () => {
    await expect(
      addContentEvidenceAction(PROGRAM_ID, { ok: false }, evidenceForm()),
    ).rejects.toThrow(/unauthorized/i);
    expect(insertContentEvidence).not.toHaveBeenCalled();
  });

  it("does not update evidence without an admin session", async () => {
    await expect(
      updateContentEvidenceAction(PROGRAM_ID, EVIDENCE_ID, { ok: false }, evidenceForm()),
    ).rejects.toThrow(/unauthorized/i);
    expect(updateContentEvidence).not.toHaveBeenCalled();
  });

  it("does not delete evidence without an admin session", async () => {
    await expect(deleteContentEvidenceAction(PROGRAM_ID, EVIDENCE_ID)).rejects.toThrow(
      /unauthorized/i,
    );
    expect(deleteContentEvidence).not.toHaveBeenCalled();
  });
});
