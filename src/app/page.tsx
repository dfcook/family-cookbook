import Link from "next/link";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { getCurrentUser } from "@/lib/auth";
import { listRecipes } from "@/lib/recipes/queries";

export default function Home() {
  return (
    <PageLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Recipes</h1>
        <Suspense>
          <AddRecipeLink />
        </Suspense>
      </div>
      <Suspense fallback={<p className="text-ink-muted">Loading recipes…</p>}>
        <RecipeList />
      </Suspense>
    </PageLayout>
  );
}

async function AddRecipeLink() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  return (
    <Link
      href="/recipes/new"
      className="inline-flex min-h-tap items-center rounded-control bg-accent px-5 font-semibold text-on-accent no-underline hover:bg-accent-strong hover:text-on-accent"
    >
      Add a recipe
    </Link>
  );
}

// A simple list for now; the card grid comes later.
async function RecipeList() {
  const recipes = await listRecipes();

  if (recipes.length === 0) {
    return (
      <p className="text-lg text-ink-muted">
        No recipes yet. They&apos;ll appear here as they&apos;re added.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-card">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex min-h-tap items-center px-4 py-3 text-lg"
          >
            {recipe.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
