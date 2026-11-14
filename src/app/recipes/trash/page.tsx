import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth";
import { listTrash } from "@/lib/recipes/queries";
import { RestoreRecipe } from "./restore-recipe";

export const metadata: Metadata = { title: "Trash · Family Cookbook" };

// The family is in the UK; render times there, whatever the server's zone.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export default function TrashPage() {
  return (
    <PageLayout width="form">
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <TrashList />
      </Suspense>
    </PageLayout>
  );
}

async function TrashList() {
  await requireAdmin();
  const recipes = await listTrash();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">Trash</h1>
        <p className="text-lg text-ink-muted">
          Deleted recipes, hidden from everyone else. Restore one to bring it
          back exactly as it was.
        </p>
      </div>

      {recipes.length === 0 ? (
        <p className="text-lg">The trash is empty.</p>
      ) : (
        <ul
          aria-label="Deleted recipes"
          className="flex flex-col divide-y divide-line rounded-card border border-line bg-card"
        >
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <span className="text-lg">{recipe.title}</span>
                <span className="text-sm text-ink-muted">
                  Deleted {dateFormat.format(new Date(recipe.deletedAt))}
                </span>
              </div>
              <RestoreRecipe recipeId={recipe.id} title={recipe.title} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="inline-flex min-h-tap items-center self-start">
        Back to all recipes
      </Link>
    </>
  );
}
