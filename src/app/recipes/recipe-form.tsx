"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, TextAreaField, TextField } from "@/components/ui/fields";
import type { RecipeFormState, RecipeFormValues } from "./actions";

type RecipeFormProps = {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  initialValues?: RecipeFormValues;
  submitLabel: string;
  cancelHref: string;
};

const empty: RecipeFormValues = {
  title: "",
  ingredients: "",
  method: "",
  notes: "",
  story: "",
};

export function RecipeForm({
  action,
  initialValues = empty,
  submitLabel,
  cancelHref,
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
