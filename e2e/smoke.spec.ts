import { expect, test } from "@playwright/test";

test("sign-in page loads", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: "Family Cookbook" }),
  ).toBeVisible();
});

test("site asks search engines not to index it", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(/Disallow: \/\s*$/m);
});
