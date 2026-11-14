import { expect, test } from "@playwright/test";

// Next.js keeps the previous page in the DOM (hidden) for instant back
// navigation, so these tests find fields by role, which skips hidden ones.
import {
  adminClient,
  allowEmail,
  signedInClient,
  uniqueEmail,
} from "./support/auth";
import { addRecipe, signInAs, uniqueTitle } from "./support/recipes";

async function stored(recipeId: string) {
  const { data, error } = await adminClient()
    .from("recipes")
    .select("title, status, ingredients, notes, created_by, updated_at")
    .eq("id", recipeId)
    .single();
  if (error) throw error;
  return data;
}

test("an admin edits a recipe and sees the change", async ({ page }) => {
  await signInAs(page, "admin");
  const title = uniqueTitle("Victoria sponge");

  await page.goto("/recipes/new");
  await page.getByRole("textbox", { name: "Recipe name" }).fill(title);
  await page
    .getByRole("textbox", { name: "Ingredients" })
    .fill("For the sponge:\n4 eggs\n225g sugar\nFor the filling:\nJam");
  await page
    .getByRole("textbox", { name: "Method" })
    .fill("Oven: 180C\nBake for 25 minutes");
  await page.getByRole("textbox", { name: "Notes" }).fill("Use fresh eggs.");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  const recipeId = page.url().split("/").pop() as string;
  const before = await stored(recipeId);

  await page.getByRole("link", { name: "Edit this recipe" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Edit ${title}`,
  );

  // Every field is filled in, with sections written back as typed.
  await expect(page.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
    title,
  );
  await expect(page.getByRole("textbox", { name: "Ingredients" })).toHaveValue(
    "For the sponge:\n4 eggs\n225g sugar\nFor the filling:\nJam",
  );
  await expect(page.getByRole("textbox", { name: "Method" })).toHaveValue(
    "Oven: 180C\nBake for 25 minutes",
  );
  await expect(page.getByRole("textbox", { name: "Notes" })).toHaveValue(
    "Use fresh eggs.",
  );
  await expect(
    page.getByRole("checkbox", { name: /Fully typed up/ }),
  ).toBeChecked();

  const newTitle = `${title} (Mum's)`;
  await page.getByRole("textbox", { name: "Recipe name" }).fill(newTitle);
  await page
    .getByRole("textbox", { name: "Ingredients" })
    .fill(
      "For the sponge:\n4 eggs\n225g caster sugar\nFor the filling:\nJam\nCream",
    );
  await page.getByRole("textbox", { name: "Notes" }).fill("");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(newTitle);
  await expect(
    page.getByRole("listitem").filter({ hasText: "225g caster sugar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Cream" }),
  ).toBeVisible();
  // Clearing a field removes its section.
  expect(await page.locator("article h2").allTextContents()).toEqual([
    "Ingredients",
    "Method",
  ]);

  const after = await stored(recipeId);
  expect(after.notes).toBeNull();
  expect(after.created_by).toBe(before.created_by);
  expect(Date.parse(after.updated_at)).toBeGreaterThan(
    Date.parse(before.updated_at),
  );
});

test("typing up a captured card takes it off the to-type-up list", async ({
  page,
}) => {
  const email = await signInAs(page, "admin");
  const title = uniqueTitle("Card to type up");

  // A recipe saved by quick capture: a name and nothing else yet.
  const { data: profile } = await adminClient()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  const { data: recipe, error } = await adminClient()
    .from("recipes")
    .insert({ title, status: "needs_transcribing", created_by: profile?.id })
    .select("id")
    .single();
  if (error) throw error;

  await page.goto("/recipes/to-type-up");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}/edit$`));
  await expect(
    page.getByRole("checkbox", { name: /Fully typed up/ }),
  ).not.toBeChecked();

  // Saving without ticking the box keeps it on the list.
  await page.getByRole("textbox", { name: "Ingredients" }).fill("1lb oats");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Not yet typed up")).toBeVisible();
  expect((await stored(recipe.id)).status).toBe("needs_transcribing");

  // Ticking it marks the recipe complete.
  await page.getByRole("link", { name: "Edit this recipe" }).click();
  await expect(page.getByRole("textbox", { name: "Ingredients" })).toHaveValue(
    "1lb oats",
  );
  await page.getByRole("textbox", { name: "Method" }).fill("Mix\nBake slowly");
  await page.getByRole("checkbox", { name: /Fully typed up/ }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
  await expect(page.getByText("Not yet typed up")).toHaveCount(0);
  expect((await stored(recipe.id)).status).toBe("complete");

  await page.goto("/recipes/to-type-up");
  await expect(page.getByRole("heading", { name: "To type up" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(
    0,
  );

  // And it can be put back.
  await page.goto(`/recipes/${recipe.id}/edit`);
  await page.getByRole("checkbox", { name: /Fully typed up/ }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Not yet typed up")).toBeVisible();
  expect((await stored(recipe.id)).status).toBe("needs_transcribing");
});

test("editing keeps the rules: a name is required and what was typed is kept", async ({
  page,
}) => {
  await signInAs(page, "admin");
  const recipeId = await addRecipe(page, uniqueTitle("Keep my edits"));

  await page.goto(`/recipes/${recipeId}/edit`);
  await page.getByRole("textbox", { name: "Recipe name" }).fill("  ");
  await page.getByRole("textbox", { name: "Method" }).fill("A step I typed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Please give the recipe a name.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Method" })).toHaveValue(
    "A step I typed",
  );
});

test("readers can't edit: no link, no page, and the database refuses", async ({
  browser,
}) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  const title = uniqueTitle("Hands off");
  const recipeId = await addRecipe(adminPage, title);

  const page = await (await browser.newContext()).newPage();
  const readerEmail = await signInAs(page, "reader");
  await page.goto(`/recipes/${recipeId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(
    page.getByRole("link", { name: "Edit this recipe" }),
  ).toHaveCount(0);

  await page.goto(`/recipes/${recipeId}/edit`);
  await expect(
    page.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Recipe name" })).toHaveCount(
    0,
  );

  // Straight to the database with the reader's own session: nothing changes.
  const reader = await signedInClient(readerEmail);
  const { data } = await reader
    .from("recipes")
    .update({ title: "Changed by a reader" })
    .eq("id", recipeId)
    .select("id");
  expect(data ?? []).toEqual([]);
  expect((await stored(recipeId)).title).toBe(title);
});

test("even admins can't change who created a recipe", async () => {
  const email = uniqueEmail("column-admin");
  await allowEmail(email, "admin");
  const admin = await signedInClient(email);
  const { data: recipe } = await admin
    .from("recipes")
    .insert({ title: uniqueTitle("Mine") })
    .select("id, created_by")
    .single();
  if (!recipe) throw new Error("insert failed");

  const { error } = await admin
    .from("recipes")
    .update({ created_by: crypto.randomUUID() })
    .eq("id", recipe.id);
  expect(error?.code).toBe("42501"); // no permission on that column
  expect((await stored(recipe.id)).created_by).toBe(recipe.created_by);
});
