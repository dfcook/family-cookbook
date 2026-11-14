import Link from "next/link";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { getCurrentUser } from "@/lib/auth";
import { listRecipes, listToTypeUp, listTrash } from "@/lib/recipes/queries";
import { RecipeCard } from "./recipe-card";

export default function Home() {
  return (
    <PageLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Recipes</h1>
        <Suspense>
          <AdminLinks />
        </Suspense>
      </div>
      <Suspense fallback={<p className="text-ink-muted">Loading recipes…</p>}>
        <RecipeGrid />
      </Suspense>
    </PageLayout>
  );
}

const primaryLink =
  "inline-flex min-h-tap items-center justify-center rounded-control bg-accent px-5 font-semibold text-on-accent no-underline hover:bg-accent-strong hover:text-on-accent";
const secondaryLink =
  "inline-flex min-h-tap items-center justify-center rounded-control border-2 border-ink bg-card px-5 font-semibold text-ink no-underline hover:bg-paper hover:text-ink";

async function AdminLinks() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  const [toTypeUp, inTrash] = await Promise.all([
    listToTypeUp().then((recipes) => recipes.length),
    listTrash().then((recipes) => recipes.length),
  ]);
  return (
    <nav aria-label="Add recipes" className="flex flex-wrap gap-3">
      <Link href="/recipes/capture" className={primaryLink}>
        Quick capture
      </Link>
      <Link href="/recipes/new" className={secondaryLink}>
        Add a recipe
      </Link>
      {toTypeUp > 0 && (
        <Link href="/recipes/to-type-up" className={secondaryLink}>
          To type up ({toTypeUp})
        </Link>
      )}
      {inTrash > 0 && (
        <Link href="/recipes/trash" className={secondaryLink}>
          Trash ({inTrash})
        </Link>
      )}
    </nav>
  );
}

async function RecipeGrid() {
  const recipes = await listRecipes();

  if (recipes.length === 0) {
    return (
      <p className="text-lg text-ink-muted">
        No recipes yet. They&apos;ll appear here as they&apos;re added.
      </p>
    );
  }

  return (
    <ul
      aria-label="All recipes"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {recipes.map((recipe, i) => (
        <li key={recipe.id}>
          {/* The first row is in view straight away; the rest load on scroll. */}
          <RecipeCard recipe={recipe} eager={i < 3} />
        </li>
      ))}
    </ul>
  );
}
