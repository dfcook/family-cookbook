import "server-only";
import { createClient } from "@/lib/supabase/server";
import { asRecipeLines } from "./lines";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every read goes through the signed-in user's Supabase client, so row-level
// security decides what they can see.

export async function listRecipes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title")
    .order("title", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRecipe(id: string) {
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, status, ingredients, method, notes, story")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    ingredients: asRecipeLines(data.ingredients),
    method: asRecipeLines(data.method),
  };
}

export type Recipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;
