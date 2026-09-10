"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  updateProgramContentAction,
  type ContentActionState,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import type { ProgramContentFormValues } from "@/lib/admin/validate-content";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium";

export function ProgramContentForm({
  programId,
  programSlug,
  initialValues,
}: {
  programId: string;
  programSlug: string;
  initialValues: ProgramContentFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    updateProgramContentAction.bind(null, programId, programSlug),
    { ok: false } satisfies ContentActionState,
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">SEO and page copy</h2>
      <p className="text-sm text-muted-foreground">
        These fields appear on the public program page. Leave a field blank to
        fall back to the catalog name, short description, or benefit summary.
        Editorial copy never changes eligibility matching.
      </p>
      {state.formError ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg border border-primary/20 bg-hero px-4 py-3 text-sm">
          Saved page copy.
        </p>
      ) : null}

      <Field label="SEO title" error={errors.seo_title}>
        <input name="seo_title" defaultValue={values.seo_title} className={fieldClass} />
      </Field>
      <Field label="Meta description" error={errors.meta_description}>
        <textarea
          name="meta_description"
          rows={3}
          defaultValue={values.meta_description}
          className={fieldClass}
        />
      </Field>
      <Field label="Overview" error={errors.overview}>
        <textarea
          name="overview"
          rows={6}
          defaultValue={values.overview}
          className={fieldClass}
        />
      </Field>
      <Field label="What you can get" error={errors.benefit_explanation}>
        <textarea
          name="benefit_explanation"
          rows={5}
          defaultValue={values.benefit_explanation}
          className={fieldClass}
        />
      </Field>
      <Field label="How to apply" error={errors.how_to_apply}>
        <textarea
          name="how_to_apply"
          rows={5}
          defaultValue={values.how_to_apply}
          className={fieldClass}
        />
      </Field>
      <Field label="Documents you may need" error={errors.documents_needed}>
        <textarea
          name="documents_needed"
          rows={4}
          defaultValue={values.documents_needed}
          className={fieldClass}
        />
      </Field>
      <Field label="Important things to know" error={errors.important_notes}>
        <textarea
          name="important_notes"
          rows={5}
          defaultValue={values.important_notes}
          className={fieldClass}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save page copy"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-normal text-accent" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
