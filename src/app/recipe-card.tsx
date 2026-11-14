import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/recipes/queries";

/** A recipe on the home grid: its picture, title and typed-up marker. */
export function RecipeCard({
  recipe,
  eager = false,
}: {
  recipe: RecipeSummary;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      data-card-image={recipe.image?.kind ?? "none"}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-card text-ink no-underline shadow-sm transition-shadow hover:text-ink hover:shadow-md"
    >
      <div className="relative aspect-4/3 border-b border-line bg-paper">
        {recipe.image ? (
          // Signed, short-lived URLs: skip Next's image optimiser, which
          // would cache private photos under URLs that change anyway.
          // The title below names the link, so the picture is decorative.
          <Image
            src={recipe.image.url}
            alt=""
            fill
            unoptimized
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 64rem) 21rem, (min-width: 40rem) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <TextCardFace title={recipe.title} />
        )}
      </div>
      <div className="flex flex-1 flex-col items-start gap-2 p-4">
        <span className="font-heading text-xl group-hover:underline">
          {recipe.title}
        </span>
        {recipe.status === "needs_transcribing" && (
          <span className="rounded-control border border-field px-2 text-sm text-ink-muted">
            Not yet typed up
          </span>
        )}
      </div>
    </Link>
  );
}

/** No photos yet: the title written on a ruled index card. */
function TextCardFace({ title }: { title: string }) {
  // Rules every 2rem and a 2rem line height, so the title sits on the lines.
  return (
    <div
      aria-hidden="true"
      className="h-full bg-card bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(2rem-1px),var(--color-line)_calc(2rem-1px),var(--color-line)_2rem)] px-6 pt-16"
    >
      <span className="line-clamp-3 font-heading text-2xl/8 text-accent italic">
        {title}
      </span>
    </div>
  );
}
