import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { LocationCoverage } from "@/components/programs/location-coverage";
import { SectionCard } from "@/components/programs/section-card";
import { StatusBadge } from "@/components/programs/status-badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
} from "@/lib/programs/labels";

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

export function ProgramDetailView({ detail }: { detail: ProgramDetail }) {
  const { program, rules, locations, sources, related } = detail;
  const value = formatProgramValue(program);
  const min = toNumber(program.benefit_min);
  const max = toNumber(program.benefit_max);
  const purchase = purchaseNote(program.purchase_before_approval_allowed);
  const groupedRules = new Map<number, typeof rules>();
  for (const rule of rules) {
    const list = groupedRules.get(rule.rule_group) ?? [];
    list.push(rule);
    groupedRules.set(rule.rule_group, list);
  }

  return (
    <article className="pb-16">
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
              <ButtonLink
                href={program.application_url}
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply on official site
              </ButtonLink>
            ) : null}
            {program.official_url ? (
              <ButtonLink
                href={program.official_url}
                variant="secondary"
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Official program page
              </ButtonLink>
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

        <SectionCard title="What you could receive">
          {program.benefit_summary ? (
            <p className="text-lg text-foreground">{program.benefit_summary}</p>
          ) : null}
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
          {program.description ? (
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
        </SectionCard>

        <SectionCard title="Location / service area">
          <LocationCoverage statewide={program.statewide} locations={locations} />
        </SectionCard>

        <SectionCard title="Important requirements">
          {purchase.tone === "warning" ? (
            <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 font-medium text-foreground">
              {purchase.text}
            </p>
          ) : (
            <p>{purchase.text}</p>
          )}
        </SectionCard>

        <SectionCard title="Timing / preapproval">
          <p>{preapprovalLabel(program.preapproval_required)}</p>
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

        <p className="text-sm leading-relaxed text-muted-foreground">{siteConfig.disclaimer}</p>
      </div>
    </article>
  );
}
