"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  createGuideAction,
  updateGuideAction,
  type GuideActionState,
} from "@/lib/admin/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import type { GuideFormValues } from "@/lib/admin/validate-guide";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium";

type ProgramOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
  active: boolean;
};

export function GuideForm({
  mode,
  guideId,
  initialValues,
  programOptions,
}: {
  mode: "create" | "edit";
  guideId?: string;
  initialValues: GuideFormValues;
  programOptions: ProgramOption[];
}) {
  const action =
    mode === "edit" && guideId
      ? updateGuideAction.bind(null, guideId)
      : createGuideAction;
  const [state, formAction, pending] = useActionState(
    action,
    { ok: false } satisfies GuideActionState,
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};
  const selected = new Set(values.related_program_ids);

  return (
    <form action={formAction} className="space-y-5">
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
        <Field label="Title" error={errors.title}>
          <input name="title" required defaultValue={values.title} className={fieldClass} />
        </Field>
        <Field label="Slug" error={errors.slug}>
          <input name="slug" required defaultValue={values.slug} className={fieldClass} />
        </Field>
      </div>
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
      <Field label="Excerpt" error={errors.excerpt}>
        <textarea name="excerpt" rows={3} defaultValue={values.excerpt} className={fieldClass} />
      </Field>
      <Field label="Body" error={errors.body}>
        <textarea name="body" rows={16} defaultValue={values.body} className={fieldClass} />
      </Field>
      <Field label="Published date" error={errors.published_at}>
        <input
          type="date"
          name="published_at"
          defaultValue={values.published_at}
          className={fieldClass}
        />
      </Field>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          value="true"
          defaultChecked={values.published}
        />
        Published (public /guides only shows published guides)
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Related programs</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Links appear on the guide and on each selected program page.
        </p>
        {errors.related_program_ids ? (
          <p className="mt-1 text-xs text-accent" role="alert">
            {errors.related_program_ids}
          </p>
        ) : null}
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
          {programOptions.map((program) => (
            <li key={program.id}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="related_program_ids"
                  value={program.id}
                  defaultChecked={selected.has(program.id)}
                  className="mt-1"
                />
                <span>
                  {program.name}
                  <span className="block text-xs text-muted-foreground">
                    {program.slug}
                    {program.active ? "" : " · inactive"} · {program.status}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create guide" : "Save guide"}
        </Button>
        <ButtonLink href="/admin/guides" variant="secondary">
          Back to guides
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
