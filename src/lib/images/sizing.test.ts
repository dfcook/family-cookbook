import { describe, expect, test } from "vitest";
import { fitWithin, looksLikeHeic, recipeImagePath, VARIANTS } from "./sizing";

describe("fitWithin", () => {
  test("shrinks a landscape photo so its long edge fits", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, VARIANTS.display)).toEqual({
      width: 1600,
      height: 1200,
    });
  });

  test("shrinks a portrait photo by its height", () => {
    expect(fitWithin({ width: 3000, height: 4000 }, VARIANTS.thumb)).toEqual({
      width: 300,
      height: 400,
    });
  });

  test("never enlarges a small image", () => {
    expect(fitWithin({ width: 800, height: 600 }, VARIANTS.display)).toEqual({
      width: 800,
      height: 600,
    });
  });

  test("keeps a normal phone photo at full resolution as the original", () => {
    expect(fitWithin({ width: 4032, height: 3024 }, VARIANTS.original)).toEqual(
      {
        width: 4032,
        height: 3024,
      },
    );
  });

  test("scales a very large original down to the canvas pixel limit", () => {
    const size = fitWithin({ width: 8064, height: 6048 }, VARIANTS.original);
    expect(size.width * size.height).toBeLessThanOrEqual(16_000_000);
    // Aspect ratio is kept (4:3).
    expect(size.width / size.height).toBeCloseTo(4 / 3, 2);
  });

  test("a very thin image never rounds down to zero", () => {
    expect(fitWithin({ width: 10_000, height: 2 }, VARIANTS.thumb)).toEqual({
      width: 400,
      height: 1,
    });
  });

  test("rejects an empty image", () => {
    expect(() =>
      fitWithin({ width: 0, height: 100 }, VARIANTS.thumb),
    ).toThrow();
  });
});

describe("recipeImagePath", () => {
  test("puts each version in the image's own folder", () => {
    expect(recipeImagePath("r1", "i1", "display")).toBe(
      "recipes/r1/i1/display.jpg",
    );
  });
});

describe("looksLikeHeic", () => {
  test.each([
    [{ type: "image/heic", name: "IMG_0001.HEIC" }, true],
    [{ type: "", name: "card.heif" }, true],
    [{ type: "image/jpeg", name: "card.jpg" }, false],
    [{ type: "image/png", name: "heic-notes.png" }, false],
  ])("%o is HEIC: %s", (file, expected) => {
    expect(looksLikeHeic(file)).toBe(expected);
  });
});
