import type { Ref } from "react";
import type { UserProfile } from "@/lib/eligibility/types";
import {
  HOUSING_STATUS_LABELS,
} from "@/lib/questionnaire/profile";
import { INTEREST_LABELS, isInterestValue } from "@/lib/questionnaire/interests";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export function CompletionScreen({
  profile,
  headingRef,
  onBack,
  onStartOver,
}: {
  profile: UserProfile;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: () => void;
  onStartOver: () => void;
}) {
  const interestLabels =
    profile.interests
      ?.filter(isInterestValue)
      .map((interest) => INTEREST_LABELS[interest]) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-3xl font-semibold tracking-tight text-foreground outline-none sm:text-4xl"
        >
          Your profile is ready.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          We saved your answers for this browser session. Matching is not
          connected yet, so you will not see program results on this page.
        </p>
      </div>

      <dl className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <SummaryRow
          term="ZIP code"
          value={profile.zip ?? "Not provided"}
        />
        <SummaryRow
          term="Household size"
          value={
            profile.household_size !== undefined
              ? String(profile.household_size)
              : "Not provided"
          }
        />
        <SummaryRow
          term="Housing"
          value={
            profile.housing_status
              ? HOUSING_STATUS_LABELS[profile.housing_status]
              : "Not provided"
          }
        />
        <SummaryRow
          term="Interests"
          value={
            interestLabels.length > 0 ? interestLabels.join(", ") : "Not provided"
          }
        />
      </dl>

      <div>
        <Button
          type="button"
          size="lg"
          disabled
          aria-describedby="matching-not-ready"
          className="w-full sm:w-auto"
        >
          See my matches
        </Button>
        <p id="matching-not-ready" className="mt-3 text-sm text-muted-foreground">
          Matching will be connected in the next development milestone.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <ButtonLink href={siteConfig.urls.programs} variant="secondary">
          Browse programs
        </ButtonLink>
      </div>

      <button
        type="button"
        onClick={onStartOver}
        className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Start over
      </button>
    </div>
  );
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{term}</dt>
      <dd className="text-lg text-foreground">{value}</dd>
    </div>
  );
}
