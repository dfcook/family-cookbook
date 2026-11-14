/**
 * Which picture a recipe's card shows on the home grid: the photo of the
 * finished dish if there is one, otherwise the first photo of the original
 * card, otherwise none (the card is drawn as text).
 */
export function chooseCardImage(recipe: {
  dishThumbPath?: string | null;
  sourceThumbPaths: readonly string[];
}): { kind: "dish" | "original"; path: string } | null {
  if (recipe.dishThumbPath) return { kind: "dish", path: recipe.dishThumbPath };
  const first = recipe.sourceThumbPaths[0];
  return first ? { kind: "original", path: first } : null;
}

const collator = new Intl.Collator("en-GB", {
  sensitivity: "base",
  numeric: true,
});

/** Title order as a person would file them: ignoring case and accents. */
export function byTitle(a: { title: string }, b: { title: string }) {
  return collator.compare(a.title, b.title);
}
