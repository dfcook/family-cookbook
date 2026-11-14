import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import {
  adminClient,
  allowEmail,
  anonymousClient,
  signedInClient,
  uniqueEmail,
} from "./support/auth";
import { addRecipe, signInAs, uniqueTitle } from "./support/recipes";

const fixture = (name: string) => join(__dirname, "fixtures", name);

/** The recipe's stored images, oldest first, straight from the database. */
async function storedImages(recipeId: string) {
  const { data, error } = await adminClient()
    .from("recipe_source_images")
    .select("sort_order, images (id, width, height)")
    .eq("recipe_id", recipeId)
    .order("sort_order");
  if (error) throw error;
  return data.map((row) => {
    const image = Array.isArray(row.images) ? row.images[0] : row.images;
    return { sortOrder: row.sort_order, ...image };
  });
}

async function storedFiles(recipeId: string) {
  const supabase = adminClient().storage.from("recipe-images");
  const { data: folders } = await supabase.list(`recipes/${recipeId}`);
  const files: string[] = [];
  for (const folder of folders ?? []) {
    const { data } = await supabase.list(`recipes/${recipeId}/${folder.name}`);
    for (const file of data ?? []) files.push(`${folder.name}/${file.name}`);
  }
  return files.sort();
}

/** Pixel size of a stored JPEG, measured by the browser. */
async function storedImageSize(page: Page, path: string) {
  const { data } = await adminClient()
    .storage.from("recipe-images")
    .download(path);
  if (!data) throw new Error(`Missing ${path}`);
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: "image/jpeg" }),
    );
    return { width: bitmap.width, height: bitmap.height };
  }, base64);
}

const originalSection = (page: Page) =>
  page.getByRole("region", { name: "The original" });

test("an admin adds a photo of the card and it shows on the recipe", async ({
  page,
}) => {
  await signInAs(page, "admin");
  const title = uniqueTitle("Apple pie");
  const recipeId = await addRecipe(page, title);

  await page
    .getByLabel("Choose photos")
    .setInputFiles(fixture("recipe-card.jpg"));
  const uploads = page.getByRole("list", { name: "Photo uploads" });
  await expect(uploads.getByText("Added")).toBeVisible({ timeout: 20_000 });

  // Shown after the story, through a short-lived signed link.
  const image = originalSection(page).getByRole("img");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute(
    "alt",
    `Photo 1 of the original recipe card for ${title}`,
  );
  const src = (await image.getAttribute("src")) ?? "";
  expect(src).toContain("/storage/v1/object/sign/recipe-images/");
  expect(src).toContain("display.jpg");
  expect(src).toContain("token=");
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1600);

  // Three versions are stored; a photo under 2560px keeps its own size.
  const [stored] = await storedImages(recipeId);
  expect(stored).toMatchObject({ width: 2400, height: 1800, sortOrder: 0 });
  expect(await storedFiles(recipeId)).toEqual([
    `${stored.id}/display.jpg`,
    `${stored.id}/original.jpg`,
    `${stored.id}/thumb.jpg`,
  ]);
  const base = `recipes/${recipeId}/${stored.id}`;
  expect(await storedImageSize(page, `${base}/original.jpg`)).toEqual({
    width: 2400,
    height: 1800,
  });
  expect(await storedImageSize(page, `${base}/thumb.jpg`)).toEqual({
    width: 400,
    height: 300,
  });
});

test("several photos can be added at once, and sideways photos are turned upright", async ({
  page,
}) => {
  await signInAs(page, "admin");
  const recipeId = await addRecipe(page, uniqueTitle("Two-card recipe"));

  await page
    .getByLabel("Choose photos")
    .setInputFiles([
      fixture("recipe-card.jpg"),
      fixture("recipe-card-rotated.jpg"),
    ]);
  const uploads = page.getByRole("list", { name: "Photo uploads" });
  await expect(uploads.getByText("Added")).toHaveCount(2, { timeout: 30_000 });
  await expect(originalSection(page).getByRole("img")).toHaveCount(2);

  // The rotated card was stored landscape with an EXIF "turn 90°" tag; it's
  // saved upright, as portrait.
  const stored = await storedImages(recipeId);
  expect(stored.map((s) => [s.sortOrder, s.width, s.height])).toEqual([
    [0, 2400, 1800],
    [1, 1200, 1600],
  ]);
});

test("a failed upload saves nothing and can be retried", async ({ page }) => {
  await signInAs(page, "admin");
  const recipeId = await addRecipe(page, uniqueTitle("Flaky connection"));

  // Fail the first upload of the display version.
  let failed = false;
  await page.route("**/storage/v1/object/upload/sign/**", async (route) => {
    if (!failed && route.request().url().includes("display.jpg")) {
      failed = true;
      return route.abort("connectionfailed");
    }
    return route.continue();
  });

  await page
    .getByLabel("Choose photos")
    .setInputFiles(fixture("recipe-card.jpg"));
  const uploads = page.getByRole("list", { name: "Photo uploads" });
  await expect(uploads.getByText("Not added")).toBeVisible({ timeout: 20_000 });
  await expect(uploads.getByRole("alert")).toContainText("didn't finish");

  // Nothing half-saved: no image record, and stray files are cleaned up.
  expect(await storedImages(recipeId)).toEqual([]);
  await expect.poll(() => storedFiles(recipeId)).toEqual([]);
  await expect(originalSection(page)).toHaveCount(0);

  await uploads.getByRole("button", { name: "Try again" }).click();
  await expect(uploads.getByText("Added")).toBeVisible({ timeout: 20_000 });
  expect(await storedImages(recipeId)).toHaveLength(1);
  await expect(originalSection(page).getByRole("img")).toHaveCount(1);
});

