import Link from "next/link";
import type { ConsumerProgramMatch } from "@/lib/eligibility/consumer-match";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import { formatCategory, formatDate } from "@/lib/programs/format";
import { benefitTypeLabel, statusLabel } from "@/lib/programs/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export function ResultCard({ match }: { match: ConsumerProgramMatch }) {
  const verified = formatDate(match.lastVerifiedAt);
  const eligibilityLabel =
    match.eligibilityStatus === "LIKELY_ELIGIBLE" ? "Likely match" : "Possible match";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            match.eligibilityStatus === "LIKELY_ELIGIBLE"
              ? "bg-hero text-primary"
              : undefined
          }
        >
          {eligibilityLabel}
        </Badge>
        <Badge>{statusLabel(match.status)}</Badge>
        <Badge>{formatCategory(match.category)}</Badge>
        <Badge>{benefitTypeLabel(match.benefitType)}</Badge>
        {match.isSample ? <Badge>Sample</Badge> : null}
      </div>

      <div>
        <h3 className="font-serif text-xl font-semibold text-foreground">
          <Link
            href={`${siteConfig.urls.programs}/${match.slug}`}
            className="hover:underline"
          >
            {match.name}
          </Link>
        </h3>
        {match.administrator ? (
          <p className="mt-1 text-sm text-muted-foreground">{match.administrator}</p>
        ) : null}
      </div>

      {match.isSample ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Sample record for testing. Application links are placeholders, not live
          government portals.
        </p>
      ) : null}

      {match.benefitSummary ? (
        <p className="text-sm text-foreground">{match.benefitSummary}</p>
      ) : null}

      {match.valueKind === "savings" ? (
        <p className="text-base font-semibold text-foreground">{match.valueText}</p>
      ) : null}
      {match.valueKind === "financing" ? (
        <div>
          <p className="text-base font-semibold text-foreground">{match.valueText}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {REPAYABLE_NOTICE}
          </p>
        </div>
      ) : null}

      {match.shortDescription ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {match.shortDescription}
        </p>
      ) : null}

      {match.whyMatched.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-foreground">Why it matched</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {match.whyMatched.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.eligibilityStatus === "POSSIBLY_ELIGIBLE" &&
      match.missingInformation.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            To confirm this match, we still need:
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {match.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link
            href={siteConfig.urls.check}
            className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Update my answers
          </Link>
        </div>
      ) : null}

      {match.importantWarning ? (
        <p className="rounded-lg border border-accent/40 bg-hero px-3 py-2 text-sm font-medium text-foreground">
          {match.importantWarning}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {verified ? `Last verified ${verified}` : "Verification date not recorded"}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <ButtonLink
          href={`${siteConfig.urls.programs}/${match.slug}`}
          variant="secondary"
          size="sm"
        >
          View details
        </ButtonLink>
        {match.applicationUrl ? (
          <ButtonLink
            href={match.applicationUrl}
            variant="secondary"
            size="sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            {match.isSample ? "Sample application link" : "Apply on official site"}
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}
