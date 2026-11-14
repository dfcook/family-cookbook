import { describe, expect, it } from "vitest";
import { byTitle, chooseCardImage } from "./card-image";

describe("chooseCardImage", () => {
  it("prefers the dish photo", () => {
    expect(
      chooseCardImage({
        dishThumbPath: "dish/thumb.jpg",
        sourceThumbPaths: ["card/thumb.jpg"],
      }),
    ).toEqual({ kind: "dish", path: "dish/thumb.jpg" });
  });

  it("falls back to the first photo of the original", () => {
    expect(
      chooseCardImage({
        dishThumbPath: null,
        sourceThumbPaths: ["first/thumb.jpg", "second/thumb.jpg"],
      }),
    ).toEqual({ kind: "original", path: "first/thumb.jpg" });
  });

  it("has no picture when there are no photos", () => {
    expect(chooseCardImage({ sourceThumbPaths: [] })).toBeNull();
  });
});

describe("byTitle", () => {
  it("sorts ignoring case and accents, with numbers in order", () => {
    const titles = ["scones", "Apple pie", "Éclairs", "Bread 10", "Bread 2"];
    expect(
      titles
        .map((title) => ({ title }))
        .sort(byTitle)
        .map((r) => r.title),
    ).toEqual(["Apple pie", "Bread 2", "Bread 10", "Éclairs", "scones"]);
  });
});
