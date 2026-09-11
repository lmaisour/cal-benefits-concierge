import { describe, expect, it } from "vitest";
import { PURCHASE_BEFORE_APPROVAL_WARNING } from "@/lib/eligibility/consumer-match";
import { purchaseTimingDisplay } from "@/lib/programs/purchase-timing";

describe("purchaseTimingDisplay", () => {
  it("produces a prominent warning when purchase before approval is not allowed", () => {
    const display = purchaseTimingDisplay({
      purchase_before_approval_allowed: false,
      preapproval_required: true,
    });
    expect(display).not.toBeNull();
    if (!display) {
      return;
    }
    expect(display.tone).toBe("warning");
    expect(display.heading).toBe("Apply before you buy");
    expect(display.body).toBe("Purchasing before approval may make you ineligible.");
    expect(display.supporting).toBe(PURCHASE_BEFORE_APPROVAL_WARNING);
    expect(display.preapprovalLabel).toBe("Preapproval is required.");
  });

  it("uses cautious language when purchase before approval appears allowed", () => {
    const display = purchaseTimingDisplay({
      purchase_before_approval_allowed: true,
    });
    expect(display).not.toBeNull();
    if (!display) {
      return;
    }
    expect(display.tone).toBe("note");
    expect(display.heading).toBe("Purchase timing");
    expect(display.body).toMatch(/appears allowed/i);
    expect(display.body).toMatch(/confirm current rules/i);
    expect(display.supporting).toBeNull();
    expect(display.body.toLowerCase()).not.toContain("you are eligible");
  });

  it("does not overclaim when purchase timing is unknown", () => {
    expect(
      purchaseTimingDisplay({
        purchase_before_approval_allowed: null,
        preapproval_required: true,
      }),
    ).toBeNull();
  });
});
