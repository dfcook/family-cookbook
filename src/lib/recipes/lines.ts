/**
 * Ingredients and method are typed as plain text, one item per line, which is
 * much faster than filling in a row per item when transcribing a binder.
 * A line ending in a colon ("For the pastry:") becomes a section heading.
 */
export type RecipeLine = { type: "heading" | "item"; text: string };

export function parseLines(text: string): RecipeLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Only a colon at the very end makes a heading, and it needs words
      // before it: "Bake at 180C: 20 minutes" and ":" stay as items.
      if (line.endsWith(":") && line.length > 1) {
        return { type: "heading", text: line.slice(0, -1).trim() };
      }
      return { type: "item", text: line };
    });
}

/** Groups lines into sections: optional heading plus the items under it. */
export function toSections(lines: RecipeLine[]) {
  const sections: { heading?: string; items: string[] }[] = [];
  for (const line of lines) {
    if (line.type === "heading") {
      sections.push({ heading: line.text, items: [] });
    } else {
      if (sections.length === 0) sections.push({ items: [] });
      sections[sections.length - 1].items.push(line.text);
    }
  }
  return sections;
}

/** Narrows untyped JSON from the database to recipe lines. */
export function asRecipeLines(value: unknown): RecipeLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (line): line is RecipeLine =>
      typeof line === "object" &&
      line !== null &&
      (line.type === "heading" || line.type === "item") &&
      typeof line.text === "string",
  );
}
