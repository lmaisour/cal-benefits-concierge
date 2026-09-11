"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import {
  addFollowupQuestionAction,
  addFollowupRuleAction,
  deleteFollowupQuestionAction,
  deleteFollowupRuleAction,
  updateFollowupQuestionAction,
  updateFollowupRuleAction,
  type RelatedActionState,
} from "@/lib/admin/actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import { USER_PROFILE_FIELDS } from "@/lib/eligibility/types";
import { RULE_OPERATOR_LABELS } from "@/lib/programs/labels";
import { FOLLOWUP_ANSWER_TYPES, RULE_OPERATORS } from "@/types/database";
import type { ProgramFollowupQuestion, ProgramFollowupRule } from "@/types/program";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const emptyRelated: RelatedActionState = { ok: false };

export function FollowupRecords({
  programId,
  questions,
  rules,
}: {
  programId: string;
  questions: ProgramFollowupQuestion[];
  rules: ProgramFollowupRule[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-xl font-semibold">Supplemental questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Program-specific follow-ups. Do not add fields that belong on the core
          household profile.
        </p>
        <div className="mt-4 space-y-4">
          {questions.map((question) => (
            <QuestionEditor key={question.id} programId={programId} question={question} />
          ))}
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplemental questions yet.</p>
          ) : null}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Add question</h3>
          <QuestionFields
            action={addFollowupQuestionAction.bind(null, programId)}
            defaults={{
              question_key: "",
              question: "",
              help_text: "",
              answer_type: "single_choice",
              options: '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"not_sure","label":"Not sure","unknown":true}]',
              sort_order: String((questions.length + 1) * 10),
              required: true,
              display_when_field: "",
              display_when_operator: "",
              display_when_value: "",
              active: true,
              cta_label: "",
            }}
            submitLabel="Add question"
          />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Supplemental rules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Uses the same operators as core eligibility rules. Unknown / Not sure
          stays UNKNOWN.
        </p>
        <div className="mt-4 space-y-4">
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              programId={programId}
              questions={questions}
              rule={rule}
            />
          ))}
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplemental rules yet.</p>
          ) : null}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Add rule</h3>
          <RuleFields
            action={addFollowupRuleAction.bind(null, programId)}
            questions={questions}
            defaults={{
              question_id: questions[0]?.id ?? "",
              operator: "equals",
              expected_value: '"yes"',
              required: true,
              explanation: "",
            }}
            submitLabel="Add rule"
          />
        </div>
      </section>
    </div>
  );
}

