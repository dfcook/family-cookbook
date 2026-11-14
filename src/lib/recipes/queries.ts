import "server-only";
import { createClient } from "@/lib/supabase/server";
import { byTitle, chooseCardImage } from "./card-image";
import { asRecipeLines } from "./lines";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every read goes through the signed-in user's Supabase client, so row-level
// security decides what they can see. Readers never see recipes in the
// trash; admins can (for the trash page), so every query here that isn't
// about the trash filters them out with `.is("deleted_at", null)`.

/**
 * Every recipe for the home grid, by title, each with a short-lived link to
 * its card picture (see chooseCardImage), or null for a text-only card.
 */
export async function listRecipes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, status, recipe_source_images (images (thumb_path))")
    .is("deleted_at", null)
    // Only the first photo of the original is needed for the card.
    .order("sort_order", {
      referencedTable: "recipe_source_images",
      ascending: true,
    })
    .limit(1, { referencedTable: "recipe_source_images" });
  if (error) throw error;

  const recipes = data
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      status: recipe.status,
      image: chooseCardImage({
        sourceThumbPaths: recipe.recipe_source_images.flatMap((row) =>
          row.images ? [row.images.thumb_path] : [],
        ),
      }),
    }))
    .sort(byTitle);

  const paths = recipes.flatMap((recipe) =>
    recipe.image ? [recipe.image.path] : [],
  );
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("recipe-images")
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (signError) throw signError;
    for (const item of signed) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  return recipes.map(({ image, ...recipe }) => {
    const url = image && urls.get(image.path);
    return {
      ...recipe,
      image: image && url ? { kind: image.kind, url } : null,
    };
  });
}

export type RecipeSummary = Awaited<ReturnType<typeof listRecipes>>[number];

/** Recipes saved by quick capture and not yet typed up, oldest first. */
export async function listToTypeUp() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, created_at, recipe_source_images (count)")
    .eq("status", "needs_transcribing")
    .is("deleted_at", null)
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
    .select("id, title, status, ingredients, method, notes, story, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
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

/** Recipes in the trash, most recently deleted first. Admins only. */
export async function listTrash() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    deletedAt: recipe.deleted_at as string,
  }));
}

export type Recipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;
