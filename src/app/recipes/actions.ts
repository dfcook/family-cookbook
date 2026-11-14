"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { parseLines } from "@/lib/recipes/lines";
import { createClient } from "@/lib/supabase/server";

export type RecipeFormValues = {
  title: string;
  ingredients: string;
  method: string;
  notes: string;
  story: string;
};

export type RecipeFormState = {
  values: RecipeFormValues;
  errors: Partial<Record<keyof RecipeFormValues | "form", string>>;
};

const LIMITS = {
  title: 200,
  notes: 20_000,
  story: 20_000,
  ingredients: 20_000,
  method: 20_000,
};

function readValues(formData: FormData): RecipeFormValues {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    title: field("title").trim(),
    ingredients: field("ingredients"),
    method: field("method"),
    notes: field("notes").trim(),
    story: field("story").trim(),
  };
}

function validate(values: RecipeFormValues): RecipeFormState["errors"] {
  const errors: RecipeFormState["errors"] = {};
  if (!values.title) errors.title = "Please give the recipe a name.";
  for (const [name, max] of Object.entries(LIMITS) as [
    keyof RecipeFormValues,
    number,
  ][]) {
    if (!errors[name] && values[name].length > max) {
      errors[name] =
        `This is too long: please keep it under ${max.toLocaleString("en-GB")} characters.`;
    }
  }
  return errors;
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  // Re-check on the server: hiding the button isn't security.
  await requireAdmin();

  const values = readValues(formData);
  const errors = validate(values);
  if (Object.keys(errors).length > 0) return { values, errors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      title: values.title,
      status: "complete",
      ingredients: parseLines(values.ingredients),
      method: parseLines(values.method),
      notes: values.notes || null,
      story: values.story || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createRecipe failed", error?.code, error?.message);
    return {
      values,
      errors: {
        form: "Sorry, the recipe couldn't be saved. Please try again.",
      },
    };
  }

  redirect(`/recipes/${data.id}`);
}

export type QuickCaptureResult =
  | { ok: true; recipeId: string }
  | { ok: false; error: string };

/**
 * Quick capture: save a recipe with just a name, marked as needing typing up.
 * The photos of the card are uploaded to it straight afterwards.
 */
export async function createQuickCapture(
  title: string,
): Promise<QuickCaptureResult> {
  await requireAdmin();

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Please give the recipe a name." };
  if (trimmed.length > LIMITS.title) {
    return { ok: false, error: "That name is too long." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ title: trimmed, status: "needs_transcribing" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createQuickCapture failed", error?.code, error?.message);
    return {
      ok: false,
      error: "Sorry, the recipe couldn't be saved. Please try again.",
    };
  }
  return { ok: true, recipeId: data.id };
}
