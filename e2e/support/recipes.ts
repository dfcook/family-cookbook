import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { allowEmail, signIn, uniqueEmail } from "./auth";

export async function signInAs(page: Page, role: "admin" | "reader") {
  const email = uniqueEmail(role);
  await allowEmail(email, role);
  await signIn(page, email);
  return email;
}

export function uniqueTitle(name: string) {
  return `${name} ${Math.random().toString(36).slice(2, 7)}`;
}

/** Adds a recipe through the UI (as an admin) and returns its id. */
export async function addRecipe(page: Page, title: string) {
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe name").fill(title);
  await page.getByLabel("Ingredients").fill("Flour\nButter");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() as string;
}

/** Saves a recipe by quick capture (as an admin), with two card photos. */
export async function quickCapture(page: Page, title: string) {
  await page.goto("/recipes/capture");
  await page.getByRole("textbox", { name: "Recipe name" }).fill(title);
  await page
    .getByLabel("Choose photos")
    .setInputFiles(
      ["recipe-card.jpg", "recipe-card-rotated.jpg"].map((name) =>
        join(__dirname, "..", "fixtures", name),
      ),
    );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("is saved", {
    timeout: 30_000,
  });
}
