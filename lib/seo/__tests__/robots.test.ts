import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots", () => {
  it("keeps preview review guides out of ordinary indexing", () => {
    const manifest = robots();
    const rules = Array.isArray(manifest.rules) ? manifest.rules[0] : manifest.rules;
    expect(rules.disallow).toEqual(
      expect.arrayContaining(["/guides/preview", "/guides/preview/"]),
    );
  });
});
