import { describe, expect, test } from "vitest";
import { asRecipeLines, parseLines, toSections } from "./lines";

describe("parseLines", () => {
  test("one item per line, with no headings", () => {
    expect(parseLines("200g plain flour\n100g butter\n1 egg")).toEqual([
      { type: "item", text: "200g plain flour" },
      { type: "item", text: "100g butter" },
      { type: "item", text: "1 egg" },
    ]);
  });

  test("a line ending in a colon is a heading", () => {
    expect(
      parseLines("For the pastry:\n200g flour\nFor the filling:\n3 apples"),
    ).toEqual([
      { type: "heading", text: "For the pastry" },
      { type: "item", text: "200g flour" },
      { type: "heading", text: "For the filling" },
      { type: "item", text: "3 apples" },
    ]);
  });

  test("trims whitespace, including before a trailing colon", () => {
    expect(parseLines("   1 egg   \n\tFor the icing :  \n")).toEqual([
      { type: "item", text: "1 egg" },
      { type: "heading", text: "For the icing" },
    ]);
  });

  test("a colon in the middle of a line is not a heading", () => {
    expect(parseLines("Oven: 180C, gas mark 4\nBake: 20 minutes")).toEqual([
      { type: "item", text: "Oven: 180C, gas mark 4" },
      { type: "item", text: "Bake: 20 minutes" },
    ]);
  });

  test("blank lines are ignored, whatever line endings were used", () => {
    expect(parseLines("\r\n1 egg\r\n\r\n  \r\n2 eggs\n\n")).toEqual([
      { type: "item", text: "1 egg" },
      { type: "item", text: "2 eggs" },
    ]);
  });

  test("a lone colon is kept as an item rather than an empty heading", () => {
    expect(parseLines(":")).toEqual([{ type: "item", text: ":" }]);
  });

  test("empty text gives no lines", () => {
    expect(parseLines("")).toEqual([]);
    expect(parseLines("\n \n")).toEqual([]);
  });
});

describe("toSections", () => {
  test("items before the first heading form an untitled section", () => {
    expect(
      toSections(parseLines("Salt\nFor the sauce:\nCream\nButter")),
    ).toEqual([
      { items: ["Salt"] },
      { heading: "For the sauce", items: ["Cream", "Butter"] },
    ]);
  });

  test("no lines, no sections", () => {
    expect(toSections([])).toEqual([]);
  });
});

describe("asRecipeLines", () => {
  test("keeps well-formed lines and drops anything else", () => {
    expect(
      asRecipeLines([
        { type: "item", text: "Flour" },
        { type: "nonsense", text: "x" },
        "string",
        null,
        { type: "heading", text: "Topping" },
      ]),
    ).toEqual([
      { type: "item", text: "Flour" },
      { type: "heading", text: "Topping" },
    ]);
    expect(asRecipeLines(null)).toEqual([]);
  });
});
