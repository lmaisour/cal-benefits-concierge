import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/followup-queries", () => ({
  deleteFollowupQuestion: vi.fn(),
  deleteFollowupRule: vi.fn(),
  getFollowupQuestionById: vi.fn(),
  insertFollowupQuestion: vi.fn(),
  insertFollowupRule: vi.fn(),
  updateFollowupQuestion: vi.fn(),
  updateFollowupRule: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireAdminSession } from "@/lib/admin/auth";
import {
  getFollowupQuestionById,
  insertFollowupRule,
  updateFollowupRule,
} from "@/lib/admin/followup-queries";
import { addFollowupRuleAction, updateFollowupRuleAction } from "@/lib/admin/followup-actions";
import { FOLLOWUP_QUESTION_SCOPE_ERROR } from "@/lib/admin/validate-followup";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const QUESTION_ID = "33333333-3333-4333-8333-333333333333";
const RULE_ID = "44444444-4444-4444-8444-444444444444";

function ruleForm(questionId = QUESTION_ID): FormData {
  const data = new FormData();
  data.set("question_id", questionId);
  data.set("operator", "equals");
  data.set("expected_value", '"yes"');
  data.set("required", "true");
  data.set("explanation", "Must be yes.");
  return data;
}

describe("follow-up rule program scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue(undefined as never);
  });

  it("creates a rule when the question belongs to the same program", async () => {
    vi.mocked(getFollowupQuestionById).mockResolvedValue({
      id: QUESTION_ID,
      program_id: PROGRAM_ID,
    });
    vi.mocked(insertFollowupRule).mockResolvedValue({
      id: RULE_ID,
      program_id: PROGRAM_ID,
      question_id: QUESTION_ID,
      operator: "equals",
      expected_value: "yes",
      required: true,
      explanation: "Must be yes.",
      created_at: "2026-09-11T00:00:00Z",
      updated_at: "2026-09-11T00:00:00Z",
    });

    const result = await addFollowupRuleAction(PROGRAM_ID, { ok: false }, ruleForm());
    expect(result).toEqual({ ok: true });
    expect(insertFollowupRule).toHaveBeenCalledWith({
      question_id: QUESTION_ID,
      operator: "equals",
      expected_value: "yes",
      required: true,
      explanation: "Must be yes.",
      program_id: PROGRAM_ID,
    });
  });

  it("rejects create when the question belongs to another program", async () => {
    vi.mocked(getFollowupQuestionById).mockResolvedValue({
      id: QUESTION_ID,
      program_id: OTHER_PROGRAM_ID,
    });

    const result = await addFollowupRuleAction(PROGRAM_ID, { ok: false }, ruleForm());
    expect(result).toEqual({
      ok: false,
      errors: { question_id: FOLLOWUP_QUESTION_SCOPE_ERROR },
    });
    expect(insertFollowupRule).not.toHaveBeenCalled();
  });

  it("rejects update when the question belongs to another program", async () => {
    vi.mocked(getFollowupQuestionById).mockResolvedValue({
      id: QUESTION_ID,
      program_id: OTHER_PROGRAM_ID,
    });

    const result = await updateFollowupRuleAction(
      PROGRAM_ID,
      RULE_ID,
      { ok: false },
      ruleForm(),
    );
    expect(result).toEqual({
      ok: false,
      errors: { question_id: FOLLOWUP_QUESTION_SCOPE_ERROR },
    });
    expect(updateFollowupRule).not.toHaveBeenCalled();
  });

  it("updates a rule when the question belongs to the same program", async () => {
    vi.mocked(getFollowupQuestionById).mockResolvedValue({
      id: QUESTION_ID,
      program_id: PROGRAM_ID,
    });
    vi.mocked(updateFollowupRule).mockResolvedValue(undefined);

    const result = await updateFollowupRuleAction(
      PROGRAM_ID,
      RULE_ID,
      { ok: false },
      ruleForm(),
    );
    expect(result).toEqual({ ok: true });
    expect(updateFollowupRule).toHaveBeenCalled();
  });
});
