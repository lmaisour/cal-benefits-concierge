import Link from "next/link";
import { LocationCoverage } from "@/components/programs/location-coverage";
import { ProgramIdentity } from "@/components/programs/program-identity";
import { StatusBadge } from "@/components/programs/status-badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrackLink } from "@/components/analytics/track-link";
import { formatCategory, formatDate, formatProgramValue } from "@/lib/programs/format";
import { programPresentation } from "@/lib/programs/presentation";
import { siteConfig } from "@/lib/config/site";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import type { GeographicBucket } from "@/lib/programs/directory-location";
import { LOCATION_MATCH_LABEL } from "@/lib/programs/directory-location";
import type { DirectoryPlace } from "@/lib/programs/location-context";
import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics/events";
import type { Program, ProgramLocation } from "@/types/program";

function truncateDescription(text: string, max = 150): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
}

export function ProgramCard({
  program,
  locations = [],
  locationMatch,
  focusPlace,
  trackEvent,
  trackProps,
}: {
  program: Program;
  locations?: ProgramLocation[];
  locationMatch?: GeographicBucket;
  focusPlace?: DirectoryPlace;
  trackEvent?: AnalyticsEvent;
  trackProps?: AnalyticsProps;
}) {
  const value = formatProgramValue(program);
  const display = programPresentation(program);
  const verified = formatDate(program.last_verified_at);
  const href = `${siteConfig.urls.programs}/${program.slug}`;
  const description = program.short_description
    ? truncateDescription(program.short_description)
    : null;
  const titleLinkClass =
    "rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Card className="flex h-full flex-col gap-4 p-6 transition-shadow hover:shadow-[0_2px_6px_rgba(28,25,23,0.06),0_14px_28px_rgba(28,25,23,0.06)]">
      <ProgramIdentity
        program={program}
        headingLevel={2}
        title={
          trackEvent ? (
            <TrackLink
              href={href}
              event={trackEvent}
              eventProps={trackProps}
              className={titleLinkClass}
            >
              {display.primaryTitle}
            </TrackLink>
          ) : (
            <Link href={href} className={titleLinkClass}>
              {display.primaryTitle}
            </Link>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{formatCategory(program.category)}</Badge>
        <StatusBadge status={program.status} />
        {locationMatch === "local" && LOCATION_MATCH_LABEL.local ? (
          <Badge className="border-primary/15 bg-hero text-primary">
            {LOCATION_MATCH_LABEL.local}
          </Badge>
        ) : null}
      </div>

      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {value.kind === "savings" ? (
        <p className="text-lg font-semibold text-foreground">{value.text}</p>
      ) : null}
      {value.kind === "financing" ? (
        <div>
          <p className="text-lg font-semibold text-foreground">{value.text}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{REPAYABLE_NOTICE}</p>
        </div>
      ) : null}
      {value.kind === "none" && !display.showOfficialSubtitle && program.benefit_summary ? (
        <p className="text-base font-semibold text-foreground">{program.benefit_summary}</p>
      ) : null}

      <LocationCoverage
        statewide={program.statewide}
        locations={locations}
        compact
        focusPlace={focusPlace}
      />

      <p className="mt-auto text-xs text-muted-foreground">
        {verified ? `Last verified ${verified}` : "Verification date not recorded"}
      </p>

      {trackEvent ? (
        <TrackLink
          href={href}
          event={trackEvent}
          eventProps={trackProps}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto"
        >
          View program
        </TrackLink>
      ) : (
        <ButtonLink href={href} variant="secondary" size="sm" className="w-full sm:w-auto">
          View program
        </ButtonLink>
      )}
    </Card>
  );
}
