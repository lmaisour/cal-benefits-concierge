import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramDeadlineCard } from "@/components/programs/deadline-card";
import { LEAP_SLUG } from "@/data/content/ladwp-landscape-efficiency-assistance";
import { programCatalog } from "@/data/programs/index";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import { makeProgram } from "@/lib/eligibility/__tests__/fixtures";
import { programDeadlineDisplay } from "@/lib/programs/deadline-display";
import { consumerVisiblePrograms } from "@/lib/programs/import/catalog-to-engine";

const NOW = new Date(Date.UTC(2026, 8, 11, 16, 0, 0));

const leapCatalog = programCatalog.programs.find((program) => program.slug === LEAP_SLUG);
if (!leapCatalog) {
  throw new Error("LEAP catalog program is missing.");
}

const powerSavers = programCatalog.programs.find(
  (program) => program.external_id === "LADWP-UTIL-POWER-SAVERS",
);
if (!powerSavers) {
  throw new Error("Power Savers catalog program is missing.");
}

describe("application deadline semantics", () => {
  it("stores LEAP October 31, 2026 on application_deadline only", () => {
    expect(leapCatalog.application_deadline).toBe("2026-10-31");
    expect(leapCatalog.effective_end).toBeNull();
    expect(leapCatalog.status).toBe("ACTIVE");
    expect(leapCatalog.active).toBe(true);
  });

  it("renders LEAP with application-deadline copy, not program-period copy", () => {
    const display = programDeadlineDisplay(
      {
        application_deadline: leapCatalog.application_deadline,
        effective_start: leapCatalog.effective_start,
        effective_end: leapCatalog.effective_end,
        status: leapCatalog.status,
      },
      NOW,
    );
    expect(display?.summary).toBe("Application deadline: October 31, 2026");

    const html = renderToStaticMarkup(
      createElement(ProgramDeadlineCard, {
        program: makeProgram({
          ...leapCatalog,
          application_deadline: leapCatalog.application_deadline,
          effective_end: leapCatalog.effective_end,
        }),
        now: NOW,
      }),
    );
    expect(html).toContain("Application deadline: October 31, 2026");
    expect(html).not.toContain("Current program period ends");
  });

  it("keeps existing effective_end programs on program-period semantics", () => {
    expect(powerSavers.application_deadline).toBeNull();
    expect(powerSavers.effective_end).toBe("2026-10-31");

    const display = programDeadlineDisplay(
      {
        application_deadline: powerSavers.application_deadline,
        effective_start: powerSavers.effective_start,
        effective_end: powerSavers.effective_end,
        status: powerSavers.status,
      },
      NOW,
    );
    expect(display?.kind).toBe("period");
    expect(display?.label).toBe("Current program period ends");
    expect(display?.summary).toBe("Current program period ends: October 31, 2026");
    expect(JSON.stringify(display).toLowerCase()).not.toContain("application deadline");

    const html = renderToStaticMarkup(
      createElement(ProgramDeadlineCard, {
        program: makeProgram({
          ...powerSavers,
          application_deadline: powerSavers.application_deadline,
          effective_end: powerSavers.effective_end,
        }),
        now: NOW,
      }),
    );
    expect(html).toContain("Current program period ends");
    expect(html).toContain("October 31, 2026");
    expect(html).not.toContain("Application deadline");
  });

  it("does not expire or hide ACTIVE programs when application_deadline has passed", () => {
    expect(isCurrentlyAvailable(leapCatalog)).toBe(true);

    const pastDeadlineCatalog = {
      ...programCatalog,
      programs: programCatalog.programs.map((program) =>
        program.slug === LEAP_SLUG
          ? { ...program, application_deadline: "2020-01-01" }
          : program,
      ),
    };
    const visible = consumerVisiblePrograms(pastDeadlineCatalog);
    const leap = visible.programs.find((program) => program.slug === LEAP_SLUG);
    expect(leap).toBeDefined();
    expect(leap?.application_deadline).toBe("2020-01-01");
    expect(leap?.status).toBe("ACTIVE");
    expect(isCurrentlyAvailable(leap!)).toBe(true);
  });
});
