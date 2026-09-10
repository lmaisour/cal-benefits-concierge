import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { TrackButtonLink } from "@/components/analytics/track-link";
import { TrackView } from "@/components/analytics/track-view";
import { LocationCoverage } from "@/components/programs/location-coverage";
import { SectionCard } from "@/components/programs/section-card";
import { StatusBadge } from "@/components/programs/status-badge";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { Badge } from "@/components/ui/badge";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import {
  editorialBenefit,
  editorialOverview,
} from "@/lib/content/editorial";
import { siteConfig } from "@/lib/config/site";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import {
  formatCategory,
  formatDate,
  formatProgramValue,
  formatRule,
  formatUsd,
  toNumber,
} from "@/lib/programs/format";
import type { ProgramDetail } from "@/lib/programs/get-program-by-slug";
import {
  CONFIDENCE_LABELS,
  RELATIONSHIP_LABELS,
  SOURCE_TYPE_LABELS,
  benefitTypeLabel,
  isRepayableBenefit,
  statusLabel,
} from "@/lib/programs/labels";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  webPageJsonLd,
} from "@/lib/seo/json-ld";

function preapprovalLabel(value: boolean | null): string {
  if (value === true) {
    return "Preapproval required";
  }
  if (value === false) {
    return "Preapproval not required";
  }
  return "Preapproval requirement is not clearly stated";
}

function purchaseNote(value: boolean | null): { tone: "warning" | "note"; text: string } {
  if (value === false) {
    return {
      tone: "warning",
      text: "Do not purchase before approval unless the program administrator confirms otherwise.",
    };
  }
  if (value === true) {
    return {
      tone: "note",
      text: "Purchase before approval appears allowed, but confirm current rules with the administrator.",
    };
  }
  return {
    tone: "note",
    text: "Purchase timing requirement is unclear. Confirm with the program administrator.",
  };
}

