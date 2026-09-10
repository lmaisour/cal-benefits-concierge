"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  upsertGuideContentBriefAction,
  upsertProgramContentBriefAction,
  type ContentBriefActionState,
} from "@/lib/admin/research-actions";
import { Button } from "@/components/ui/button";
import type { ContentBriefFormValues } from "@/lib/admin/validate-content-brief";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium";

export function ContentBriefForm({
  owner,
  ownerId,
  initialValues,
}: {
  owner: "program" | "guide";
  ownerId: string;
  initialValues: ContentBriefFormValues;
}) {
  const action =
    owner === "program"
      ? upsertProgramContentBriefAction.bind(null, ownerId)
      : upsertGuideContentBriefAction.bind(null, ownerId);
  const [state, formAction, pending] = useActionState(
    action,
    { ok: false } satisfies ContentBriefActionState,
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Content research brief</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal SEO research only. This does not appear on public pages and does
          not change eligibility matching.
        </p>
      </div>
      {state.formError ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg border border-primary/20 bg-hero px-4 py-3 text-sm">
          Saved research brief.
        </p>
      ) : null}

      <Field label="Primary keyword" error={errors.primary_keyword}>
        <input
          name="primary_keyword"
          defaultValue={values.primary_keyword}
          className={fieldClass}
        />
      </Field>
      <Field
        label="Secondary keywords"
        hint="Comma or line separated."
        error={errors.secondary_keywords}
      >
        <textarea
          name="secondary_keywords"
          rows={3}
          defaultValue={values.secondary_keywords}
          className={fieldClass}
        />
      </Field>
      <Field label="Search intent" error={errors.search_intent}>
        <textarea
          name="search_intent"
          rows={3}
          defaultValue={values.search_intent}
          className={fieldClass}
        />
      </Field>
      <Field
        label="Questions to answer"
        hint="One question per line."
        error={errors.questions_to_answer}
      >
        <textarea
          name="questions_to_answer"
          rows={5}
          defaultValue={values.questions_to_answer}
          className={fieldClass}
        />
      </Field>
      <Field
        label="Topics to cover"
        hint="One topic per line."
        error={errors.topics_to_cover}
      >
        <textarea
          name="topics_to_cover"
          rows={5}
          defaultValue={values.topics_to_cover}
          className={fieldClass}
        />
      </Field>
      <Field label="Suggested SEO title" error={errors.suggested_title}>
        <input
          name="suggested_title"
          defaultValue={values.suggested_title}
          className={fieldClass}
        />
      </Field>
      <Field label="Suggested meta description" error={errors.suggested_meta_description}>
        <textarea
          name="suggested_meta_description"
          rows={3}
          defaultValue={values.suggested_meta_description}
          className={fieldClass}
        />
      </Field>
      <Field label="Competitor notes" error={errors.competitor_notes}>
        <textarea
          name="competitor_notes"
          rows={4}
          defaultValue={values.competitor_notes}
          className={fieldClass}
        />
      </Field>
      <Field label="Research notes" error={errors.research_notes}>
        <textarea
          name="research_notes"
          rows={5}
          defaultValue={values.research_notes}
          className={fieldClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="SEO provider"
          hint="Short identifier. Default is manual."
          error={errors.seo_provider}
        >
          <input
            name="seo_provider"
            defaultValue={values.seo_provider}
            className={fieldClass}
          />
        </Field>
        <Field label="Provider document ID" error={errors.provider_document_id}>
          <input
            name="provider_document_id"
            defaultValue={values.provider_document_id}
            className={fieldClass}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provider score" error={errors.provider_score}>
          <input
            name="provider_score"
            defaultValue={values.provider_score}
            className={fieldClass}
          />
        </Field>
        <Field label="Researched date" error={errors.researched_at}>
          <input
            type="date"
            name="researched_at"
            defaultValue={values.researched_at}
            className={fieldClass}
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save research brief"}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-normal text-accent" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
