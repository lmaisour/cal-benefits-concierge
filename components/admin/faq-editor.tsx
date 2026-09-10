"use client";

import { useActionState } from "react";
import {
  addFaqAction,
  deleteFaqAction,
  updateFaqAction,
  type FaqActionState,
} from "@/lib/admin/actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import type { ProgramFaq } from "@/types/program";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
const emptyFaq: FaqActionState = { ok: false };

export function FaqEditor({
  programId,
  programSlug,
  faqs,
}: {
  programId: string;
  programSlug: string;
  faqs: ProgramFaq[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Frequently asked questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only questions saved here appear on the public page and in FAQ structured
          data. Do not invent answers.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <FaqItem
            key={faq.id}
            programId={programId}
            programSlug={programSlug}
            faq={faq}
          />
        ))}
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold">Add FAQ</h3>
        <FaqFields
          action={addFaqAction.bind(null, programId, programSlug)}
          defaults={{ question: "", answer: "", sort_order: String(faqs.length * 10) }}
          submitLabel="Add FAQ"
        />
      </div>
    </section>
  );
}

function FaqItem({
  programId,
  programSlug,
  faq,
}: {
  programId: string;
  programSlug: string;
  faq: ProgramFaq;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <FaqFields
        action={updateFaqAction.bind(null, programId, programSlug, faq.id)}
        defaults={{
          question: faq.question,
          answer: faq.answer,
          sort_order: String(faq.sort_order),
        }}
        submitLabel="Save"
      />
      <ConfirmSubmit
        action={deleteFaqAction.bind(null, programId, programSlug, faq.id)}
        message="Delete this FAQ?"
        className="mt-3"
      >
        <Button type="submit" variant="secondary" size="sm">
          Delete
        </Button>
      </ConfirmSubmit>
    </div>
  );
}

function FaqFields({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FaqActionState, formData: FormData) => Promise<FaqActionState>;
  defaults: { question: string; answer: string; sort_order: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFaq);
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
        Question
        <input
          name="question"
          required
          defaultValue={values.question}
          className={fieldClass}
        />
        {errors.question ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.question}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Answer
        <textarea
          name="answer"
          required
          rows={4}
          defaultValue={values.answer}
          className={fieldClass}
        />
        {errors.answer ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.answer}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Display order
        <input
          name="sort_order"
          defaultValue={values.sort_order}
          className={fieldClass}
        />
        {errors.sort_order ? (
          <span className="mt-1 block text-xs font-normal text-accent" role="alert">
            {errors.sort_order}
          </span>
        ) : null}
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
