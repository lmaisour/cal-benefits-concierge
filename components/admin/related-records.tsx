"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  addLocationAction,
  addRuleAction,
  addSourceAction,
  deleteLocationAction,
  deleteRuleAction,
  deleteSourceAction,
  updateLocationAction,
  updateRuleAction,
  updateSourceAction,
  type RelatedActionState,
} from "@/lib/admin/actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import { USER_PROFILE_FIELDS } from "@/lib/eligibility/types";
import {
  LOCATION_TYPE_LABELS,
  RELATIONSHIP_LABELS,
  RULE_OPERATOR_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/programs/labels";
import {
  LOCATION_TYPES,
  RULE_GROUP_OPERATORS,
  RULE_OPERATORS,
  SOURCE_TYPES,
} from "@/types/database";
import type {
  ProgramLocation,
  ProgramRule,
  ProgramSource,
} from "@/types/program";
import type { AdminRelatedProgram } from "@/lib/admin/form-values";
import Link from "next/link";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

const emptyRelated: RelatedActionState = { ok: false };

export function RelatedRecords({
  programId,
  rules,
  locations,
  sources,
  related,
}: {
  programId: string;
  rules: ProgramRule[];
  locations: ProgramLocation[];
  sources: ProgramSource[];
  related: AdminRelatedProgram[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-xl font-semibold">Eligibility rules</h2>
        <div className="mt-4 space-y-4">
          {rules.map((rule) => (
            <RuleEditor key={rule.id} programId={programId} rule={rule} />
          ))}
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet.</p>
          ) : null}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Add rule</h3>
          <RuleFields
            action={addRuleAction.bind(null, programId)}
            defaults={{
              field: "",
              operator: "equals",
              value: "",
              rule_group: "1",
              group_operator: "AND",
              required: true,
              explanation: "",
            }}
            submitLabel="Add rule"
          />
        </div>
        <datalist id="admin-rule-fields">
          {USER_PROFILE_FIELDS.map((field) => (
            <option key={field} value={field} />
          ))}
        </datalist>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Locations</h2>
        <div className="mt-4 space-y-4">
          {locations.map((location) => (
            <LocationEditor
              key={location.id}
              programId={programId}
              location={location}
            />
          ))}
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          ) : null}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Add location</h3>
          <LocationFields
            action={addLocationAction.bind(null, programId)}
            defaults={{ location_type: "CITY", location_value: "" }}
            submitLabel="Add location"
          />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Sources</h2>
        <div className="mt-4 space-y-4">
          {sources.map((source) => (
            <SourceEditor key={source.id} programId={programId} source={source} />
          ))}
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          ) : null}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Add source</h3>
          <SourceFields
            action={addSourceAction.bind(null, programId)}
            defaults={{
              source_type: "GENERAL",
              organization: "",
              url: "",
              verified_at: "",
              notes: "",
            }}
            submitLabel="Add source"
          />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Relationships</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only for this milestone.
        </p>
        {related.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No relationships recorded.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {related.map((item) => (
              <li key={item.relationship.id} className="rounded-lg border border-border p-3">
                <span className="font-medium">
                  {RELATIONSHIP_LABELS[item.relationship.relationship_type]}
                </span>{" "}
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  href={`/admin/programs/${item.program.id}`}
                >
                  {item.program.name}
                </Link>
                {item.relationship.notes ? (
                  <p className="mt-1 text-muted-foreground">
                    {item.relationship.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RuleEditor({
  programId,
  rule,
}: {
  programId: string;
  rule: ProgramRule;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <RuleFields
        action={updateRuleAction.bind(null, programId, rule.id)}
        defaults={{
          field: rule.field,
          operator: rule.operator,
          value: rule.value === null ? "" : JSON.stringify(rule.value, null, 2),
          rule_group: String(rule.rule_group),
          group_operator: rule.group_operator,
          required: rule.required,
          explanation: rule.explanation ?? "",
        }}
        submitLabel="Save rule"
        extra={
          <ConfirmSubmit
            action={deleteRuleAction.bind(null, programId, rule.id)}
            message="Delete this eligibility rule? This cannot be undone."
          >
            <Button type="submit" variant="secondary" size="sm">
              Delete
            </Button>
          </ConfirmSubmit>
        }
      />
    </div>
  );
}

function LocationEditor({
  programId,
  location,
}: {
  programId: string;
  location: ProgramLocation;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <LocationFields
        action={updateLocationAction.bind(null, programId, location.id)}
        defaults={{
          location_type: location.location_type,
          location_value: location.location_value,
        }}
        submitLabel="Save location"
        extra={
          <ConfirmSubmit
            action={deleteLocationAction.bind(null, programId, location.id)}
            message="Delete this location row? This cannot be undone."
          >
            <Button type="submit" variant="secondary" size="sm">
              Delete
            </Button>
          </ConfirmSubmit>
        }
      />
    </div>
  );
}

function SourceEditor({
  programId,
  source,
}: {
  programId: string;
  source: ProgramSource;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <SourceFields
        action={updateSourceAction.bind(null, programId, source.id)}
        defaults={{
          source_type: source.source_type,
          organization: source.organization ?? "",
          url: source.url,
          verified_at: source.verified_at ? source.verified_at.slice(0, 10) : "",
          notes: source.notes ?? "",
        }}
        submitLabel="Save source"
        extra={
          <ConfirmSubmit
            action={deleteSourceAction.bind(null, programId, source.id)}
            message="Delete this source? This cannot be undone."
          >
            <Button type="submit" variant="secondary" size="sm">
              Delete
            </Button>
          </ConfirmSubmit>
        }
      />
    </div>
  );
}

function RuleFields({
  action,
  defaults,
  submitLabel,
  extra,
}: {
  action: (
    state: RelatedActionState,
    formData: FormData,
  ) => Promise<RelatedActionState>;
  defaults: {
    field: string;
    operator: string;
    value: string;
    rule_group: string;
    group_operator: string;
    required: boolean;
    explanation: string;
  };
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, emptyRelated);
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <ActionErrors state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">
          Field
          <input
            name="field"
            list="admin-rule-fields"
            defaultValue={defaults.field}
            className={fieldClass}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Operator
          <select
            name="operator"
            defaultValue={defaults.operator}
            className={fieldClass}
          >
            {RULE_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {RULE_OPERATOR_LABELS[operator]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Rule group
          <input
            name="rule_group"
            defaultValue={defaults.rule_group}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Group operator
          <select
            name="group_operator"
            defaultValue={defaults.group_operator}
            className={fieldClass}
          >
            {RULE_GROUP_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        JSON value
        <textarea
          name="value"
          rows={3}
          defaultValue={defaults.value}
          className={`${fieldClass} font-mono`}
        />
      </label>
      <label className="block text-sm font-medium">
        Explanation
        <input
          name="explanation"
          defaultValue={defaults.explanation}
          className={fieldClass}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="required"
          value="true"
          defaultChecked={defaults.required}
        />
        Required
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {extra}
      </div>
    </form>
  );
}

function LocationFields({
  action,
  defaults,
  submitLabel,
  extra,
}: {
  action: (
    state: RelatedActionState,
    formData: FormData,
  ) => Promise<RelatedActionState>;
  defaults: { location_type: string; location_value: string };
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, emptyRelated);
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <ActionErrors state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Type
          <select
            name="location_type"
            defaultValue={defaults.location_type}
            className={fieldClass}
          >
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOCATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Value
          <input
            name="location_value"
            defaultValue={defaults.location_value}
            className={fieldClass}
            required
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {extra}
      </div>
    </form>
  );
}

function SourceFields({
  action,
  defaults,
  submitLabel,
  extra,
}: {
  action: (
    state: RelatedActionState,
    formData: FormData,
  ) => Promise<RelatedActionState>;
  defaults: {
    source_type: string;
    organization: string;
    url: string;
    verified_at: string;
    notes: string;
  };
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, emptyRelated);
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <ActionErrors state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Type
          <select
            name="source_type"
            defaultValue={defaults.source_type}
            className={fieldClass}
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {SOURCE_TYPE_LABELS[type] ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Organization
          <input
            name="organization"
            defaultValue={defaults.organization}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          URL
          <input
            name="url"
            type="url"
            defaultValue={defaults.url}
            className={fieldClass}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Verified at
          <input
            name="verified_at"
            type="date"
            defaultValue={defaults.verified_at}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Notes
        <input name="notes" defaultValue={defaults.notes} className={fieldClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {extra}
      </div>
    </form>
  );
}

function ActionErrors({ state }: { state: RelatedActionState }) {
  if (!state.formError && !state.errors) {
    return null;
  }
  return (
    <div className="text-sm text-accent" role="alert">
      {state.formError ? <p>{state.formError}</p> : null}
      {state.errors
        ? Object.values(state.errors).map((message) => (
            <p key={message}>{message}</p>
          ))
        : null}
    </div>
  );
}
