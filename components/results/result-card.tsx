"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConsumerCriterion, ConsumerProgramMatch } from "@/lib/eligibility/consumer-match";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import { formatCategory, formatDate } from "@/lib/programs/format";
import { benefitTypeLabel, statusLabel } from "@/lib/programs/labels";
import { ProgramIdentity } from "@/components/programs/program-identity";
import { programPresentation } from "@/lib/programs/presentation";
import { OptionsQuestion } from "@/components/questionnaire/options-question";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export function ResultCard({
  match,
  onFollowupSubmit,
}: {
  match: ConsumerProgramMatch;
  onFollowupSubmit?: (programId: string, answers: Record<string, string>) => void;
}) {
  const display = programPresentation({
    name: match.name,
    administrator: match.administrator,
    consumerHeadline: match.consumerHeadline,
    administratorDisplayName: match.administratorDisplayName,
    audienceTags: match.audienceTags,
  });
  const verified = formatDate(match.lastVerifiedAt);
  const followup = match.followup;
  const showYouMayQualify =
    match.eligibilityStatus === "POSSIBLY_ELIGIBLE" && Boolean(followup?.unresolved);
  const eligibilityLabel =
    match.eligibilityStatus === "LIKELY_ELIGIBLE"
      ? "Likely match"
      : match.eligibilityStatus === "NOT_ELIGIBLE"
        ? "Does not appear to qualify"
        : showYouMayQualify
          ? "You may qualify"
          : "Possible match";

  return (
    <Card className="flex flex-col gap-4">
      <ProgramIdentity
        program={{
          name: match.name,
          administrator: match.administrator,
          consumerHeadline: match.consumerHeadline,
          administratorDisplayName: match.administratorDisplayName,
          audienceTags: match.audienceTags,
        }}
        headingLevel={3}
        title={
          <Link
            href={`${siteConfig.urls.programs}/${match.slug}`}
            className="hover:underline"
          >
            {display.primaryTitle}
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            match.eligibilityStatus === "LIKELY_ELIGIBLE"
              ? "bg-hero text-primary"
              : match.eligibilityStatus === "NOT_ELIGIBLE"
                ? "border-accent/40 bg-hero text-foreground"
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

      {match.isSample ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Sample record for testing. Application links are placeholders, not live
          government portals.
        </p>
      ) : null}

      {match.benefitSummary && !display.showOfficialSubtitle ? (
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

      {followup ? (
        <FollowupPanel
          match={match}
          onSubmit={onFollowupSubmit}
        />
      ) : (
        <>
          {match.eligibilityStatus === "POSSIBLY_ELIGIBLE" &&
          match.additionalRequirements ? (
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Additional requirements
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Additional program requirements need to be confirmed.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {match.additionalRequirements}
              </p>
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
        </>
      )}

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

function FollowupPanel({
  match,
  onSubmit,
}: {
  match: ConsumerProgramMatch;
  onSubmit?: (programId: string, answers: Record<string, string>) => void;
}) {
  const followup = match.followup;
  const questions = followup?.questions ?? [];
  const hasAnswers = questions.some((question) => question.answer);
  const [open, setOpen] = useState(
    hasAnswers || match.eligibilityStatus === "NOT_ELIGIBLE",
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const question of questions) {
      if (question.answer) {
        initial[question.key] = question.answer;
      }
    }
    return initial;
  });

  if (!followup) {
    return null;
  }

  const unanswered = followup.questions.filter((question) => {
    const value = answers[question.key] ?? question.answer;
    return !value;
  });

  return (
    <div className="space-y-4">
      {followup.criteria.length > 0 && (hasAnswers || !followup.unresolved) ? (
        <CriteriaList criteria={followup.criteria} />
      ) : null}

      {followup.unresolved && !open ? (
        <div>
          <p className="text-sm text-muted-foreground">
            A few more published requirements need answers before we can score this
            program.
          </p>
          <Button
            type="button"
            className="mt-3"
            size="sm"
            onClick={() => setOpen(true)}
          >
            {followup.ctaLabel}
          </Button>
        </div>
      ) : null}

      {open && followup.questions.length > 0 ? (
        <form
          className="space-y-6 rounded-xl border border-border bg-background p-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.(match.id, answers);
          }}
        >
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              A few more questions
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer the remaining questions on this screen. Not sure stays
              unconfirmed — it does not fail the program.
            </p>
          </div>
          {followup.questions.map((question) => (
            <div key={question.key}>
              <p className="text-sm font-medium text-foreground">{question.question}</p>
              {question.helpText ? (
                <p className="mt-1 text-sm text-muted-foreground">{question.helpText}</p>
              ) : null}
              <div className="mt-3">
                <OptionsQuestion
                  name={`${match.id}-${question.key}`}
                  legend={question.question}
                  options={question.options}
                  value={answers[question.key] as string | undefined}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [question.key]: value }))
                  }
                />
              </div>
            </div>
          ))}
          {unanswered.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Unanswered questions stay unconfirmed.
            </p>
          ) : null}
          <Button type="submit" size="sm">
            Check my eligibility
          </Button>
        </form>
      ) : null}

      {match.eligibilityStatus === "POSSIBLY_ELIGIBLE" &&
      match.additionalRequirements &&
      !followup.unresolved ? (
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Additional requirements
          </h4>
          <p className="mt-2 text-sm text-muted-foreground">
            {match.additionalRequirements}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CriteriaList({ criteria }: { criteria: ConsumerCriterion[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">Eligibility checks</h4>
      <ul className="mt-2 space-y-2">
        {criteria.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <p className="font-medium text-foreground">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.status === "passed"
                  ? "Passed"
                  : item.status === "failed"
                    ? "Failed"
                    : "Needs confirmation"}
              </span>
              {item.label}
            </p>
            {item.detail ? (
              <p className="mt-1 text-muted-foreground">{item.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
