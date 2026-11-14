"use server";

import { requireAdmin } from "@/lib/auth";
import { recipeImagePath, type Variant } from "@/lib/images/sizing";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "recipe-images";
const VARIANT_NAMES: Variant[] = ["original", "display", "thumb"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PreparedUpload =
  | { ok: true; imageId: string; urls: Record<Variant, string> }
  | { ok: false; error: string };

/**
 * Step 1 of adding a photo: reserve a new image id and get one-time upload
 * URLs for its three files. Storage policies check the user is an admin.
 */
export async function prepareSourceImageUpload(
  recipeId: string,
): Promise<PreparedUpload> {
  await requireAdmin();
  if (!UUID.test(recipeId)) return { ok: false, error: "Unknown recipe." };

  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) return { ok: false, error: "Unknown recipe." };

  const imageId = crypto.randomUUID();
  const urls = {} as Record<Variant, string>;
  for (const variant of VARIANT_NAMES) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(recipeImagePath(recipeId, imageId, variant));
    if (error || !data) {
      console.error("prepareSourceImageUpload failed", error?.message);
      return {
        ok: false,
        error: "Couldn't start the upload. Please try again.",
      };
    }
    urls[variant] = data.signedUrl;
  }
  return { ok: true, imageId, urls };
}

/**
 * Step 2: once all three files are uploaded, record the image against the
 * recipe. The database checks the files exist and saves both rows together,
 * so a photo is either fully added or not at all.
 */
export async function attachSourceImage(
  recipeId: string,
  imageId: string,
  size: { width: number; height: number },
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_source_image", {
    p_recipe_id: recipeId,
    p_image_id: imageId,
    p_width: Math.round(size.width),
    p_height: Math.round(size.height),
  });
  if (error) {
    console.error("attachSourceImage failed", error.code, error.message);
    return { ok: false, error: "Couldn't save the photo. Please try again." };
  }
  return { ok: true };
}

/** After a failed upload, remove any files that did arrive. Best effort. */
export async function discardSourceImageUpload(
  recipeId: string,
  imageId: string,
): Promise<void> {
  await requireAdmin();
  if (!UUID.test(recipeId) || !UUID.test(imageId)) return;
  const supabase = await createClient();
  await supabase.storage
    .from(BUCKET)
    .remove(VARIANT_NAMES.map((v) => recipeImagePath(recipeId, imageId, v)));
}
