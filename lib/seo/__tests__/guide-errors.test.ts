import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("@/lib/guides/public-queries", () => ({
  getPublishedGuideBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    const error = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
    error.name = "NotFoundError";
    throw error;
  }),
}));

import { getPublishedGuideBySlug } from "@/lib/guides/public-queries";
import { notFound } from "next/navigation";
import GuidePage, { generateMetadata } from "@/app/guides/[slug]/page";
import GuidesError from "@/app/guides/error";

describe("guide page error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses notFound for a missing or unpublished guide", async () => {
    vi.mocked(getPublishedGuideBySlug).mockResolvedValue(null);

    await expect(
      GuidePage({ params: Promise.resolve({ slug: "unpublished-guide" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(notFound).toHaveBeenCalledTimes(1);

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "unpublished-guide" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("lets unexpected guide data failures propagate from the page and metadata", async () => {
    const backendError = new Error("Failed to load guide: connection refused");
    vi.mocked(getPublishedGuideBySlug).mockRejectedValue(backendError);

    await expect(
      GuidePage({ params: Promise.resolve({ slug: "how-to-apply" }) }),
    ).rejects.toBe(backendError);

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "how-to-apply" }) }),
    ).rejects.toBe(backendError);

    expect(notFound).not.toHaveBeenCalled();
  });

  it("does not render raw backend error messages to users", () => {
    const html = renderToStaticMarkup(createElement(GuidesError));
    expect(html).not.toContain("connection refused");
    expect(html).not.toContain("Failed to load guide");
    expect(html).not.toMatch(/\{error\.message\}/);
    expect(html).not.toContain("Guide could not be loaded");
  });
});
