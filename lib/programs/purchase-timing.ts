import { PURCHASE_BEFORE_APPROVAL_WARNING } from "@/lib/eligibility/consumer-match";

export type PurchaseTimingTone = "warning" | "note";

export type PurchaseTimingDisplay = {
  tone: PurchaseTimingTone;
  heading: string;
  body: string;
  supporting: string | null;
  preapprovalLabel: string | null;
};

function preapprovalCopy(value: boolean | null): string | null {
  if (value === true) {
    return "Preapproval is required.";
  }
  if (value === false) {
    return "Preapproval is not required.";
  }
  return null;
}

export function purchaseTimingDisplay(input: {
  purchase_before_approval_allowed: boolean | null;
  preapproval_required?: boolean | null;
}): PurchaseTimingDisplay | null {
  const preapprovalLabel = preapprovalCopy(input.preapproval_required ?? null);

  if (input.purchase_before_approval_allowed === false) {
    return {
      tone: "warning",
      heading: "Apply before you buy",
      body: "Purchasing before approval may make you ineligible.",
      supporting: PURCHASE_BEFORE_APPROVAL_WARNING,
      preapprovalLabel,
    };
  }

  if (input.purchase_before_approval_allowed === true) {
    return {
      tone: "note",
      heading: "Purchase timing",
      body: "Purchase before approval appears allowed, but confirm current rules with the administrator.",
      supporting: null,
      preapprovalLabel,
    };
  }

  return null;
}
