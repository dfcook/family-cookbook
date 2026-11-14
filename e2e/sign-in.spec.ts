import { expect, test } from "@playwright/test";
import {
  allowEmail,
  countEmailsTo,
  deleteProfile,
  getProfileRole,
  getSignInCode,
  requestCode,
  signIn,
  uniqueEmail,
} from "./support/auth";

test("signed-out visitors are sent to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Your email address")).toBeVisible();
});

test("an allowlisted email signs in with a code, stays signed in and can sign out", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("reader");
  await allowEmail(email, "reader");

  await signIn(page, email);
  await expect(page).toHaveURL(/\/$/);

  // The session cookie lasts for months, not just this browser session.
  const authCookies = (await context.cookies()).filter((c) =>
    c.name.includes("auth-token"),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  const days = (authCookies[0].expires * 1000 - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(300);

  await page.reload();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("a wrong code shows a clear message", async ({ page }) => {
  const email = uniqueEmail("wrong-code");
  await allowEmail(email);

  await page.goto("/sign-in");
  await requestCode(page, email);
  const realCode = await getSignInCode(email);
  const wrongCode = realCode === "000000" ? "111111" : "000000";

  await page.getByLabel("Sign-in code").fill(wrongCode);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /That code didn't work/ }),
  ).toBeVisible();
});

test("an email not on the allowlist gets no code and no hint either way", async ({
  page,
}) => {
  const email = uniqueEmail("stranger");

  await page.goto("/sign-in");
  await requestCode(page, email);
  await expect(page.getByRole("status")).toContainText(
    "If " + email + " is on the family list",
  );

  await page.getByLabel("Sign-in code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /That code didn't work/ }),
  ).toBeVisible();

  expect(await countEmailsTo(email)).toBe(0);
});

test("after sign-in you return to the page you asked for", async ({ page }) => {
  const email = uniqueEmail("deep-link");
  await allowEmail(email);

  await page.goto("/somewhere?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsomewhere%3Fx%3D1$/);
  await requestCode(page, email);
  await page.getByLabel("Sign-in code").fill(await getSignInCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/somewhere\?x=1$/);
});

test("a new user's role comes from the allowlist", async ({ page }) => {
  const email = uniqueEmail("admin");
  await allowEmail(email, "admin");

  await signIn(page, email);
  expect(await getProfileRole(email)).toBe("admin");
});

test("a signed-in user without a profile sees a clear message, not a loop", async ({
  page,
}) => {
  const email = uniqueEmail("no-profile");
  await allowEmail(email);
  await signIn(page, email);

  await deleteProfile(email);
  await page.goto("/");
  await expect(page).toHaveURL(/\/no-access$/);
  await expect(page.getByText("doesn't have access")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("a code pasted with a space in it still works", async ({
  page,
}) => {
  const email = uniqueEmail("spaced-code");
  await allowEmail(email);

  await page.goto("/sign-in");
  await requestCode(page, email);
  const code = await getSignInCode(email);
  await page.getByLabel("Sign-in code").fill(`${code.slice(0, 3)} ${code.slice(3)}`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});
