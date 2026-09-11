import { describe, expect, it } from "vitest";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import { makeProgram } from "@/lib/eligibility/__tests__/fixtures";
import { programValueHeroDisplay } from "@/lib/programs/value-hero";

describe("programValueHeroDisplay", () => {
  it("shows an up-to headline when only a maximum is published", () => {
    const display = programValueHeroDisplay(
      makeProgram({
        benefit_type: "REBATE",
        benefit_min: null,
        benefit_max: 7500,
        benefit_summary: "A long published explanation that is not a concise phrase.",
      }),
    );
    expect(display?.headline).toBe("Up to $7,500");
    expect(display?.kicker).toBe("Potential rebate");
    expect(display?.financingNotice).toBeNull();
  });

  it("shows a numeric range when min and max differ", () => {
    const display = programValueHeroDisplay(
      makeProgram({
        benefit_type: "REBATE",
        benefit_min: 1500,
        benefit_max: 3500,
      }),
    );
    expect(display?.headline).toBe("$1,500–$3,500");
    expect(display?.kicker).toBe("Potential rebate");
  });

  it("uses a concise structured summary for non-dollar free benefits", () => {
    const display = programValueHeroDisplay(
      makeProgram({
        benefit_type: "FREE_PRODUCT",
        benefit_min: null,
        benefit_max: null,
        benefit_summary: "20 free rides / month",
        benefit_period: "month",
      }),
    );
    expect(display?.headline).toBe("20 free rides / month");
    expect(display?.kicker).toBe("Free product");
    expect(display?.periodLabel).toBe("Per month");
    expect(display?.headline).not.toMatch(/\$/);
  });

  it("does not manufacture a quantity from long free-product prose", () => {
    const display = programValueHeroDisplay(
      makeProgram({
        benefit_type: "FREE_PRODUCT",
        benefit_min: null,
        benefit_max: null,
        benefit_summary: "Up to seven free shade trees delivered for yard planting",
      }),
    );
    expect(display).toBeNull();
  });

  it("omits the hero when there is no numeric value and no safe summary", () => {
    expect(
      programValueHeroDisplay(
        makeProgram({
          benefit_type: "REBATE",
          benefit_min: null,
          benefit_max: null,
          benefit_summary: "A long rebate explanation that includes clauses, so it is not concise.",
        }),
      ),
    ).toBeNull();
  });

  it("never presents loan or financing amounts as savings", () => {
    const loan = programValueHeroDisplay(
      makeProgram({
        benefit_type: "LOAN",
        benefit_min: 5000,
        benefit_max: 15000,
        benefit_summary: "Home energy loan",
      }),
    );
    expect(loan?.headline).toBe("$5,000–$15,000");
    expect(loan?.kicker).toBe("Potential loan amount");
    expect(loan?.financingNotice).toBe(REPAYABLE_NOTICE);
    expect(loan?.kicker.toLowerCase()).not.toContain("saving");
    expect(loan?.headline.toLowerCase()).not.toContain("saving");

    const financing = programValueHeroDisplay(
      makeProgram({
        benefit_type: "FINANCING",
        benefit_min: null,
        benefit_max: 8000,
      }),
    );
    expect(financing?.headline).toBe("Up to $8,000");
    expect(financing?.kicker).toBe("Potential financing");
    expect(financing?.financingNotice).toBe(REPAYABLE_NOTICE);
    expect(`${financing?.kicker} ${financing?.headline}`.toLowerCase()).not.toMatch(
      /potential (rebate|cash benefit|bill savings)/,
    );
  });

  it("does not treat free-product numeric fields as dollar savings", () => {
    const display = programValueHeroDisplay(
      makeProgram({
        benefit_type: "FREE_PRODUCT",
        benefit_min: 1,
        benefit_max: 7,
        benefit_summary: null,
      }),
    );
    expect(display).toBeNull();
  });
});
