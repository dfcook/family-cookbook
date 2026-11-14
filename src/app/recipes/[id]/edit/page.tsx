import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth";
import { linesToText } from "@/lib/recipes/lines";
import { getRecipe } from "@/lib/recipes/queries";
import { updateRecipe } from "../../actions";
import { RecipeForm } from "../../recipe-form";
import { TheOriginal } from "../the-original";

export const metadata: Metadata = { title: "Edit recipe · Family Cookbook" };

export default function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  return (
    <PageLayout>
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <EditRecipe params={params} />
      </Suspense>
    </PageLayout>
  );
}

async function EditRecipe({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const hasPhotos = recipe.sourceImages.length > 0;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">Edit {recipe.title}</h1>
        {recipe.status === "needs_transcribing" && (
          <p className="text-lg text-ink-muted">
            Type it up from the card, then tick &ldquo;Fully typed up&rdquo;.
          </p>
        )}
      </div>

      {/* On a wide screen the card sits beside the form and stays in view,
          so it can be copied line by line. */}
      <div
        className={
          hasPhotos
            ? "grid gap-8 lg:grid-cols-2 lg:items-start"
            : "mx-auto w-full max-w-form"
        }
      >
        {hasPhotos && (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <TheOriginal recipe={recipe} />
          </div>
        )}
        <RecipeForm
          // A fresh form whenever the recipe changes: Next keeps visited
          // pages alive, and an old form would otherwise show old text.
          key={recipe.updated_at}
          action={updateRecipe.bind(null, recipe.id)}
          initialValues={{
            title: recipe.title,
            ingredients: linesToText(recipe.ingredients),
            method: linesToText(recipe.method),
            notes: recipe.notes ?? "",
            story: recipe.story ?? "",
            typedUp: recipe.status === "complete",
          }}
          submitLabel="Save changes"
          cancelHref={`/recipes/${recipe.id}`}
          showTypedUp
        />
      </div>
    </>
  );
}
