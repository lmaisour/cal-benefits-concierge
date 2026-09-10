"use client";

import { useActionState } from "react";
import {
  addHomepageFeatureAction,
  removeHomepageFeatureAction,
  type HomepageFeatureActionState,
} from "@/lib/admin/actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import type { AdminHomepageFeature } from "@/lib/admin/homepage-queries";
import Link from "next/link";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

export function HomepageFeatureManager({
  features,
  programOptions,
}: {
  features: AdminHomepageFeature[];
  programOptions: { id: string; name: string; slug: string; status: string; active: boolean }[];
}) {
  const featuredIds = new Set(features.map((item) => item.program_id));
  const addable = programOptions.filter((program) => !featuredIds.has(program.id));
  const [state, formAction, pending] = useActionState(
    addHomepageFeatureAction,
    { ok: false } satisfies HomepageFeatureActionState,
  );

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Homepage</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const visible = isCurrentlyAvailable(feature.program);
              return (
                <tr key={feature.program_id} className="border-t border-border">
                  <td className="px-4 py-3">{feature.sort_order}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/programs/${feature.program.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {feature.program.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{feature.program.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {feature.program.status}
                    {feature.program.active ? "" : " · inactive"}
                  </td>
                  <td className="px-4 py-3">
                    {visible ? "Shown if ACTIVE" : "Hidden (not currently available)"}
                  </td>
                  <td className="px-4 py-3">
                    <ConfirmSubmit
                      action={removeHomepageFeatureAction.bind(null, feature.program_id)}
                      message="Remove this program from the homepage?"
                    >
                      <Button type="submit" variant="secondary" size="sm">
                        Unfeature
                      </Button>
                    </ConfirmSubmit>
                  </td>
                </tr>
              );
            })}
            {features.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  No homepage featured programs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={formAction} className="max-w-xl space-y-3 rounded-2xl border border-dashed border-border p-4">
        <h2 className="font-serif text-lg font-semibold">Feature a program</h2>
        {state.formError ? (
          <p className="text-sm text-accent" role="alert">
            {state.formError}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-muted-foreground">Added.</p> : null}
        <label className="block text-sm font-medium">
          Program
          <select name="program_id" required className={fieldClass} defaultValue="">
            <option value="">Select a program</option>
            {addable.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.status})
              </option>
            ))}
          </select>
          {state.errors?.program_id ? (
            <span className="mt-1 block text-xs text-accent">{state.errors.program_id}</span>
          ) : null}
        </label>
        <label className="block text-sm font-medium">
          Display order
          <input name="sort_order" defaultValue="100" className={fieldClass} />
          {state.errors?.sort_order ? (
            <span className="mt-1 block text-xs text-accent">{state.errors.sort_order}</span>
          ) : null}
        </label>
        <Button type="submit" size="sm" disabled={pending || addable.length === 0}>
          {pending ? "Saving…" : "Feature program"}
        </Button>
      </form>
    </div>
  );
}
