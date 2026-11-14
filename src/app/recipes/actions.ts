"use server";

import { revalidatePath } from "next/cache";
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
  /** Whether the recipe is fully typed up (status "complete"). */
  typedUp: boolean;
};

export type RecipeFormState = {
  values: RecipeFormValues;
  errors: Partial<Record<keyof RecipeFormValues | "form", string>>;
};

/**
 * After any change, refresh every page that might show it (lists, recipe
 * pages, edit forms), so nothing shows stale data. The app is small enough
 * that refreshing everything is simplest and safe.
 */
function refreshRecipePages() {
  revalidatePath("/", "layout");
}

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
    typedUp: formData.get("typedUp") === "on",
  };
}

function validate(values: RecipeFormValues): RecipeFormState["errors"] {
  const errors: RecipeFormState["errors"] = {};
  if (!values.title) errors.title = "Please give the recipe a name.";
  for (const [name, max] of Object.entries(LIMITS) as [
    keyof typeof LIMITS,
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

  refreshRecipePages();
  redirect(`/recipes/${data.id}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saves changes to a recipe. Bound to the recipe's id by the edit page:
 * updateRecipe.bind(null, id).
 */
export async function updateRecipe(
  recipeId: string,
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  await requireAdmin();

  const values = readValues(formData);
  const errors = validate(values);
  if (Object.keys(errors).length > 0) return { values, errors };
  if (!UUID.test(recipeId)) {
    return { values, errors: { form: "This recipe no longer exists." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .update({
      title: values.title,
      status: values.typedUp ? "complete" : "needs_transcribing",
      ingredients: parseLines(values.ingredients),
      method: parseLines(values.method),
      notes: values.notes || null,
      story: values.story || null,
    })
    .eq("id", recipeId)
    .is("deleted_at", null)
    .select("id");

  if (error || !data?.length) {
    console.error("updateRecipe failed", error?.code, error?.message);
    return {
      values,
      errors: {
        form: "Sorry, the changes couldn't be saved. Please try again.",
      },
    };
  }

  refreshRecipePages();
  redirect(`/recipes/${recipeId}`);
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
  refreshRecipePages();
  return { ok: true, recipeId: data.id };
}

export type TrashActionState = { error?: string };

/** Moves a recipe to the trash. Nothing is removed; it can be restored. */
export async function trashRecipe(
  recipeId: string,
  _prev: TrashActionState,
  _formData: FormData,
): Promise<TrashActionState> {
  await requireAdmin();
  if (!UUID.test(recipeId)) return { error: "This recipe no longer exists." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", recipeId)
    .is("deleted_at", null)
    .select("id");
  if (error || !data?.length) {
    console.error("trashRecipe failed", error?.code, error?.message);
    return {
      error: "Sorry, the recipe couldn't be deleted. Please try again.",
    };
  }

  refreshRecipePages();
  redirect("/recipes/trash");
}

/** Brings a recipe back from the trash, exactly as it was. */
export async function restoreRecipe(
  recipeId: string,
  _prev: TrashActionState,
  _formData: FormData,
): Promise<TrashActionState> {
  await requireAdmin();
  if (!UUID.test(recipeId)) return { error: "This recipe no longer exists." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .update({ deleted_at: null })
    .eq("id", recipeId)
    .not("deleted_at", "is", null)
    .select("id");
  if (error || !data?.length) {
    console.error("restoreRecipe failed", error?.code, error?.message);
    return {
      error: "Sorry, the recipe couldn't be restored. Please try again.",
    };
  }

  refreshRecipePages();
  redirect(`/recipes/${recipeId}`);
}
