"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsumerProgramMatch, MatchResponse } from "@/lib/eligibility/consumer-match";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import {
  getQuestionnaireServerSnapshot,
  getQuestionnaireSnapshot,
  parseQuestionnaireSnapshot,
  subscribeQuestionnaire,
} from "@/lib/questionnaire/storage";
import { ResultCard } from "@/components/results/result-card";
import { ResultsLoading } from "@/components/results/results-loading";
import { Button, ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: MatchResponse }
  | { status: "error" }
  | { status: "needs-questionnaire" };

const CATEGORY_FILTERS: {
  id: string;
  label: string;
  slugs: readonly string[] | null;
}[] = [
  { id: "all", label: "All", slugs: null },
  { id: "vehicles", label: "Vehicles", slugs: ["vehicles"] },
  { id: "home", label: "Home", slugs: ["home-energy"] },
  { id: "utilities", label: "Utilities", slugs: ["utilities"] },
  { id: "housing", label: "Housing", slugs: ["housing"] },
  { id: "water", label: "Water", slugs: ["water"] },
  { id: "family", label: "Family", slugs: ["family"] },
  { id: "food", label: "Food", slugs: ["food"] },
  { id: "communications", label: "Phone & internet", slugs: ["communications"] },
  { id: "tax", label: "Tax", slugs: ["taxes"] },
];

export function ResultsPage() {
  const snapshot = useSyncExternalStore(
    subscribeQuestionnaire,
    getQuestionnaireSnapshot,
    getQuestionnaireServerSnapshot,
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [filter, setFilter] = useState("all");

  const requestMatches = useCallback(async (profile: unknown) => {
    setLoadState({ status: "loading" });
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (response.status === 400) {
        setLoadState({ status: "needs-questionnaire" });
        return;
      }
      if (!response.ok) {
        setLoadState({ status: "error" });
        return;
      }
      const data: unknown = await response.json();
      if (!isMatchResponse(data)) {
        setLoadState({ status: "error" });
        return;
      }
      setLoadState({ status: "ready", data });
    } catch {
      setLoadState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = parseQuestionnaireSnapshot(getQuestionnaireSnapshot());
      const result = current?.profile
        ? validateUserProfile(current.profile)
        : null;
      if (!current?.completed || !result?.ok) {
        setLoadState({ status: "needs-questionnaire" });
        return;
      }
      void requestMatches(result.profile);
    });
    return () => cancelAnimationFrame(frame);
  }, [snapshot, requestMatches]);

  if (loadState.status === "loading") {
    return <ResultsLoading />;
  }

  if (loadState.status === "needs-questionnaire") {
    return <NeedsQuestionnaire />;
  }

  if (loadState.status === "error") {
    return (
      <ErrorState
        onRetry={() => {
          const current = parseQuestionnaireSnapshot(getQuestionnaireSnapshot());
          const result = current?.profile
            ? validateUserProfile(current.profile)
            : null;
          if (result?.ok) {
            void requestMatches(result.profile);
          }
        }}
      />
    );
  }

  return (
    <ResultsContent
      data={loadState.data}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}

function isMatchResponse(value: unknown): value is MatchResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as MatchResponse;
  return (
    Array.isArray(record.likelyEligible) && Array.isArray(record.possiblyEligible)
  );
}

function NeedsQuestionnaire() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
        Complete the questionnaire first.
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        We need your household answers before we can compare programs. We will
        not guess from a blank profile.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.urls.check} size="lg">
          Check my benefits
        </ButtonLink>
      </div>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
        We couldn’t check your matches right now.
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        This is a connection problem, not a finding that no programs apply.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" onClick={onRetry}>
          Try again
        </Button>
        <ButtonLink href={siteConfig.urls.programs} variant="secondary" size="lg">
          Browse programs
        </ButtonLink>
      </div>
    </section>
  );
}

function ResultsContent({
  data,
  filter,
  onFilterChange,
}: {
  data: MatchResponse;
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const allMatches = [...data.likelyEligible, ...data.possiblyEligible];
  const availableFilters = CATEGORY_FILTERS.filter((item) => {
    if (item.slugs === null) {
      return true;
    }
    return allMatches.some((match) => item.slugs?.includes(match.category));
  });

  const visible = useMemo(() => {
    const selected = CATEGORY_FILTERS.find((item) => item.id === filter);
    if (!selected || selected.slugs === null) {
      return data;
    }
    const matchesCategory = (match: ConsumerProgramMatch) =>
      selected.slugs?.includes(match.category) ?? false;
    return {
      likelyEligible: data.likelyEligible.filter(matchesCategory),
      possiblyEligible: data.possiblyEligible.filter(matchesCategory),
      counts: data.counts,
    };
  }, [data, filter]);

  const visibleCount =
    visible.likelyEligible.length + visible.possiblyEligible.length;
  const totalCount = data.counts.likely + data.counts.possible;

  if (totalCount === 0) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          We didn’t find a match based on the information you provided.
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Our database is still expanding, so this does not necessarily mean no
          programs are available to you.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={siteConfig.urls.check} size="lg">
            Update my answers
          </ButtonLink>
          <ButtonLink href={siteConfig.urls.programs} variant="secondary" size="lg">
            Browse all programs
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        We found programs that may apply to you.
      </h1>
      <p className="mt-3 text-lg text-foreground">
        {data.counts.likely} likely {data.counts.likely === 1 ? "match" : "matches"}
        <span className="text-muted-foreground"> · </span>
        {data.counts.possible} possible{" "}
        {data.counts.possible === 1 ? "match" : "matches"}
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        Based on the information you provided and published program rules.
      </p>

      {availableFilters.length > 2 ? (
        <div
          className="mt-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by category"
        >
          {availableFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => onFilterChange(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {visibleCount === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No matches in this category. Try All or another filter.
        </p>
      ) : null}

      {visible.likelyEligible.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Likely matches
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on the information you provided, you appear to meet the
            published requirements we can evaluate.
          </p>
          <ul className="mt-5 space-y-4">
            {visible.likelyEligible.map((match) => (
              <li key={match.id}>
                <ResultCard match={match} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visible.possiblyEligible.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Possible matches
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We need more information, or some published requirements could not be
            confirmed.
          </p>
          <ul className="mt-5 space-y-4">
            {visible.possiblyEligible.map((match) => (
              <li key={match.id}>
                <ResultCard match={match} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
        {siteConfig.disclaimer}
      </p>
    </section>
  );
}
