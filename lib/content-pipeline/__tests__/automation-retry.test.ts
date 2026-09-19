import { describe, expect, it } from "vitest";
import {
  classifyRetryability,
  isTransientInfrastructureError,
  withTransientRetries,
} from "@/lib/content-pipeline/automation-retry";
import { AutomationError } from "@/lib/content-pipeline/automation-types";

function errorWithCode(code: string, message = code) {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

describe("classifyRetryability", () => {
  it("retries PGRST303-like clock-skew infrastructure errors", () => {
    expect(classifyRetryability(errorWithCode("PGRST303", "JWT issued at future"))).toBe(
      "transient",
    );
    expect(isTransientInfrastructureError(new Error("JWT issued at future"))).toBe(true);
    expect(classifyRetryability(errorWithCode("40001"))).toBe("transient");
    expect(classifyRetryability(errorWithCode("ECONNRESET"))).toBe("transient");
  });

  it("never retries validation, auth, or slug-conflict failures", () => {
    expect(classifyRetryability(new AutomationError("validation_failed", "bad draft"))).toBe(
      "permanent",
    );
    expect(classifyRetryability(errorWithCode("blocking_validation_error"))).toBe("permanent");
    expect(classifyRetryability(errorWithCode("malformed_content"))).toBe("permanent");
    expect(classifyRetryability(errorWithCode("guide_slug_conflict"))).toBe("permanent");
    expect(classifyRetryability(errorWithCode("content_automation_unauthorized"))).toBe(
      "permanent",
    );
    expect(classifyRetryability(new AutomationError("automation_disabled", "off"))).toBe(
      "permanent",
    );
    expect(classifyRetryability(new AutomationError("stale_authoritative_state", "stale"))).toBe(
      "permanent",
    );
  });
});

describe("withTransientRetries", () => {
  it("succeeds after a transient infrastructure failure", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const result = await withTransientRetries(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw errorWithCode("PGRST303", "JWT issued at future");
        }
        return "ok";
      },
      { sleep: async (ms) => void sleeps.push(ms), random: () => 0 },
    );
    expect(result).toEqual({ value: "ok", attempts: 2 });
    expect(sleeps).toEqual([50]);
  });

  it("stops after the maximum number of transient attempts", async () => {
    let attempts = 0;
    await expect(
      withTransientRetries(
        async () => {
          attempts += 1;
          throw errorWithCode("PGRST303", "JWT issued at future");
        },
        { sleep: async () => undefined, random: () => 0 },
      ),
    ).rejects.toMatchObject({ code: "PGRST303" });
    expect(attempts).toBe(3);
  });

  it("does not retry a validation error", async () => {
    let attempts = 0;
    await expect(
      withTransientRetries(async () => {
        attempts += 1;
        throw new AutomationError("validation_failed", "draft failed validation");
      }),
    ).rejects.toMatchObject({ code: "validation_failed" });
    expect(attempts).toBe(1);
  });

  it("does not retry an authorization error", async () => {
    let attempts = 0;
    await expect(
      withTransientRetries(async () => {
        attempts += 1;
        throw errorWithCode("content_automation_unauthorized");
      }),
    ).rejects.toMatchObject({ code: "content_automation_unauthorized" });
    expect(attempts).toBe(1);
  });

  it("does not retry a slug conflict", async () => {
    let attempts = 0;
    await expect(
      withTransientRetries(async () => {
        attempts += 1;
        throw errorWithCode("guide_slug_conflict");
      }),
    ).rejects.toMatchObject({ code: "guide_slug_conflict" });
    expect(attempts).toBe(1);
  });
});
