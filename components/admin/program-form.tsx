"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  createProgramAction,
  updateProgramAction,
  type ProgramActionState,
} from "@/lib/admin/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { programCategories } from "@/lib/config/categories";
import {
  BENEFIT_TYPE_LABELS,
  CONFIDENCE_LABELS,
  STATUS_LABELS,
} from "@/lib/programs/labels";
import type { ProgramFormValues } from "@/lib/admin/validate-program";
import {
  BENEFIT_TYPES,
  CONFIDENCE_LEVELS,
  PROGRAM_STATUSES,
} from "@/types/database";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium";

export function ProgramForm({
  mode,
  programId,
  initialValues,
  readOnly,
}: {
  mode: "create" | "edit";
  programId?: string;
  initialValues: ProgramFormValues;
  readOnly?: { externalId?: string | null; unmodeledSummary?: string | null };
}) {
  const action =
    mode === "edit" && programId
      ? updateProgramAction.bind(null, programId)
      : createProgramAction;
  const [state, formAction, pending] = useActionState(
    action,
    { ok: false } satisfies ProgramActionState,
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.formError ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg border border-primary/20 bg-hero px-4 py-3 text-sm">
          Saved.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input name="name" required defaultValue={values.name} className={fieldClass} />
        </Field>
        <Field label="Slug" error={errors.slug}>
          <input name="slug" required defaultValue={values.slug} className={fieldClass} />
        </Field>
        <Field label="Administrator" error={errors.administrator}>
          <input
            name="administrator"
            defaultValue={values.administrator}
            className={fieldClass}
          />
        </Field>
        <Field label="Category" error={errors.category}>
          <select name="category" required defaultValue={values.category} className={fieldClass}>
            <option value="">Select category</option>
            {programCategories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
            {values.category &&
            !programCategories.some((item) => item.slug === values.category) ? (
              <option value={values.category}>{values.category}</option>
            ) : null}
          </select>
        </Field>
        <Field label="Subcategory" error={errors.subcategory}>
          <input
            name="subcategory"
            defaultValue={values.subcategory}
            className={fieldClass}
          />
        </Field>
        <Field label="Status" error={errors.status}>
          <select name="status" required defaultValue={values.status} className={fieldClass}>
            {PROGRAM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Benefit type" error={errors.benefit_type}>
          <select
            name="benefit_type"
            required
            defaultValue={values.benefit_type}
            className={fieldClass}
          >
            <option value="">Select type</option>
            {BENEFIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {BENEFIT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Benefit period" error={errors.benefit_period}>
          <input
            name="benefit_period"
            defaultValue={values.benefit_period}
            className={fieldClass}
          />
        </Field>
        <Field label="Benefit min" error={errors.benefit_min}>
          <input
            name="benefit_min"
            inputMode="decimal"
            defaultValue={values.benefit_min}
            className={fieldClass}
          />
        </Field>
        <Field label="Benefit max" error={errors.benefit_max}>
          <input
            name="benefit_max"
            inputMode="decimal"
            defaultValue={values.benefit_max}
            className={fieldClass}
          />
        </Field>
        <Field label="Official URL" error={errors.official_url}>
          <input
            name="official_url"
            type="url"
            defaultValue={values.official_url}
            className={fieldClass}
          />
        </Field>
        <Field label="Application URL" error={errors.application_url}>
          <input
            name="application_url"
            type="url"
            defaultValue={values.application_url}
            className={fieldClass}
          />
        </Field>
        <Field label="Effective start" error={errors.effective_start}>
          <input
            name="effective_start"
            type="date"
            defaultValue={values.effective_start}
            className={fieldClass}
          />
        </Field>
        <Field label="Effective end" error={errors.effective_end}>
          <input
            name="effective_end"
            type="date"
            defaultValue={values.effective_end}
            className={fieldClass}
          />
        </Field>
        <Field label="Application deadline" error={errors.application_deadline}>
          <input
            name="application_deadline"
            type="date"
            defaultValue={values.application_deadline}
            className={fieldClass}
          />
        </Field>
        <Field label="Last verified" error={errors.last_verified_at}>
          <input
            name="last_verified_at"
            type="date"
            defaultValue={values.last_verified_at}
            className={fieldClass}
          />
        </Field>
        <Field label="Confidence" error={errors.confidence}>
          <select name="confidence" defaultValue={values.confidence} className={fieldClass}>
            <option value="">Not set</option>
            {CONFIDENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {CONFIDENCE_LABELS[level]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preapproval required" error={errors.preapproval_required}>
          <select
            name="preapproval_required"
            defaultValue={values.preapproval_required}
            className={fieldClass}
          >
            <option value="">Not set</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field
          label="Purchase before approval allowed"
          error={errors.purchase_before_approval_allowed}
        >
          <select
            name="purchase_before_approval_allowed"
            defaultValue={values.purchase_before_approval_allowed}
            className={fieldClass}
          >
            <option value="">Not set</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <Field label="Short description" error={errors.short_description}>
        <textarea
          name="short_description"
          rows={2}
          defaultValue={values.short_description}
          className={fieldClass}
        />
      </Field>
      <Field label="Benefit summary" error={errors.benefit_summary}>
        <textarea
          name="benefit_summary"
          rows={2}
          defaultValue={values.benefit_summary}
          className={fieldClass}
        />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea
          name="description"
          rows={5}
          defaultValue={values.description}
          className={fieldClass}
        />
      </Field>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="statewide"
            value="true"
            defaultChecked={values.statewide}
          />
          Statewide
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="featured"
            value="true"
            defaultChecked={values.featured}
          />
          Catalog featured (directory flag, not homepage)
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={values.active}
          />
          Active (uncheck instead of deleting)
        </label>
      </div>

      {readOnly?.externalId ? (
        <p className="text-sm text-muted-foreground">
          External ID (read-only): {readOnly.externalId}
        </p>
      ) : null}
      {readOnly?.unmodeledSummary ? (
        <p className="text-sm text-muted-foreground">
          Unmodeled required criteria (read-only): {readOnly.unmodeledSummary}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create program" : "Save program"}
        </Button>
        <ButtonLink href="/admin/programs" variant="secondary">
          Back to list
        </ButtonLink>
      </div>
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