function QuestionEditor({
  programId,
  question,
}: {
  programId: string;
  question: ProgramFollowupQuestion;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <QuestionFields
        action={updateFollowupQuestionAction.bind(null, programId, question.id)}
        defaults={{
          question_key: question.question_key,
          question: question.question,
          help_text: question.help_text ?? "",
          answer_type: question.answer_type,
          options: JSON.stringify(question.options, null, 2),
          sort_order: String(question.sort_order),
          required: question.required,
          display_when_field: question.display_when_field ?? "",
          display_when_operator: question.display_when_operator ?? "",
          display_when_value:
            question.display_when_value === null
              ? ""
              : JSON.stringify(question.display_when_value),
          active: question.active,
          cta_label: question.cta_label ?? "",
        }}
        submitLabel="Save question"
        extra={
          <ConfirmSubmit
            action={deleteFollowupQuestionAction.bind(null, programId, question.id)}
            message="Delete this supplemental question and its rules?"
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

function RuleEditor({
  programId,
  questions,
  rule,
}: {
  programId: string;
  questions: ProgramFollowupQuestion[];
  rule: ProgramFollowupRule;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <RuleFields
        action={updateFollowupRuleAction.bind(null, programId, rule.id)}
        questions={questions}
        defaults={{
          question_id: rule.question_id,
          operator: rule.operator,
          expected_value:
            rule.expected_value === null ? "" : JSON.stringify(rule.expected_value),
          required: rule.required,
          explanation: rule.explanation ?? "",
        }}
        submitLabel="Save rule"
        extra={
          <ConfirmSubmit
            action={deleteFollowupRuleAction.bind(null, programId, rule.id)}
            message="Delete this supplemental rule?"
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

function QuestionFields({
  action,
  defaults,
  submitLabel,
  extra,
}: {
  action: (prev: RelatedActionState, formData: FormData) => Promise<RelatedActionState>;
  defaults: {
    question_key: string;
    question: string;
    help_text: string;
    answer_type: string;
    options: string;
    sort_order: string;
    required: boolean;
    display_when_field: string;
    display_when_operator: string;
    display_when_value: string;
    active: boolean;
    cta_label: string;
  };
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, emptyRelated);
  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        Key
        <input name="question_key" defaultValue={defaults.question_key} className={fieldClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Question
        <input name="question" defaultValue={defaults.question} className={fieldClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Help text
        <input name="help_text" defaultValue={defaults.help_text} className={fieldClass} />
      </label>
      <label className="text-sm">
        Answer type
        <select name="answer_type" defaultValue={defaults.answer_type} className={fieldClass}>
          {FOLLOWUP_ANSWER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Sort order
        <input name="sort_order" defaultValue={defaults.sort_order} className={fieldClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Options JSON
        <textarea name="options" defaultValue={defaults.options} rows={5} className={fieldClass} />
      </label>
      <label className="text-sm">
        Show when field
        <input
          name="display_when_field"
          defaultValue={defaults.display_when_field}
          list="admin-rule-fields"
          className={fieldClass}
        />
      </label>
      <label className="text-sm">
        Show when operator
        <select name="display_when_operator" defaultValue={defaults.display_when_operator} className={fieldClass}>
          <option value="">Always show</option>
          {RULE_OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {RULE_OPERATOR_LABELS[operator] ?? operator}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        Show when value JSON
        <input name="display_when_value" defaultValue={defaults.display_when_value} className={fieldClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        CTA label
        <input name="cta_label" defaultValue={defaults.cta_label} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" value="true" defaultChecked={defaults.required} />
        Required
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" value="true" defaultChecked={defaults.active} />
        Active
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
        {extra}
      </div>
      {state.formError ? <p className="text-sm text-red-700 sm:col-span-2">{state.formError}</p> : null}
      {state.errors ? (
        <ul className="text-sm text-red-700 sm:col-span-2">
          {Object.entries(state.errors).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      ) : null}
      <datalist id="admin-followup-profile-fields">
        {USER_PROFILE_FIELDS.map((field) => (
          <option key={field} value={field} />
        ))}
      </datalist>
    </form>
  );
}

function RuleFields({
  action,
  questions,
  defaults,
  submitLabel,
  extra,
}: {
  action: (prev: RelatedActionState, formData: FormData) => Promise<RelatedActionState>;
  questions: ProgramFollowupQuestion[];
  defaults: {
    question_id: string;
    operator: string;
    expected_value: string;
    required: boolean;
    explanation: string;
  };
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, emptyRelated);
  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        Question
        <select name="question_id" defaultValue={defaults.question_id} className={fieldClass}>
          <option value="">Select a question</option>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.question_key}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Operator
        <select name="operator" defaultValue={defaults.operator} className={fieldClass}>
          {RULE_OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {RULE_OPERATOR_LABELS[operator] ?? operator}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Expected value JSON
        <input name="expected_value" defaultValue={defaults.expected_value} className={fieldClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Explanation
        <input name="explanation" defaultValue={defaults.explanation} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" value="true" defaultChecked={defaults.required} />
        Required
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
        {extra}
      </div>
      {state.formError ? <p className="text-sm text-red-700 sm:col-span-2">{state.formError}</p> : null}
      {state.errors ? (
        <ul className="text-sm text-red-700 sm:col-span-2">
          {Object.entries(state.errors).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
