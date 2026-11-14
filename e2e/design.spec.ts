import { expect, test } from "@playwright/test";

// Checks the readability rules from the design basics on real pages, at both
// phone and desktop sizes (the two Playwright projects).

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  // Measure only once the stylesheet and web fonts have loaded.
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
});

test("body text is at least 18px", async ({ page }) => {
  const size = await page
    .locator("body")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

test("headings use the serif font and body text the readable font", async ({
  page,
}) => {
  const headingFont = await page
    .getByRole("heading", { level: 1 })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  const bodyFont = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(headingFont).toMatch(/Fraunces/i);
  expect(bodyFont).toMatch(/Atkinson/i);
});

test("buttons, inputs and links are at least 44px tall", async ({ page }) => {
  // Only the app's own controls, not the dev server's dev-tools button.
  const targets = page.locator(
    ":is(header, main) :is(button, input:not([type=hidden]), a)",
  );
  const count = await targets.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox();
    expect(box?.height, `target ${i}`).toBeGreaterThanOrEqual(44);
  }
});
