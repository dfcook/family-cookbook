import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { adminClient } from "./support/auth";
import { signInAs, uniqueTitle } from "./support/recipes";

const fixture = (name: string) => join(__dirname, "fixtures", name);

async function capture(page: Page, title: string, photos: string[]) {
  await page.getByLabel("Recipe name").fill(title);
  await page.getByLabel("Choose photos").setInputFiles(photos.map(fixture));
  await expect(page.getByRole("img", { name: /Chosen photo/ })).toHaveCount(
    photos.length,
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    `${title} is saved, ready to type up later`,
    { timeout: 30_000 },
  );
}

async function recipeByTitle(title: string) {
  const { data, error } = await adminClient()
    .from("recipes")
    .select("id, status, ingredients, method, recipe_source_images (count)")
    .eq("title", title)
    .single();
  if (error) throw error;
  return data;
}

// Runs at phone size in the "phone" Playwright project, as well as desktop.
test("an admin captures two cards in a row and finds them in the to-type-up list", async ({
  page,
}) => {
  await signInAs(page, "admin");
  const first = uniqueTitle("Grandad's parkin");
  const second = uniqueTitle("Aunt May's scones");

  await page.getByRole("link", { name: "Quick capture" }).click();
  await capture(page, first, ["recipe-card.jpg", "recipe-card-rotated.jpg"]);

  // Saved as needing typing up, with both photos and nothing else.
  const saved = await recipeByTitle(first);
  expect(saved).toMatchObject({
    status: "needs_transcribing",
    ingredients: [],
    method: [],
  });
  expect(saved.recipe_source_images[0].count).toBe(2);

  // "Capture another" gives an empty form.
  await page.getByRole("button", { name: "Capture another" }).click();
  await expect(page.getByLabel("Recipe name")).toHaveValue("");
  await expect(page.getByRole("img", { name: /Chosen photo/ })).toHaveCount(0);
  await capture(page, second, ["recipe-card.jpg"]);

  // Both are waiting to be typed up, oldest first.
  await page.goto("/recipes/to-type-up");
  const list = page.getByRole("list", { name: "Recipes to type up" });
  // The list streams in; wait for it before reading the order.
  await expect(
    list.getByRole("link", { name: new RegExp(second) }),
  ).toBeVisible();
  const titles = await list.getByRole("link").allTextContents();
  const firstAt = titles.findIndex((t) => t.includes(first));
  const secondAt = titles.findIndex((t) => t.includes(second));
  expect(firstAt).toBeGreaterThanOrEqual(0);
  expect(secondAt).toBeGreaterThan(firstAt);
  await expect(
    list.getByRole("link", { name: new RegExp(first) }),
  ).toContainText("2 photos");

  // Each opens the edit form, with the card beside it to type from.
  await list.getByRole("link", { name: new RegExp(first) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Edit ${first}`,
  );
  await expect(
    page.getByRole("region", { name: "The original" }).getByRole("img"),
  ).toHaveCount(2);

  // The recipe page leads with the card until it's typed up.
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first);
  await expect(page.getByText("Not yet typed up")).toBeVisible();
  expect(await page.locator("article h2").allTextContents()).toEqual([
    "The original",
  ]);
  await expect(
    page.getByRole("region", { name: "The original" }).getByRole("img"),
  ).toHaveCount(2);
});

test("quick capture needs a name and at least one photo", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/recipes/capture");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Please give the recipe a name.")).toBeVisible();

  await page.getByLabel("Recipe name").fill(uniqueTitle("No photo yet"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Please add at least one photo of the card."),
  ).toBeVisible();

  // A chosen photo can be removed again before saving.
  await page
    .getByLabel("Choose photos")
    .setInputFiles(fixture("recipe-card.jpg"));
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(page.getByRole("img", { name: /Chosen photo/ })).toHaveCount(0);
});

test("a photo that fails during quick capture can be retried; the recipe is kept", async ({
  page,
}) => {
  await signInAs(page, "admin");
  await page.goto("/recipes/capture");
  const title = uniqueTitle("Shaky signal");

  let failed = false;
  await page.route("**/storage/v1/object/upload/sign/**", async (route) => {
    if (!failed) {
      failed = true;
      return route.abort("connectionfailed");
    }
    return route.continue();
  });

  await page.getByLabel("Recipe name").fill(title);
  await page
    .getByLabel("Choose photos")
    .setInputFiles(fixture("recipe-card.jpg"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "one photo didn't upload",
    { timeout: 20_000 },
  );
  expect((await recipeByTitle(title)).recipe_source_images[0].count).toBe(0);

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page
      .getByRole("list", { name: "Photo uploads" })
      .getByText("Added", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  expect((await recipeByTitle(title)).recipe_source_images[0].count).toBe(1);
});

test("readers can read untranscribed recipes but can't capture or see the list", async ({
  browser,
}) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  await adminPage.goto("/recipes/capture");
  const title = uniqueTitle("Mystery stew");
  await capture(adminPage, title, ["recipe-card.jpg"]);
  await adminPage.getByRole("link", { name: "View this recipe" }).click();
  await expect(adminPage).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  const recipeUrl = adminPage.url();

  const page = await (await browser.newContext()).newPage();
  await signInAs(page, "reader");

  // Listed on the home page, marked as not typed up.
  const listed = page.getByRole("link", { name: new RegExp(title) });
  await expect(listed).toContainText("Not yet typed up");
  await expect(page.getByRole("link", { name: "Quick capture" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: /To type up/ })).toHaveCount(0);

  await page.goto(recipeUrl);
  await expect(page.getByText("Not yet typed up")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "The original" }).getByRole("img"),
  ).toHaveCount(1);

  for (const path of ["/recipes/capture", "/recipes/to-type-up"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We couldn't find that page" }),
    ).toBeVisible();
  }
});
