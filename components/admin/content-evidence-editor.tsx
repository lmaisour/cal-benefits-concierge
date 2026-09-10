"use client";

import { useActionState } from "react";
import {
  addContentEvidenceAction,
  deleteContentEvidenceAction,
  updateContentEvidenceAction,
  type ContentEvidenceActionState,
} from "@/lib/admin/research-actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import { contentEvidenceToFormValues } from "@/lib/admin/form-values";
import { emptyContentEvidenceFormValues } from "@/lib/admin/validate-content-evidence";
import { CONFIDENCE_LEVELS } from "@/types/database";
import type { ContentEvidence } from "@/types/program";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const emptyEvidence: ContentEvidenceActionState = { ok: false };

export function ContentEvidenceEditor({
  programId,
  evidence,
}: {
  programId: string;
  evidence: ContentEvidence[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Editorial evidence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal notes supporting editorial claims. This is not a substitute for
          catalog sources or eligibility rules, and it is not shown to visitors.
        </p>
      </div>

      <div className="space-y-4">
        {evidence.map((item) => (
          <EvidenceItem key={item.id} programId={programId} evidence={item} />
        ))}
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editorial evidence yet.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold">Add evidence</h3>
        <EvidenceFields
          action={addContentEvidenceAction.bind(null, programId)}
          defaults={emptyContentEvidenceFormValues()}
          submitLabel="Add evidence"
        />
      </div>
    </section>
  );
}

function EvidenceItem({
  programId,
  evidence,
}: {
  programId: string;
  evidence: ContentEvidence;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <EvidenceFields
        action={updateContentEvidenceAction.bind(null, programId, evidence.id)}
        defaults={contentEvidenceToFormValues(evidence)}
        submitLabel="Save"
      />
      <ConfirmSubmit
        action={deleteContentEvidenceAction.bind(null, programId, evidence.id)}
        message="Delete this editorial evidence record?"
        className="mt-3"
      >
        <Button type="submit" variant="secondary" size="sm">
          Delete
        </Button>
      </ConfirmSubmit>
    </div>
  );
}

function EvidenceFields({
  action,
  defaults,
  submitLabel,
}: {
  action: (
    prev: ContentEvidenceActionState,
    formData: FormData,
  ) => Promise<ContentEvidenceActionState>;
  defaults: ReturnType<typeof emptyContentEvidenceFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyEvidence);
  const values = state.values ?? defaults;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="mt-3 space-y-3">
      {state.formError ? (
        <p className="text-sm text-accent" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      <label className="block text-sm font-medium">
        Section
        <input
          name="content_section"
          required
          defaultValue={values.content_section}
          className={fieldClass}
        />
        {errors.content_section ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.content_section}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Claim
        <textarea
          name="claim"
          required
          rows={3}
          defaultValue={values.claim}
          className={fieldClass}
        />
        {errors.claim ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.claim}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Source URL
        <input
          name="source_url"
          required
          defaultValue={values.source_url}
          className={fieldClass}
        />
        {errors.source_url ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.source_url}
          </span>
        ) : null}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Source title
          <input
            name="source_title"
            defaultValue={values.source_title}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Source publisher
          <input
            name="source_publisher"
            defaultValue={values.source_publisher}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Source date
          <input
            type="date"
            name="source_date"
            defaultValue={values.source_date}
            className={fieldClass}
          />
          {errors.source_date ? (
            <span className="mt-1 block text-xs font-normal text-accent" role="alert">
              {errors.source_date}
            </span>
          ) : null}
        </label>
        <label className="block text-sm font-medium">
          Verified date
          <input
            type="date"
            name="verified_at"
            defaultValue={values.verified_at}
            className={fieldClass}
          />
          {errors.verified_at ? (
            <span className="mt-1 block text-xs font-normal text-accent" role="alert">
              {errors.verified_at}
            </span>
          ) : null}
        </label>
        <label className="block text-sm font-medium">
          Confidence
          <select name="confidence" defaultValue={values.confidence} className={fieldClass}>
            {CONFIDENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {errors.confidence ? (
            <span className="mt-1 block text-xs font-normal text-accent" role="alert">
              {errors.confidence}
            </span>
          ) : null}
        </label>
      </div>
      <label className="block text-sm font-medium">
        Notes
        <textarea name="notes" rows={3} defaultValue={values.notes} className={fieldClass} />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