export function ProgramDetailView({
  detail,
  seoTitle,
  seoDescription,
}: {
  detail: ProgramDetail;
  seoTitle: string;
  seoDescription: string;
}) {
  const { program, rules, locations, sources, related, content, faqs, relatedGuides } =
    detail;
  const value = formatProgramValue(program);
  const min = toNumber(program.benefit_min);
  const max = toNumber(program.benefit_max);
  const purchase = purchaseNote(program.purchase_before_approval_allowed);
  const overview = editorialOverview(program, content);
  const benefitCopy = editorialBenefit(program, content);
  const currentlyAvailable = isCurrentlyAvailable(program);
  const groupedRules = new Map<number, typeof rules>();
  for (const rule of rules) {
    const list = groupedRules.get(rule.rule_group) ?? [];
    list.push(rule);
    groupedRules.set(rule.rule_group, list);
  }

  const programPath = `${siteConfig.urls.programs}/${program.slug}`;
  const jsonLd = [
    webPageJsonLd({
      name: seoTitle,
      description: seoDescription,
      path: programPath,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: siteConfig.urls.home },
      { name: "Programs", path: siteConfig.urls.programs },
      { name: program.name, path: programPath },
    ]),
    faqPageJsonLd(faqs),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <article className="pb-16">
      <TrackView event="program_viewed" props={{ program_slug: program.slug }} />
      <JsonLdScript data={jsonLd} />
      <div className="border-b border-border bg-hero">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  href={siteConfig.urls.programs}
                  className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Programs
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="min-w-0 truncate text-foreground" aria-current="page">
                {program.name}
              </li>
            </ol>
          </nav>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{formatCategory(program.category)}</Badge>
            <StatusBadge status={program.status} />
            {program.subcategory ? (
              <Badge>{program.subcategory.replaceAll("-", " ")}</Badge>
            ) : null}
            <Badge>{benefitTypeLabel(program.benefit_type)}</Badge>
            {program.statewide ? <Badge>Statewide</Badge> : null}
          </div>

          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {program.name}
          </h1>
          {program.administrator ? (
            <p className="mt-2 text-lg text-muted-foreground">{program.administrator}</p>
          ) : null}

          {!currentlyAvailable ? (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-medium text-amber-950">
              This program is not currently available
              {program.status !== "ACTIVE" ? ` (${statusLabel(program.status)})` : ""}.
              Confirm status with the official administrator before applying.
            </p>
          ) : null}

          {value.kind === "savings" ? (
            <p className="mt-6 font-serif text-3xl font-semibold text-foreground">{value.text}</p>
          ) : null}
          {value.kind === "financing" ? (
            <div className="mt-6 rounded-2xl border border-border bg-card px-4 py-3">
              <p className="font-serif text-2xl font-semibold text-foreground">{value.text}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{REPAYABLE_NOTICE}</p>
            </div>
          ) : null}
          {value.kind === "none" && program.benefit_summary ? (
            <p className="mt-6 font-serif text-2xl font-semibold text-foreground">
              {program.benefit_summary}
            </p>
          ) : null}

          {program.short_description ? (
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {program.short_description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {program.application_url ? (
              <TrackButtonLink
                href={program.application_url}
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
                event="official_application_clicked"
                eventProps={{ program_slug: program.slug, link_kind: "application" }}
              >
                Apply on official site
              </TrackButtonLink>
            ) : null}
            {program.official_url ? (
              <TrackButtonLink
                href={program.official_url}
                variant="secondary"
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
                event="official_application_clicked"
                eventProps={{ program_slug: program.slug, link_kind: "official" }}
              >
                Official program page
              </TrackButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        {program.has_unmodeled_required_criteria ? (
          <aside className="rounded-2xl border border-primary/15 bg-hero px-5 py-4">
            <p className="font-medium text-foreground">
              Additional program requirements need to be confirmed.
            </p>
            {program.unmodeled_required_criteria_summary ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {program.unmodeled_required_criteria_summary}
              </p>
            ) : null}
          </aside>
        ) : null}

        {overview ? (
          <SectionCard title="Overview">
            <p className="whitespace-pre-line text-muted-foreground">{overview}</p>
          </SectionCard>
        ) : null}

        <SectionCard title="What you can get">
          {benefitCopy ? <p className="text-lg text-foreground">{benefitCopy}</p> : null}
          {value.kind === "savings" ? (
            <p className="mt-3 font-semibold">{value.text} in potential benefit</p>
          ) : null}
          {value.kind === "financing" ? (
            <p className="mt-3">
              <span className="font-semibold">{value.text}.</span> {REPAYABLE_NOTICE}.
            </p>
          ) : null}
          {min !== null || max !== null ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Published range: {min !== null ? formatUsd(min) : "not stated"}
              {" to "}
              {max !== null ? formatUsd(max) : "not stated"}
              {isRepayableBenefit(program.benefit_type) ? " (financing amount)" : ""}
            </p>
          ) : null}
          {program.description && program.description !== overview ? (
            <p className="mt-4 whitespace-pre-line text-muted-foreground">{program.description}</p>
          ) : null}
        </SectionCard>

        <SectionCard title="Who may qualify">
          {rules.length === 0 ? (
            <p className="text-muted-foreground">
              {program.has_unmodeled_required_criteria
                ? "Not every requirement is listed here. Confirm the full rules with the program administrator."
                : "Eligibility rules are not listed for this record."}
            </p>
          ) : (
            <div className="space-y-4">
              {[...groupedRules.entries()].map(([group, groupRules]) => (
                <div key={group}>
                  {groupedRules.size > 1 ? (
                    <p className="text-sm font-medium text-muted-foreground">
                      {groupRules[0]?.group_operator === "OR"
                        ? "Any of these can apply"
                        : "All of these must apply"}
                    </p>
                  ) : null}
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    {groupRules.map((rule) => (
                      <li key={rule.id}>{formatRule(rule)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <h3 className="text-base font-semibold">Location / service area</h3>
            <div className="mt-2">
              <LocationCoverage statewide={program.statewide} locations={locations} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="How to apply">
          {content?.how_to_apply ? (
            <p className="whitespace-pre-line">{content.how_to_apply}</p>
          ) : (
            <p>
              Use the official application or program page. Confirm current
              instructions with the administrator before you apply.
            </p>
          )}
          <p className="mt-4">{preapprovalLabel(program.preapproval_required)}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {program.application_url ? (
              <TrackButtonLink
                href={program.application_url}
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
                event="official_application_clicked"
                eventProps={{ program_slug: program.slug, link_kind: "application" }}
              >
                Official application
              </TrackButtonLink>
            ) : null}
            {program.official_url ? (
              <TrackButtonLink
                href={program.official_url}
                variant="secondary"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
                event="official_application_clicked"
                eventProps={{ program_slug: program.slug, link_kind: "official" }}
              >
                Official program page
              </TrackButtonLink>
            ) : null}
          </div>
        </SectionCard>

        {content?.documents_needed ? (
          <SectionCard title="Documents you may need">
            <p className="whitespace-pre-line">{content.documents_needed}</p>
          </SectionCard>
        ) : null}

        <SectionCard title="Important things to know">
          {content?.important_notes ? (
            <p className="whitespace-pre-line">{content.important_notes}</p>
          ) : null}
          {purchase.tone === "warning" ? (
            <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 font-medium text-foreground">
              {purchase.text}
            </p>
          ) : (
            <p className={content?.important_notes ? "mt-4" : undefined}>{purchase.text}</p>
          )}
          {program.effective_start || program.effective_end ? (
            <p className="mt-3 text-muted-foreground">
              Effective dates: {formatDate(program.effective_start) ?? "not stated"}
              {" – "}
              {formatDate(program.effective_end) ?? "no listed end date"}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            Last verified: {formatDate(program.last_verified_at) ?? "not recorded"}
            {program.confidence
              ? ` · Confidence: ${CONFIDENCE_LABELS[program.confidence]}`
              : ""}
          </p>
        </SectionCard>

        {faqs.length > 0 ? (
          <SectionCard title="Frequently asked questions">
            <dl className="space-y-5">
              {faqs.map((faq) => (
                <div key={faq.id}>
                  <dt className="font-semibold">{faq.question}</dt>
                  <dd className="mt-2 whitespace-pre-line text-muted-foreground">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        ) : null}

        {sources.length > 0 ? (
          <SectionCard title="Official sources">
            <ul className="space-y-3">
              {sources.map((source) => (
                <li key={source.id} className="rounded-xl border border-border bg-background px-4 py-3">
                  <a
                    href={source.url}
                    className="inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span>
                      {source.organization ?? "Official source"}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type}
                      </span>
                    </span>
                    <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  {source.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{source.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {related.length > 0 ? (
          <SectionCard title="Related programs">
            <ul className="space-y-3">
              {related.map(({ program: relatedProgram, relationship }) => (
                <li key={relationship.id} className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {RELATIONSHIP_LABELS[relationship.relationship_type]}
                  </p>
                  <Link
                    href={`${siteConfig.urls.programs}/${relatedProgram.slug}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {relatedProgram.name}
                  </Link>
                  {relationship.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{relationship.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {relatedGuides.length > 0 ? (
          <SectionCard title="Related guides">
            <ul className="space-y-3">
              {relatedGuides.map((guide) => (
                <li key={guide.id} className="rounded-xl border border-border bg-background px-4 py-3">
                  <Link
                    href={`${siteConfig.urls.guides}/${guide.slug}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {guide.title}
                  </Link>
                  {guide.excerpt ? (
                    <p className="mt-1 text-sm text-muted-foreground">{guide.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        <SectionCard title="Not sure what you qualify for?">
          <p>Check your eligibility. We’ll compare your answers with published program rules.</p>
          <div className="mt-4">
            <TrackButtonLink href={siteConfig.urls.check} event="homepage_check_clicked">
              Check what you qualify for
            </TrackButtonLink>
          </div>
        </SectionCard>

        <p className="text-sm leading-relaxed text-muted-foreground">{siteConfig.disclaimer}</p>
      </div>
    </article>
  );
}
