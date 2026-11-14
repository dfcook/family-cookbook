import Image from "next/image";
import type { Recipe } from "@/lib/recipes/queries";

/** The photos of the original card, in order. */
export function TheOriginal({
  recipe,
  sideBySide = false,
}: {
  recipe: Pick<Recipe, "title" | "sourceImages">;
  /** On a wide screen, put several photos next to each other. */
  sideBySide?: boolean;
}) {
  if (recipe.sourceImages.length === 0) return null;
  return (
    <section aria-labelledby="original" className="flex flex-col gap-4">
      <h2 id="original" className="text-2xl">
        The original
      </h2>
      <div
        className={
          sideBySide && recipe.sourceImages.length > 1
            ? "grid items-start gap-4 lg:grid-cols-2"
            : "flex flex-col gap-4"
        }
      >
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
              className="h-auto max-h-[85vh] w-auto max-w-full rounded-card border border-line bg-card"
            />
            {image.caption && (
              <figcaption className="text-ink-muted">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
