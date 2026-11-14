import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { getCurrentUser } from "@/lib/auth";
import { type RecipeLine, toSections } from "@/lib/recipes/lines";
import { getRecipe, type Recipe } from "@/lib/recipes/queries";
import { SourceImageUploader } from "./source-image-uploader";

export const metadata: Metadata = { title: "Recipe · Family Cookbook" };

export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <PageLayout width="form">
      <Suspense
        fallback={<p className="text-ink-muted">Loading the recipe…</p>}
      >
        <RecipeDetails params={params} />
      </Suspense>
    </PageLayout>
  );
}

async function RecipeDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <>
      <RecipeArticle recipe={recipe} />
      {/* Tools for changing the recipe sit outside the recipe itself. */}
      <Suspense>
        <AdminTools recipeId={recipe.id} />
      </Suspense>
    </>
  );
}

function RecipeArticle({ recipe }: { recipe: Recipe }) {
  // Saved by quick capture: the card itself is the recipe for now, so show it
  // first and big.
  const untranscribed = recipe.status === "needs_transcribing";
  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl">{recipe.title}</h1>
        {untranscribed && <NotYetTypedUp />}
      </div>

      {untranscribed && <TheOriginal recipe={recipe} />}

      {recipe.ingredients.length > 0 && (
        <section aria-labelledby="ingredients" className="flex flex-col gap-3">
          <h2 id="ingredients" className="text-2xl">
            Ingredients
          </h2>
          <Ingredients lines={recipe.ingredients} />
        </section>
      )}

      {recipe.method.length > 0 && (
        <section aria-labelledby="method" className="flex flex-col gap-3">
          <h2 id="method" className="text-2xl">
            Method
          </h2>
          <Method lines={recipe.method} />
        </section>
      )}

      {recipe.notes && (
        <section aria-labelledby="notes" className="flex flex-col gap-3">
          <h2 id="notes" className="text-2xl">
            Notes
          </h2>
          <p className="whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {recipe.story && (
        <section
          aria-labelledby="story"
          className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"
        >
          <h2 id="story" className="text-2xl">
            The story
          </h2>
          <p className="font-heading text-lg whitespace-pre-line">
            {recipe.story}
          </p>
        </section>
      )}

      {!untranscribed && <TheOriginal recipe={recipe} />}
    </article>
  );
}

function NotYetTypedUp() {
  return (
    <p className="self-start rounded-control border border-field bg-card px-3 py-1 text-sm font-semibold text-ink-muted">
      Not yet typed up: read it from the card below
    </p>
  );
}

function TheOriginal({ recipe }: { recipe: Recipe }) {
  if (recipe.sourceImages.length === 0) return null;
  return (
    <section aria-labelledby="original" className="flex flex-col gap-4">
      <h2 id="original" className="text-2xl">
        The original
      </h2>
      {recipe.sourceImages.map((image, i) => (
        <figure key={image.id} className="flex flex-col gap-2">
          {/* Signed, short-lived URLs: skip Next's image optimiser, which
              would cache private photos under URLs that change anyway. */}
          <Image
            src={image.url}
            alt={
              image.caption ??
              `Photo ${i + 1} of the original recipe card for ${recipe.title}`
            }
            width={image.width}
            height={image.height}
            unoptimized
            className="h-auto w-full rounded-card border border-line bg-card"
          />
          {image.caption && (
            <figcaption className="text-ink-muted">{image.caption}</figcaption>
          )}
        </figure>
      ))}
    </section>
  );
}

async function AdminTools({ recipeId }: { recipeId: string }) {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  return <SourceImageUploader recipeId={recipeId} />;
}

function Ingredients({ lines }: { lines: RecipeLine[] }) {
  return (
    <div className="flex flex-col gap-4">
      {toSections(lines).map((section, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list from the saved recipe, never reordered or edited in place
        <div key={i} className="flex flex-col gap-1">
          {section.heading && <h3 className="text-lg">{section.heading}</h3>}
          <ul className="list-disc space-y-1 pl-6 marker:text-ink-muted">
            {section.items.map((item, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list from the saved recipe, never reordered or edited in place
              <li key={j}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Method({ lines }: { lines: RecipeLine[] }) {
  // Step numbers carry on across sections, so "step 5" is unambiguous.
  const sections = toSections(lines);
  const starts = sections.map(
    (_, i) => 1 + sections.slice(0, i).reduce((n, s) => n + s.items.length, 0),
  );
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section, i) => {
        const start = starts[i];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list from the saved recipe, never reordered or edited in place
          <div key={i} className="flex flex-col gap-1">
            {section.heading && <h3 className="text-lg">{section.heading}</h3>}
            <ol
              start={start}
              className="list-decimal space-y-3 pl-7 marker:font-semibold"
            >
              {section.items.map((item, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list from the saved recipe, never reordered or edited in place
                <li key={j} className="pl-1">
                  {item}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
