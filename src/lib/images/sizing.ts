/**
 * Every photo of an original card is saved in three sizes. The "original" is
 * the preservation copy: 2560px on the long edge keeps handwriting sharp
 * (about 500 pixels per inch for a card that fills the frame) at around a
 * fifth of the size of a full 12 MP phone photo, so the collection fits in
 * free storage tiers. The others are for showing on screen.
 */
export type Variant = "original" | "display" | "thumb";

export type VariantSpec = {
  /** Longest side, in pixels. */
  maxEdge: number;
  /** Total pixels. iOS Safari can't draw canvases much over 16.7 million. */
  maxPixels: number;
  /** JPEG quality, 0 to 1. */
  quality: number;
};

export const VARIANTS: Record<Variant, VariantSpec> = {
  original: { maxEdge: 2560, maxPixels: 16_000_000, quality: 0.85 },
  display: { maxEdge: 1600, maxPixels: 16_000_000, quality: 0.85 },
  thumb: { maxEdge: 400, maxPixels: 16_000_000, quality: 0.8 },
};

export type Size = { width: number; height: number };

/**
 * The largest size that keeps the aspect ratio and fits the limits.
 * Never enlarges a small image.
 */
export function fitWithin(
  { width, height }: Size,
  { maxEdge, maxPixels }: Pick<VariantSpec, "maxEdge" | "maxPixels">,
): Size {
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid image size ${width}x${height}`);
  }
  const edgeScale = maxEdge / Math.max(width, height);
  const pixelScale = Math.sqrt(maxPixels / (width * height));
  const scale = Math.min(1, edgeScale, pixelScale);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/** Where an image's files live in storage. Mirrors recipe_image_path() in SQL. */
export function recipeImagePath(
  recipeId: string,
  imageId: string,
  variant: Variant,
): string {
  return `recipes/${recipeId}/${imageId}/${variant}.jpg`;
}

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

/** HEIC is the iPhone's photo format, which most browsers can't open. */
export function looksLikeHeic(file: { type: string; name: string }): boolean {
  return (
    HEIC_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name)
  );
}
