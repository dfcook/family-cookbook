import { expect, test } from "@playwright/test";
import {
  adminClient,
  allowEmail,
  signedInClient,
  uniqueEmail,
} from "./support/auth";
import { quickCapture, signInAs, uniqueTitle } from "./support/recipes";

async function stored(title: string) {
  const { data, error } = await adminClient()
    .from("recipes")
    .select(
      "id, title, status, ingredients, method, notes, story, created_at, updated_at, deleted_at, recipe_source_images (images (thumb_path))",
    )
    .eq("title", title)
    .single();
  if (error) throw error;
  return data;
}

test("a deleted recipe is hidden from everyone until it's restored", async ({
  browser,
}) => {
  const admin = await (await browser.newContext()).newPage();
  await signInAs(admin, "admin");
  const title = uniqueTitle("Burnt toast");
  await quickCapture(admin, title);
  const before = await stored(title);
  // The test client has no generated types, so it reads the photo as a list.
  const photo = before.recipe_source_images[0]?.images as unknown as {
    thumb_path: string;
  };
  const thumb = photo.thumb_path;

  const reader = await (await browser.newContext()).newPage();
  await signInAs(reader, "reader");
  // A second reader for checks straight against the database.
  const readerEmail = uniqueEmail("trash-reader");
  await allowEmail(readerEmail, "reader");
  const readerDb = await signedInClient(readerEmail);
  await reader.goto(`/recipes/${before.id}`);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(reader.getByRole("button", { name: /Delete/ })).toHaveCount(0);

  // Readers can't delete, even straight to the database.
  const { data: refused } = await readerDb
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", before.id)
    .select("id");
  expect(refused ?? []).toEqual([]);

  // Delete asks first, naming the recipe; cancelling changes nothing.
  await admin.goto(`/recipes/${before.id}`);
  await admin.getByRole("button", { name: "Delete this recipe" }).click();
  const dialog = admin.getByRole("dialog", { name: `Delete “${title}”?` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect((await stored(title)).deleted_at).toBeNull();

  await admin.getByRole("button", { name: "Delete this recipe" }).click();
  await dialog.getByRole("button", { name: "Move to trash" }).click();

  // It's in the trash, with when it was deleted.
  await expect(admin).toHaveURL(/\/recipes\/trash$/);
  const trash = admin.getByRole("list", { name: "Deleted recipes" });
  const entry = trash.getByRole("listitem").filter({ hasText: title });
  await expect(entry).toContainText(/Deleted \d{1,2} \w+ \d{4}/);

  // Nothing was removed: the row and its photos are all still there.
  const deleted = await stored(title);
  expect(deleted.deleted_at).not.toBeNull();
  expect(deleted.recipe_source_images).toHaveLength(2);
  const { data: files } = await adminClient()
    .storage.from("recipe-images")
    .list(`recipes/${before.id}`);
  expect(files).toHaveLength(2);

  // Gone for the admin's own views...
  await admin.goto("/");
  await expect(
    admin
      .getByRole("list", { name: "All recipes" })
      .or(admin.getByText("No recipes yet")),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    admin.getByRole("link", { name: new RegExp(title) }),
  ).toHaveCount(0);
  await expect(
    admin.getByRole("link", { name: /^Trash \(\d+\)$/ }),
  ).toBeVisible();
  await admin.goto("/recipes/to-type-up");
  await expect(
    admin.getByRole("heading", { name: "To type up" }),
  ).toBeVisible();
  await expect(
    admin.getByRole("link", { name: new RegExp(title) }),
  ).toHaveCount(0);
  for (const path of [`/recipes/${before.id}`, `/recipes/${before.id}/edit`]) {
    await admin.goto(path);
    await expect(
      admin.getByRole("heading", { name: "We couldn't find that page" }),
    ).toBeVisible();
  }

  // ...and for readers, enforced by the database: no recipe, no photo links,
  // no photo files.
  await reader.goto("/");
  await expect(
    reader
      .getByRole("list", { name: "All recipes" })
      .or(reader.getByText("No recipes yet")),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    reader.getByRole("link", { name: new RegExp(title) }),
  ).toHaveCount(0);
  await reader.goto(`/recipes/${before.id}`);
  await expect(
    reader.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeVisible();
  await reader.goto("/recipes/trash");
  await expect(
    reader.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeVisible();

  const { data: rows } = await readerDb
    .from("recipes")
    .select("id")
    .eq("id", before.id);
  expect(rows).toEqual([]);
  const { data: links } = await readerDb
    .from("recipe_source_images")
    .select("image_id")
    .eq("recipe_id", before.id);
  expect(links).toEqual([]);
  const { error: signError } = await readerDb.storage
    .from("recipe-images")
    .createSignedUrl(thumb, 60);
  expect(signError).not.toBeNull();

  // Restore brings it back exactly as it was.
  await admin.goto("/recipes/trash");
  await admin.getByRole("button", { name: `Restore ${title}` }).click();
  await expect(admin).toHaveURL(new RegExp(`/recipes/${before.id}$`));
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(title);
  const { deleted_at, ...restored } = await stored(title);
  const { deleted_at: _, ...original } = before;
  expect(deleted_at).toBeNull();
  expect(restored).toEqual(original);

  await reader.goto(`/recipes/${before.id}`);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(
    reader.getByRole("region", { name: "The original" }).getByRole("img"),
  ).toHaveCount(2);
});
