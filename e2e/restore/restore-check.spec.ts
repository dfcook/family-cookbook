import { expect, test } from "@playwright/test";
import { adminClient, allowEmail, signIn } from "../support/auth";

// Runs against a restored backup of the real collection. Assertions compare
// counts and true/false only, so a failure never prints family data into the
// (public) CI log.

test("the restored collection shows in the app, with its photos", async ({
  page,
}) => {
  const db = adminClient();

  const { count: recipeCount, error } = await db
    .from("recipes")
    .select("id", { count: "exact", head: true })
    // Recipes in the trash are restored too, but not shown.
    .is("deleted_at", null);
  if (error) throw new Error("Couldn't count restored recipes");
  expect(recipeCount ?? 0, "restored recipes").toBeGreaterThan(0);

  const { data: withPhoto } = await db
    .from("recipe_source_images")
    .select("recipe_id, recipes!inner (deleted_at)")
    .is("recipes.deleted_at", null)
    .limit(1)
    .maybeSingle();
  expect(withPhoto !== null, "a restored recipe has a photo").toBe(true);

  // A throwaway admin, so the check never needs a family member's account.
  const email = "restore-check@example.test";
  await allowEmail(email, "admin");
  await signIn(page, email);

  // Every restored recipe is listed on the home page.
  await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();
  const listed = page.locator("main ul li a[href^='/recipes/']");
  await expect
    .poll(() => listed.count(), { message: "recipes listed on the home page" })
    .toBe(recipeCount);

  // A recipe with a photo shows it, served from restored storage.
  await page.goto(`/recipes/${withPhoto?.recipe_id}`);
  const photo = page
    .getByRole("region", { name: "The original" })
    .getByRole("img")
    .first();
  await expect
    .poll(
      () => photo.evaluate((img: HTMLImageElement) => img.naturalWidth > 0),
      { message: "the restored photo loads" },
    )
    .toBe(true);
});
