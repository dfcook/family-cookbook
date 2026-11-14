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
    .select("id, title, status")
    .order("title", { ascending: true });
  if (error) throw error;
  return data;
}

/** Recipes saved by quick capture and not yet typed up, oldest first. */
export async function listToTypeUp() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, created_at, recipe_source_images (count)")
    .eq("status", "needs_transcribing")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    createdAt: recipe.created_at,
    photoCount: recipe.recipe_source_images[0]?.count ?? 0,
  }));
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
    sourceImages: await getSourceImages(id),
  };
}

/** How long a signed image link works. Pages are rendered per request. */
const SIGNED_URL_SECONDS = 60 * 60;

/** The recipe's photos of the original, in order, with short-lived links. */
async function getSourceImages(recipeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_source_images")
    .select("caption, images (id, display_path, width, height)")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const rows = data.flatMap((row) =>
    row.images ? [{ ...row.images, caption: row.caption }] : [],
  );
  if (rows.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from("recipe-images")
    .createSignedUrls(
      rows.map((row) => row.display_path),
      SIGNED_URL_SECONDS,
    );
  if (signError) throw signError;

  return rows.flatMap((row, i) => {
    const url = signed[i]?.signedUrl;
    return url
      ? [
          {
            id: row.id,
            url,
            width: row.width,
            height: row.height,
            caption: row.caption,
          },
        ]
      : [];
  });
}

export type Recipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;
