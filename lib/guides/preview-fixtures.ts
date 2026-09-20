/**
 * Isolated Preview-only review content for the Driving Clean Assistance Program.
 *
 * This module is data-only. It must not import Supabase, publish helpers,
 * automation runtimes, or any writer. The Preview route that consumes it is
 * GET-only and 404s on Production.
 */

export const PREVIEW_GUIDE_PREFIX = "/guides/preview";

export const DCAP_PREVIEW_SLUG = "driving-clean-assistance-program";

export const DCAP_SOURCE_VERIFICATION = {
  verified_on: "2026-09-20",
  sources: [
    {
      title: "Driving Clean Assistance Program home",
      url: "https://drivingcleanca.org/",
      note: "Banner dated 8/21/2026: Financing Assistance closed to new applications; Clean Cars 4 All still open.",
    },
    {
      title: "DCAP eligibility",
      url: "https://drivingcleanca.org/about-us/dcap-eligibility/",
      note: "Participant rules, income chart, pathway amounts, scrap-and-replace geography restriction.",
    },
    {
      title: "DCAP frequently asked questions",
      url: "https://drivingcleanca.org/about-us/frequently-asked-questions/",
      note: "Document categories, 30-month ownership condition, PHEV vs BEV amounts, no exact processing time.",
    },
    {
      title: "CARB Driving Clean Assistance Program about page",
      url: "https://ww2.arb.ca.gov/our-work/programs/driving-clean-assistance-program/about",
      note: "Administrator, statewide launch, charging incentive, 8% APR loan cap. Income example conflicts with DCAP eligibility chart.",
    },
    {
      title: "Official DCAP application",
      url: "https://chdc.my.site.com/dcap/s/application?language=en_US",
    },
  ],
  conflicts: [
    "DCAP eligibility lists household-of-four income below $99,000 (300% FPL). CARB’s about page still cites $93,600 for a family of four. The rewritten article uses the DCAP eligibility chart and tells readers to confirm the current chart.",
    "DCAP eligibility says scrap vehicles must be model year 2010 or older for applications submitted during calendar year 2025. CARB’s about page says model year 2011 or older. The article does not pick a winner.",
    "DCAP’s FAQ still contains language that Financing Assistance is open and that applicants without a vehicle to scrap can receive up to $7,500. The 8/21/2026 homepage and eligibility banners say Financing Assistance is closed. The article follows the dated banner for current status.",
  ],
} as const;

export type PreviewGuideFixture = {
  slug: string;
  title: string;
  seo_title: string;
  meta_description: string;
  excerpt: string;
  body: string;
  relatedPrograms: Array<{
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    status: "ACTIVE";
    active: true;
  }>;
};

