import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { type RecipeLine, toSections } from "@/lib/recipes/lines";
import { getRecipe } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Recipe · Family Cookbook" };

export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <PageLayout width="form">
      <Suspense fallback={<p className="text-ink-muted">Loading the recipe…</p>}>
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
    <article className="flex flex-col gap-8">
      <h1 className="text-4xl">{recipe.title}</h1>

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
          <p className="font-heading text-lg whitespace-pre-line">{recipe.story}</p>
        </section>
      )}
    </article>
  );
}

function Ingredients({ lines }: { lines: RecipeLine[] }) {
  return (
    <div className="flex flex-col gap-4">
      {toSections(lines).map((section, i) => (
        <div key={i} className="flex flex-col gap-1">
          {section.heading && <h3 className="text-lg">{section.heading}</h3>}
          <ul className="list-disc space-y-1 pl-6 marker:text-ink-muted">
            {section.items.map((item, j) => (
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
          <div key={i} className="flex flex-col gap-1">
            {section.heading && <h3 className="text-lg">{section.heading}</h3>}
            <ol start={start} className="list-decimal space-y-3 pl-7 marker:font-semibold">
              {section.items.map((item, j) => (
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
