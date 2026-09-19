import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { isContentAutomationEnabled } from "@/lib/content-pipeline/automation-config";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { automationStore, catalogContext } from "./automation-helpers";

const ORIGINAL_ENABLED = process.env.CONTENT_AUTOMATION_ENABLED;
const ORIGINAL_SECRET = process.env.CONTENT_AUTOMATION_SECRET;

function request(headers: Record<string, string> = {}, body: unknown = {}) {
  return new Request("http://localhost/api/internal/content/automation", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function runtime() {
  const store = automationStore();
  return {
    store,
    loadContext: async () => catalogContext(),
    provider: new FakeContentDraftProvider(),
  };
}

describe("content automation endpoint security", () => {
  beforeEach(() => {
    delete process.env.CONTENT_AUTOMATION_ENABLED;
    delete process.env.CONTENT_AUTOMATION_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_ENABLED === undefined) {
      delete process.env.CONTENT_AUTOMATION_ENABLED;
    } else {
      process.env.CONTENT_AUTOMATION_ENABLED = ORIGINAL_ENABLED;
    }
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CONTENT_AUTOMATION_SECRET;
    } else {
      process.env.CONTENT_AUTOMATION_SECRET = ORIGINAL_SECRET;
    }
  });

  it("defaults the automation kill switch to off", () => {
    delete process.env.CONTENT_AUTOMATION_ENABLED;
    expect(isContentAutomationEnabled()).toBe(false);
  });

  it("rejects automation when the kill switch is off", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "false";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";
    const response = await handleContentAutomationRequest(
      request({ authorization: "Bearer automation-secret" }),
      async () => runtime(),
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("content_automation_disabled");
    expect(json.publish_attempted).toBe(false);
  });

  it("rejects a missing or wrong automation secret", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";

    const missing = await handleContentAutomationRequest(request(), async () => runtime());
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toBe("content_automation_unauthorized");

    const wrong = await handleContentAutomationRequest(
      request({ authorization: "Bearer wrong-secret" }),
      async () => runtime(),
    );
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toBe("content_automation_unauthorized");
  });

  it("sanitizes unexpected errors returned to HTTP clients", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";
    const response = await handleContentAutomationRequest(
      request({ authorization: "Bearer automation-secret" }),
      async () => {
        throw new Error("SUPABASE_SECRET_KEY=super-secret-value leaked sk-secretkeyvalue");
      },
    );
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.publish_attempted).toBe(false);
    expect(json.publish_succeeded).toBe(false);
    expect(json.error).toBe("content_automation_failed");
    expect(JSON.stringify(json)).not.toContain("super-secret-value");
    expect(JSON.stringify(json)).not.toContain("SUPABASE_SECRET_KEY");
    expect(JSON.stringify(json)).not.toContain("sk-secretkeyvalue");
    expect(JSON.stringify(json)).not.toContain("automation-secret");
  });

  it("accepts a valid secret and never reports a publish", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";
    const response = await handleContentAutomationRequest(
      request({ authorization: "Bearer automation-secret" }),
      async () => runtime(),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("COMPLETED_DRY_RUN");
    expect(json.publish_attempted).toBe(false);
    expect(json.publish_succeeded).toBe(false);
    expect(json.provider).toBe("fake");
  });
});