export const DCAP_PREVIEW_FIXTURE: PreviewGuideFixture = {
  slug: DCAP_PREVIEW_SLUG,
  title: "Driving Clean Assistance Program",
  seo_title: "Driving Clean Assistance Program: who may qualify and how to apply",
  meta_description:
    "DCAP can help income-qualified California residents buy or lease a clean-air vehicle. See current pathway status, grant amounts, and how to apply.",
  excerpt:
    "Helps income-qualified California residents buy or lease a new or used clean-air vehicle. Down-payment grants are paid to the dealership. This page cannot determine personal eligibility.",
  relatedPrograms: [
    {
      id: "preview-dcap-program",
      name: "Driving Clean Assistance Program",
      slug: "driving-clean-assistance-program",
      short_description:
        "Statewide clean-vehicle grants and optional financing support administered by CHDC for CARB.",
      status: "ACTIVE",
      active: true,
    },
  ],
  body: `Overview

The Driving Clean Assistance Program (DCAP) helps income-qualified California residents buy or lease a new or used battery electric, plug-in hybrid, or fuel cell vehicle. Community Housing Development Corporation (CHDC) administers DCAP for the California Air Resources Board (CARB).

Available statewide in California. Statewide listing does not mean every pathway is open in every air district, or that funding remains.

A DCAP website notice dated August 21, 2026 says the Financing Assistance pathway is closed and is not accepting new applications. The Scrap and Replace option, Clean Cars 4 All, is still open. A program listed as active in a catalog is not the same thing as open applications or available funding.

What you get

Both DCAP pathways offer down-payment assistance as upfront grants paid directly to the dealership. Those grants do not need to be repaid if the program’s 30-month ownership requirement is met.

Clean Cars 4 All (scrap and replace) is listed as open on the DCAP eligibility page:
- Up to $10,000 toward a qualifying vehicle in non-disadvantaged communities, plus a $2,000 charge card or a $7,500 mobility option.
- Up to $12,000 toward a qualifying vehicle in disadvantaged communities, plus a $2,000 charge card or a $7,500 mobility option.
- DCAP’s FAQ lists lower plug-in hybrid amounts: $9,500 outside disadvantaged communities and $11,500 in disadvantaged communities.

Financing Assistance (no vehicle to scrap) is listed as closed on the DCAP eligibility page. That pathway’s listed amounts were up to $7,500 plus a $2,000 charging incentive, with a $7,000 FAQ amount for plug-in hybrids. Closed pathways should not be treated as currently available.

Approved participants who buy a plug-in hybrid or battery electric vehicle may choose a $2,000 prepaid public-charging card or up to $2,000 toward home charging equipment. DCAP’s FAQ says charging incentives are not available for fuel cell vehicles or zero-emission motorcycles.

DCAP may also connect qualified participants with credit-union financing of up to $45,000 at an interest rate of less than 8% APR. That financing is a loan and must be repaid. It is not a grant.

Replacement vehicles have a maximum purchase price cap of $45,000, excluding taxes and fees.

Who may qualify

You may qualify if you meet the requirements below.
- Be 18 years or older.
- Be a California resident. DCAP says community members with an AB 60 license or ITIN qualify.
- Apply before purchasing or leasing a vehicle. The incentive is not retroactive.
- Have household income less than 300% of the Federal Poverty Level. DCAP’s eligibility chart lists $99,000 for a 4-person household; limits are updated annually and vary by household size.
- Not have participated in any CARB light-duty vehicle purchase incentive program, including the Clean Vehicle Rebate Project, Clean Vehicle Assistance Program, regional DCAP, or Clean Cars 4 All.
- Households may receive only one incentive for the lifetime of the program.

DCAP income limits listed on the eligibility page:
- 1-person household: less than $47,880
- 2-person household: less than $64,920
- 3-person household: less than $81,960
- 4-person household: less than $99,000
- 5-person household: less than $116,040
- 6-person household: less than $133,080
- 7-person household: less than $150,120

If you live in an air district that already operates Clean Cars 4 All, DCAP says you cannot scrap and replace through DCAP. You would use that air district’s program for scrap and replace. Confirm your air district on the official eligibility page.

How to apply

Use the official DCAP application before you buy or lease a vehicle.

Apply and receive approval before purchasing or leasing. Buying first may make you ineligible.

DCAP’s FAQ says the program cannot provide an exact processing time because of high volume. Do not rely on an estimated timeline from this page.

Always confirm the current pathway, documents, and funding with CHDC.

Documents

DCAP’s FAQ lists common income and residency documents and says a longer checklist is on the application:
- Employed: previous-year tax transcript, or two most recent pay stubs for non-filers
- Categorical eligibility: SSI, VA, or SSA award letter
- Self-employed: previous-year tax transcript with Schedule C; six months of bank statements for rideshare and food delivery only
- Residency: California driver license, recent utility bill, or recent phone or internet bill

Confirm the current checklist on the official application. This page does not invent additional documents.

Important notes

Funding and pathway status can change. Follow the dated notice on the official DCAP website, not an ACTIVE catalog label.

CARB’s about page still cites $93,600 as the family-of-four example at 300% of the Federal Poverty Level. DCAP’s eligibility chart lists $99,000. Confirm the current chart with DCAP before applying.

DCAP eligibility says scrap vehicles for 2025 applications must be model year 2010 or older. CARB’s about page says 2011 or older. Confirm the current scrap-vehicle rule on the official source.

This page is not a complete list of California programs.

Always confirm eligibility, funding, and deadlines with the official administrator.

FAQs

1. Is Financing Assistance still open?
A DCAP website notice dated August 21, 2026 says Financing Assistance is closed and is not accepting new applications. Clean Cars 4 All (scrap and replace) is still open. Confirm current status on the official site before applying.

2. How much help can I get through Clean Cars 4 All?
DCAP’s eligibility page lists up to $10,000 outside disadvantaged communities and up to $12,000 in disadvantaged communities, plus a $2,000 charge card or a $7,500 mobility option. The FAQ lists lower plug-in hybrid amounts. These are conditional maxima, not a guaranteed award.

3. Do I have to scrap a vehicle?
Clean Cars 4 All requires retiring an eligible vehicle. Financing Assistance did not require scrapping, but that pathway is listed as closed to new applications as of the August 21, 2026 notice.

4. How do I apply?
Apply on the official DCAP application
https://chdc.my.site.com/dcap/s/application?language=en_US

Official source

Apply on the official DCAP application
https://chdc.my.site.com/dcap/s/application?language=en_US

DCAP eligibility requirements
https://drivingcleanca.org/about-us/dcap-eligibility/

DCAP frequently asked questions
https://drivingcleanca.org/about-us/frequently-asked-questions/

CARB program overview
https://ww2.arb.ca.gov/our-work/programs/driving-clean-assistance-program/about

Related

Driving Clean Assistance Program details
/programs/driving-clean-assistance-program
Browse programs
/programs
Check what you may qualify for
/check`,
};

const PREVIEW_FIXTURES: Record<string, PreviewGuideFixture> = {
  [DCAP_PREVIEW_SLUG]: DCAP_PREVIEW_FIXTURE,
};

export function getPreviewGuideFixture(slug: string): PreviewGuideFixture | null {
  return PREVIEW_FIXTURES[slug] ?? null;
}

export function listPreviewGuideSlugs(): string[] {
  return Object.keys(PREVIEW_FIXTURES);
}
