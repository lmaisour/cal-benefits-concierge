import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/programs/get-active-programs", () => ({
  getActivePrograms: vi.fn(),
}));

vi.mock("@/lib/guides/public-queries", () => ({
  listPublishedGuideSlugs: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/programs/get-program-by-slug", () => ({
  getProgramBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    const error = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
    error.name = "NotFoundError";
    throw error;
  }),
}));

import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { listPublishedGuideSlugs } from "@/lib/guides/public-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getProgramBySlug } from "@/lib/programs/get-program-by-slug";
import { notFound } from "next/navigation";
import { CANONICAL_ORIGIN } from "@/lib/seo/site-url";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { metadata as checkMetadata } from "@/app/check/page";
import { metadata as resultsMetadata } from "@/app/results/page";
import ProgramDetailPage, {
  generateMetadata,
} from "@/app/programs/[slug]/page";

const PROGRAM_UPDATED_AT = "2026-09-10T16:30:00.000Z";
const GUIDE_UPDATED_AT = "2026-08-15T09:00:00.000Z";

function hubUrls() {
  return new Set([
    `${CANONICAL_ORIGIN}/`,
    `${CANONICAL_ORIGIN}/programs`,
    `${CANONICAL_ORIGIN}/guides`,
  ]);
}

describe("technical SEO hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getActivePrograms).mockResolvedValue([
      {
        slug: "city-plants-free-trees",
        updated_at: PROGRAM_UPDATED_AT,
      } as Awaited<ReturnType<typeof getActivePrograms>>[number],
    ]);
    vi.mocked(listPublishedGuideSlugs).mockResolvedValue([
      { slug: "how-to-apply-for-rebates", updated_at: GUIDE_UPDATED_AT },
    ]);
  });

  it("omits lastModified on static hub sitemap entries instead of using request time", async () => {
    const before = Date.now();
    const entries = await sitemap();
    const after = Date.now();
    const hubs = entries.filter((entry) => hubUrls().has(entry.url));

    expect(hubs.map((entry) => entry.url).sort()).toEqual([...hubUrls()].sort());
    for (const hub of hubs) {
      expect(hub.lastModified).toBeUndefined();
      if (hub.lastModified instanceof Date) {
        const ts = hub.lastModified.getTime();
        expect(ts < before || ts > after).toBe(true);
      }
    }
  });

  it("keeps real updated_at timestamps on program and guide sitemap entries", async () => {
    const entries = await sitemap();
    const program = entries.find(
      (entry) => entry.url === `${CANONICAL_ORIGIN}/programs/city-plants-free-trees`,
    );
    const guide = entries.find(
      (entry) => entry.url === `${CANONICAL_ORIGIN}/guides/how-to-apply-for-rebates`,
    );

    expect(program?.lastModified).toEqual(new Date(PROGRAM_UPDATED_AT));
    expect(guide?.lastModified).toEqual(new Date(GUIDE_UPDATED_AT));
  });

  it("omits lastModified when a program or guide has no usable updated_at", async () => {
    vi.mocked(getActivePrograms).mockResolvedValue([
      {
        slug: "missing-timestamp",
        updated_at: "",
      } as Awaited<ReturnType<typeof getActivePrograms>>[number],
    ]);
    vi.mocked(listPublishedGuideSlugs).mockResolvedValue([
      { slug: "guide-without-timestamp", updated_at: null as unknown as string },
    ]);

    const entries = await sitemap();
    expect(
      entries.find(
        (entry) => entry.url === `${CANONICAL_ORIGIN}/programs/missing-timestamp`,
      )?.lastModified,
    ).toBeUndefined();
    expect(
      entries.find(
        (entry) =>
          entry.url === `${CANONICAL_ORIGIN}/guides/guide-without-timestamp`,
      )?.lastModified,
    ).toBeUndefined();
  });

  it("does not drop a program from the sitemap because application_deadline passed", async () => {
    vi.mocked(getActivePrograms).mockResolvedValue([
      {
        slug: "ladwp-landscape-efficiency-assistance",
        updated_at: PROGRAM_UPDATED_AT,
        application_deadline: "2020-01-01",
        effective_end: null,
        status: "ACTIVE",
        active: true,
      } as Awaited<ReturnType<typeof getActivePrograms>>[number],
    ]);

    const entries = await sitemap();
    expect(
      entries.some(
        (entry) =>
          entry.url ===
          `${CANONICAL_ORIGIN}/programs/ladwp-landscape-efficiency-assistance`,
      ),
    ).toBe(true);
  });

  it("keeps /check out of the sitemap", async () => {
    const entries = await sitemap();
    expect(entries.some((entry) => entry.url.includes("/check"))).toBe(false);
  });

  it("marks /check as noindex,follow", () => {
    expect(checkMetadata.robots).toEqual({ index: false, follow: true });
  });

  it("keeps /results noindex", () => {
    expect(resultsMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("disallows /api/ in robots.txt while preserving admin and results exclusions", () => {
    const manifest = robots();
    const rules = Array.isArray(manifest.rules) ? manifest.rules[0] : manifest.rules;
    expect(rules.disallow).toEqual([
      "/admin",
      "/admin/",
      "/results",
      "/results/",
      "/api/",
    ]);
  });

  it("uses notFound for a genuinely missing program", async () => {
    vi.mocked(getProgramBySlug).mockResolvedValue(null);

    await expect(
      ProgramDetailPage({ params: Promise.resolve({ slug: "does-not-exist" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(notFound).toHaveBeenCalledTimes(1);

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "does-not-exist" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("lets unexpected program-detail data failures propagate instead of rendering a 200 error page", async () => {
    const backendError = new Error("Failed to load program: connection refused");
    vi.mocked(getProgramBySlug).mockRejectedValue(backendError);

    await expect(
      ProgramDetailPage({ params: Promise.resolve({ slug: "city-plants-free-trees" }) }),
    ).rejects.toBe(backendError);

    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: "city-plants-free-trees" }),
      }),
    ).rejects.toBe(backendError);

    expect(notFound).not.toHaveBeenCalled();
  });
});
