import { expect, test } from "@playwright/test";
import {
  adminClient,
  allowEmail,
  anonymousClient,
  signedInClient,
  uniqueEmail,
} from "./support/auth";
import { quickCapture, signInAs, uniqueTitle } from "./support/recipes";

test("an admin adds a typed-up recipe and it reads in cooking order", async ({
  page,
}) => {
  await signInAs(page, "admin");
  const title = uniqueTitle("Nana's apple pie");

  await page.getByRole("link", { name: "Add a recipe" }).click();
  await page.getByLabel("Recipe name").fill(title);
  await page
    .getByLabel("Ingredients")
    .fill(
      "For the pastry:\n200g plain flour\n100g butter\n\nFor the filling:\n4 Bramley apples\n",
    );
  await page
    .getByLabel("Method")
    .fill(
      "Pastry:\nRub the butter into the flour\nChill for 30 minutes\nFilling:\nPeel and slice the apples\nBake: 40 minutes at 180C",
    );
  await page.getByLabel("Notes").fill("Mum used half the sugar.");
  await page.getByLabel("The story").fill("Made every Sunday in the 1960s.");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  // Sections in order: ingredients, method, notes, story.
  const headings = await page.locator("article h2").allTextContents();
  expect(headings).toEqual(["Ingredients", "Method", "Notes", "The story"]);

  // Ingredient sections keep their headings and items.
  await expect(
    page.getByRole("heading", { name: "For the pastry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "4 Bramley apples" }),
  ).toBeVisible();

  // Method steps are numbered straight through both sections; a colon in the
  // middle of a line stays part of the step.
  const lists = page.locator("article ol");
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(1)).toHaveAttribute("start", "3");
  await expect(lists.nth(1).getByRole("listitem").nth(1)).toHaveText(
    "Bake: 40 minutes at 180C",
  );

  // It's listed on the home page.
  await page.getByRole("link", { name: "Family Cookbook" }).click();
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
});

test("empty sections are left out", async ({ page }) => {
  await signInAs(page, "admin");
  const title = uniqueTitle("Just a title");

  await page.goto("/recipes/new");
  await page.getByLabel("Recipe name").fill(title);
  await page.getByLabel("Method").fill("Ask Nana");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  expect(await page.locator("article h2").allTextContents()).toEqual([
    "Method",
  ]);
});

test("a recipe needs a name", async ({ page }) => {
  await signInAs(page, "admin");

  await page.goto("/recipes/new");
  await page.getByLabel("Recipe name").fill("   ");
  await page.getByLabel("Ingredients").fill("1 egg");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByText("Please give the recipe a name.")).toBeVisible();
  // What was typed is kept.
  await expect(page.getByLabel("Ingredients")).toHaveValue("1 egg");
});

test("a reader can read a recipe but sees no way to add or change one", async ({
  browser,
}) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  const title = uniqueTitle("Christmas trifle");
  await adminPage.goto("/recipes/new");
  await adminPage.getByLabel("Recipe name").fill(title);
  await adminPage.getByLabel("Ingredients").fill("Sponge\nCustard");
  await adminPage.getByRole("button", { name: "Save recipe" }).click();
  await expect(adminPage).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  const recipeUrl = adminPage.url();

  const page = await (await browser.newContext()).newPage();
  await signInAs(page, "reader");

  await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a recipe" })).toHaveCount(0);

  await page.goto(recipeUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  // The only button on the page is the header's sign out.
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  await expect(page.locator("main").getByRole("link")).toHaveCount(0);

  // Pages stream, so "not found" shows as a page rather than a 404 status.
  await page.goto("/recipes/new");
  await expect(
    page.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeVisible();
  await expect(page.getByLabel("Recipe name")).toHaveCount(0);
});

test("row-level security: readers can't add recipes and signed-out visitors can't read them", async () => {
  const readerEmail = uniqueEmail("rls-reader");
  await allowEmail(readerEmail, "reader");
  const reader = await signedInClient(readerEmail);

  const { error } = await reader
    .from("recipes")
    .insert({ title: "Sneaky recipe" });
  expect(error?.code).toBe("42501"); // insufficient privilege: blocked by RLS

  const { data: readable, error: readError } = await reader
    .from("recipes")
    .select("id");
  expect(readError).toBeNull();
  expect(Array.isArray(readable)).toBe(true);

  const { data: anonymous } = await anonymousClient()
    .from("recipes")
    .select("id");
  expect(anonymous).toEqual([]);
});

test("an unknown recipe address shows not found", async ({ page }) => {
  await signInAs(page, "reader");
  for (const path of [
    "/recipes/00000000-0000-0000-0000-000000000000",
    "/recipes/not-a-recipe",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We couldn't find that page" }),
    ).toBeVisible();
  }
});

test("on a wide screen a typed-up recipe has its card in a column beside it", async ({
  page,
}, testInfo) => {
  await signInAs(page, "admin");
  const title = uniqueTitle("Side by side");
  await quickCapture(page, title);
  const { data: recipe, error } = await adminClient()
    .from("recipes")
    .update({
      status: "complete",
      ingredients: [{ type: "item", text: "2 eggs" }],
      method: [{ type: "item", text: "Whisk" }],
    })
    .eq("title", title)
    .select("id")
    .single();
  if (error) throw error;

  await page.goto(`/recipes/${recipe.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const ingredients = await page
    .getByRole("heading", { name: "Ingredients" })
    .boundingBox();
  const original = await page
    .getByRole("heading", { name: "The original", exact: true })
    .boundingBox();
  if (!ingredients || !original) throw new Error("not laid out");

  if (testInfo.project.name === "desktop") {
    expect(original.x).toBeGreaterThan(ingredients.x + ingredients.width);
    expect(original.y).toBeLessThan(ingredients.y);
  } else {
    // Phones: one column, the card after the recipe.
    expect(original.x).toBe(ingredients.x);
    expect(original.y).toBeGreaterThan(ingredients.y);
  }
});
