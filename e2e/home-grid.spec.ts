import { expect, type Page, test } from "@playwright/test";
import {
  addRecipe,
  quickCapture,
  signInAs,
  uniqueTitle,
} from "./support/recipes";

// The home grid is long-lived data shared by every test, so these find their
// own recipes by unique titles rather than counting cards.

const grid = (page: Page) => page.getByRole("list", { name: "All recipes" });

/** The home page streams in; under a busy test run it can take a while. */
async function homeLoaded(page: Page) {
  await expect(grid(page).or(page.getByText("No recipes yet"))).toBeVisible({
    timeout: 15_000,
  });
}
const card = (page: Page, title: string) =>
  grid(page).getByRole("link", { name: new RegExp(title) });

test("the home grid shows each recipe's picture, or its title on a text card", async ({
  browser,
}, testInfo) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  // A shared prefix keeps the three together, so their order can be checked.
  const prefix = uniqueTitle("Grid");
  const withPhotos = `${prefix} a with photos`;
  const textOnly = `${prefix} B text only`;
  await quickCapture(adminPage, withPhotos);
  await addRecipe(adminPage, textOnly);

  // Seen as a reader: what the family sees.
  const page = await (await browser.newContext()).newPage();
  await signInAs(page, "reader");
  await expect(card(page, withPhotos)).toBeVisible();

  // No dish photo yet (that's #10), so the first photo of the original shows,
  // as a thumbnail through a signed link.
  const photoCard = card(page, withPhotos);
  await expect(photoCard).toHaveAttribute("data-card-image", "original");
  const img = photoCard.locator("img");
  await expect(img).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/.*\/thumb\.jpg\?token=/,
  );
  // Pictures load lazily, as each card scrolls into view.
  await img.scrollIntoViewIfNeeded();
  await expect(img).toHaveJSProperty("complete", true);
  expect(
    await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(photoCard).toContainText("Not yet typed up");

  // No photos at all: a text-only card, with no picture and no marker.
  const textCard = card(page, textOnly);
  await expect(textCard).toHaveAttribute("data-card-image", "none");
  await expect(textCard.locator("img")).toHaveCount(0);
  await expect(textCard).not.toContainText("Not yet typed up");

  // Sorted by title, ignoring case.
  const titles = await grid(page).getByRole("link").allTextContents();
  const mine = titles.filter((t) => t.includes(prefix));
  expect(mine.map((t) => (t.includes("photos") ? "photos" : "text"))).toEqual([
    "photos",
    "text",
  ]);

  // One column on phones, several side by side on wider screens.
  const allCards = grid(page).getByRole("listitem");
  const [a, b] = await Promise.all([
    allCards.nth(0).boundingBox(),
    allCards.nth(1).boundingBox(),
  ]);
  if (!a || !b) throw new Error("cards not laid out");
  if (testInfo.project.name === "desktop") {
    expect(b.y).toBe(a.y);
    expect(b.x).toBeGreaterThan(a.x);
  } else {
    expect(b.x).toBe(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  }

  await textCard.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(textOnly);
});

test("only admins see the ways to add recipes", async ({ browser }) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  await homeLoaded(adminPage);
  const add = adminPage.getByRole("navigation", { name: "Add recipes" });
  await expect(add.getByRole("link", { name: "Quick capture" })).toBeVisible();
  await expect(add.getByRole("link", { name: "Add a recipe" })).toBeVisible();

  const page = await (await browser.newContext()).newPage();
  await signInAs(page, "reader");
  await expect(grid(page).or(page.getByText("No recipes yet"))).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Add recipes" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Quick capture" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Add a recipe" })).toHaveCount(0);
});