test("a file that isn't a photo gets a clear message", async ({ page }) => {
  await signInAs(page, "admin");
  const recipeId = await addRecipe(page, uniqueTitle("Wrong file"));

  await page
    .getByLabel("Choose photos")
    .setInputFiles(fixture("not-a-photo.jpg"));
  const uploads = page.getByRole("list", { name: "Photo uploads" });
  await expect(uploads.getByRole("alert")).toContainText(
    "isn't a photo we can read",
  );
  // Trying the same file again can't help, so it isn't offered.
  await expect(uploads.getByRole("button", { name: "Try again" })).toHaveCount(
    0,
  );
  expect(await storedImages(recipeId)).toEqual([]);
});

test("readers see the photos but can't add any", async ({ browser }) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signInAs(adminPage, "admin");
  await addRecipe(adminPage, uniqueTitle("Shared card"));
  await adminPage
    .getByLabel("Choose photos")
    .setInputFiles(fixture("recipe-card.jpg"));
  await expect(adminPage.getByText("Added")).toBeVisible({ timeout: 20_000 });
  const recipeUrl = adminPage.url();

  const page = await (await browser.newContext()).newPage();
  await signInAs(page, "reader");
  await page.goto(recipeUrl);
  await expect(originalSection(page).getByRole("img")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Add photos of the original" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Choose photos")).toHaveCount(0);
});

test("storage security: images are private and only admins can upload", async () => {
  const readerEmail = uniqueEmail("storage-reader");
  await allowEmail(readerEmail, "reader");
  const reader = await signedInClient(readerEmail);
  const path = `recipes/${crypto.randomUUID()}/${crypto.randomUUID()}/original.jpg`;
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
    type: "image/jpeg",
  });

  // A reader can neither upload directly nor get an upload link.
  const upload = await reader.storage.from("recipe-images").upload(path, jpeg);
  expect(upload.error).not.toBeNull();
  const signedUpload = await reader.storage
    .from("recipe-images")
    .createSignedUploadUrl(path);
  expect(signedUpload.error).not.toBeNull();

  // A reader can't record an image either.
  const attach = await reader.rpc("attach_source_image", {
    p_recipe_id: crypto.randomUUID(),
    p_image_id: crypto.randomUUID(),
    p_width: 10,
    p_height: 10,
  });
  expect(attach.error).not.toBeNull();

  // An admin can't record an image whose files were never uploaded.
  const adminEmail = uniqueEmail("storage-admin");
  await allowEmail(adminEmail, "admin");
  const admin = await signedInClient(adminEmail);
  const missing = await admin.rpc("attach_source_image", {
    p_recipe_id: crypto.randomUUID(),
    p_image_id: crypto.randomUUID(),
    p_width: 10,
    p_height: 10,
  });
  expect(missing.error?.message).toContain("not fully uploaded");

  // The bucket is private: no public links, and signed-out visitors see nothing.
  const anonymous = anonymousClient().storage.from("recipe-images");
  const { data: publicLink } = anonymous.getPublicUrl(path);
  expect((await fetch(publicLink.publicUrl)).ok).toBe(false);
  const { data: listing } = await anonymous.list("recipes");
  expect(listing ?? []).toEqual([]);
});

test("a full-size 12-megapixel phone photo uploads", async ({ page }) => {
  await signInAs(page, "admin");
  const recipeId = await addRecipe(page, uniqueTitle("Big photo"));

  // Make a 4032x3024 JPEG in the browser. Noise compresses badly, like a real
  // photo, so this is several megabytes: the size that broke uploads from
  // phones when the image was sent through a server action.
  const base64 = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(4032, 3024);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    const pixels = context.createImageData(4032, 3024);
    for (let i = 0; i < pixels.data.length; i++) {
      pixels.data[i] = i % 4 === 3 ? 255 : Math.random() * 256;
    }
    context.putImageData(pixels, 0, 0);
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.92,
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  const buffer = Buffer.from(base64, "base64");
  expect(buffer.length).toBeGreaterThan(3_000_000);

  await page.getByLabel("Choose photos").setInputFiles({
    name: "IMG_0042.jpg",
    mimeType: "image/jpeg",
    buffer,
  });
  const uploads = page.getByRole("list", { name: "Photo uploads" });
  await expect(uploads.getByText("Added", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  // The preservation copy is scaled to 2560px to keep storage costs down.
  const [stored] = await storedImages(recipeId);
  expect(stored).toMatchObject({ width: 2560, height: 1920 });
});
