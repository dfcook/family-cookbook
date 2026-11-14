import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth";
import { listToTypeUp } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "To type up · Family Cookbook" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function ToTypeUpPage() {
  return (
    <PageLayout width="form">
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <ToTypeUpList />
      </Suspense>
    </PageLayout>
  );
}

async function ToTypeUpList() {
  await requireAdmin();
  const recipes = await listToTypeUp();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">To type up</h1>
        <p className="text-lg text-ink-muted">
          Recipes saved with just a photo, oldest first.
        </p>
      </div>

      {recipes.length === 0 ? (
        <p className="text-lg">Nothing waiting. Every recipe is typed up.</p>
      ) : (
        <ol
          aria-label="Recipes to type up"
          className="flex flex-col divide-y divide-line rounded-card border border-line bg-card"
        >
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex min-h-tap flex-col gap-1 px-4 py-3 no-underline"
              >
                <span className="text-lg underline underline-offset-4">
                  {recipe.title}
                </span>
                <span className="text-sm text-ink-muted">
                  Added {dateFormat.format(new Date(recipe.createdAt))} ·{" "}
                  {recipe.photoCount === 1
                    ? "1 photo"
                    : `${recipe.photoCount} photos`}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/recipes/capture"
        className="inline-flex min-h-tap items-center self-start"
      >
        Capture another card
      </Link>
    </>
  );
}
