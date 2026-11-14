"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, TextAreaField, TextField } from "@/components/ui/fields";
import type { RecipeFormState, RecipeFormValues } from "./actions";

type RecipeFormProps = {
  action: (
    state: RecipeFormState,
    formData: FormData,
  ) => Promise<RecipeFormState>;
  initialValues?: RecipeFormValues;
  submitLabel: string;
  cancelHref: string;
  /** Show the "fully typed up" tick box (when editing). */
  showTypedUp?: boolean;
};

const empty: RecipeFormValues = {
  title: "",
  ingredients: "",
  method: "",
  notes: "",
  story: "",
  typedUp: true,
};

export function RecipeForm({
  action,
  initialValues = empty,
  submitLabel,
  cancelHref,
  showTypedUp = false,
}: RecipeFormProps) {
  const [state, formAction, saving] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const { values, errors } = state;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField
        label="Recipe name"
        name="title"
        required
        maxLength={200}
        defaultValue={values.title}
        error={errors.title}
      />
      <TextAreaField
        label="Ingredients"
        name="ingredients"
        hint={
          <>
            One ingredient per line, written as on the card. For a section, end
            a line with a colon, like <em>For the pastry:</em>
          </>
        }
        rows={8}
        defaultValue={values.ingredients}
        error={errors.ingredients}
      />
      <TextAreaField
        label="Method"
        name="method"
        hint="One step per line. Sections work the same way as ingredients."
        rows={10}
        defaultValue={values.method}
        error={errors.method}
      />
      <TextAreaField
        label="Notes"
        name="notes"
        hint="Practical tips, like “Mum used half the sugar”."
        rows={3}
        defaultValue={values.notes}
        error={errors.notes}
      />
      <TextAreaField
        label="The story"
        name="story"
        hint="Who made it, when, and why it matters to the family."
        rows={5}
        defaultValue={values.story}
        error={errors.story}
      />
      {showTypedUp && (
        <label className="flex min-h-tap items-start gap-3 rounded-card border border-line bg-card p-4">
          <input
            type="checkbox"
            name="typedUp"
            defaultChecked={values.typedUp}
            className="mt-1 size-6 shrink-0 accent-accent"
          />
          <span className="flex flex-col gap-1">
            <span className="text-lg font-semibold">Fully typed up</span>
            <span className="text-ink-muted">
              Untick to keep it on the &ldquo;to type up&rdquo; list.
            </span>
          </span>
        </label>
      )}
      <FormError message={errors.form} />
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-tap items-center justify-center px-5"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
