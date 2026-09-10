"use client";

import { useActionState } from "react";
import {
  updateHomepageFeatureAction,
  type HomepageFeatureActionState,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import type { HomepageFeature } from "@/types/program";
import type { ProgramStatus } from "@/types/database";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

export function HomepageFeatureForm({
  programId,
  status,
  active,
  feature,
}: {
  programId: string;
  status: ProgramStatus;
  active: boolean;
  feature: HomepageFeature | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateHomepageFeatureAction.bind(null, programId),
    { ok: false } satisfies HomepageFeatureActionState,
  );
  const available = isCurrentlyAvailable({ status, active });

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-serif text-xl font-semibold">Homepage featured</h2>
      <p className="text-sm text-muted-foreground">
        Controls the consumer homepage list. The public site still reads the
        program name, status, and benefits from the catalog record. Unavailable
        programs stay hidden even if they remain featured here.
      </p>
      {!available ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm">
          This program is not currently available, so it will not appear on the
          homepage while featured.
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm text-accent" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-muted-foreground">Saved homepage placement.</p> : null}
      {state.errors?.sort_order ? (
        <p className="text-sm text-accent" role="alert">
          {state.errors.sort_order}
        </p>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="featured"
          value="true"
          defaultChecked={feature !== null}
        />
        Feature on homepage
      </label>
      <label className="block text-sm font-medium">
        Display order
        <input
          name="sort_order"
          defaultValue={String(feature?.sort_order ?? 0)}
          className={fieldClass}
        />
      </label>
      <input type="hidden" name="program_id" value={programId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save homepage placement"}
      </Button>
    </form>
  );
}
