import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocationCoverage } from "@/components/programs/location-coverage";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";
import {
  formatCategory,
  formatDate,
  formatProgramValue,
  formatRule,
  formatUsd,
  toNumber,
} from "@/lib/programs/format";
import { getProgramBySlug } from "@/lib/programs/get-program-by-slug";
import {
  CONFIDENCE_LABELS,
  RELATIONSHIP_LABELS,
  SOURCE_TYPE_LABELS,
  benefitTypeLabel,
  isRepayableBenefit,
  statusLabel,
} from "@/lib/programs/labels";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await getProgramBySlug(slug);
    if (!detail) {
      return { title: "Program not found" };
    }
    const description =
      detail.program.short_description ??
      detail.program.benefit_summary ??
      siteConfig.description;
    return {
      title: `${detail.program.name}: Eligibility & Benefits`,
      description,
      alternates: {
        canonical: `${siteConfig.urls.programs}/${detail.program.slug}`,
      },
    };
  } catch {
    return { title: "Program details" };
  }
}

function preapprovalLabel(value: boolean | null): string {
  if (value === true) {
    return "Preapproval required";
  }
  if (value === false) {
    return "Preapproval not required";
  }
  return "Preapproval requirement unclear";
}

function purchaseWarning(value: boolean | null): { tone: "warning" | "note"; text: string } {
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

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let detail;
  try {
    detail = await getProgramBySlug(slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this program.";
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6" role="alert">
          <h1 className="font-serif text-2xl font-semibold">Program could not be loaded</h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
        </div>
      </section>
    );
  }

  if (!detail) {
    notFound();
  }

  const { program, rules, locations, sources, related } = detail;
  const value = formatProgramValue(program);
  const min = toNumber(program.benefit_min);
  const max = toNumber(program.benefit_max);
  const purchase = purchaseWarning(program.purchase_before_approval_allowed);
  const groupedRules = new Map<number, typeof rules>();
  for (const rule of rules) {
    const list = groupedRules.get(rule.rule_group) ?? [];
    list.push(rule);
    groupedRules.set(rule.rule_group, list);
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm">
        <Link
          href={siteConfig.urls.programs}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to all programs
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge>{statusLabel(program.status)}</Badge>
        <Badge>{formatCategory(program.category)}</Badge>
        {program.subcategory ? <Badge>{program.subcategory.replaceAll("-", " ")}</Badge> : null}
        <Badge>{benefitTypeLabel(program.benefit_type)}</Badge>
        {program.statewide ? <Badge>Statewide</Badge> : null}
      </div>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {program.name}
      </h1>
      {program.administrator ? (
        <p className="mt-2 text-lg text-muted-foreground">{program.administrator}</p>
      ) : null}

      {program.benefit_summary ? (
        <p className="mt-6 text-xl text-foreground">{program.benefit_summary}</p>
      ) : null}

      {value.kind === "savings" ? (
        <p className="mt-3 text-lg font-semibold">{value.text} in potential benefit</p>
      ) : null}
      {value.kind === "financing" ? (
        <p className="mt-3 rounded-xl border border-border bg-muted px-4 py-3 text-foreground">
          <strong>{value.text}.</strong> This is a repayable loan or financing
          product. It should not be counted as free savings.
        </p>
      ) : null}

      {min !== null || max !== null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Benefit range: {min !== null ? formatUsd(min) : "not stated"}
          {" to "}
          {max !== null ? formatUsd(max) : "not stated"}
          {isRepayableBenefit(program.benefit_type) ? " (financing amount)" : ""}
        </p>
      ) : null}

      {program.description ? (
        <div className="mt-8">
          <h2 className="font-serif text-2xl font-semibold">About this program</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground">
            {program.description}
          </p>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold">Who may qualify</h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Eligibility rules are not listed for this sample record.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
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
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold">Where it applies</h2>
        <div className="mt-3">
          <LocationCoverage statewide={program.statewide} locations={locations} />
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Requirements</h2>
        <p>{preapprovalLabel(program.preapproval_required)}</p>
        <p
          className={
            purchase.tone === "warning"
              ? "rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 font-medium text-foreground"
              : "text-foreground"
          }
        >
          {purchase.tone === "warning" ? <strong>Important: </strong> : null}
          {purchase.text}
        </p>
        {(program.effective_start || program.effective_end) && (
          <p className="text-muted-foreground">
            Effective dates: {formatDate(program.effective_start) ?? "not stated"}
            {" – "}
            {formatDate(program.effective_end) ?? "no listed end date"}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Last verified: {formatDate(program.last_verified_at) ?? "not recorded"}
          {program.confidence
            ? ` · Confidence: ${CONFIDENCE_LABELS[program.confidence]}`
            : " · Confidence: not rated"}
        </p>
      </section>

      {sources.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl font-semibold">Official sources</h2>
          <ul className="mt-3 space-y-2">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type}
                  {source.organization ? ` · ${source.organization}` : ""}
                </a>
                {source.notes ? (
                  <p className="text-sm text-muted-foreground">{source.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {program.official_url ? (
          <ButtonLink
            href={program.official_url}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official website
          </ButtonLink>
        ) : null}
        {program.application_url ? (
          <ButtonLink
            href={program.application_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on official site
          </ButtonLink>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-semibold">Related programs</h2>
          <ul className="mt-3 space-y-3">
            {related.map(({ program: relatedProgram, relationship }) => (
              <li key={relationship.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  {RELATIONSHIP_LABELS[relationship.relationship_type]}
                </p>
                <Link
                  href={`${siteConfig.urls.programs}/${relatedProgram.slug}`}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {relatedProgram.name}
                </Link>
                {relationship.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{relationship.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
        {siteConfig.disclaimer}
      </p>
    </article>
  );
}
