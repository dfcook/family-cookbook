// Runs in the browser: turns a chosen photo into the three JPEG versions we
// store, before anything is uploaded. This keeps uploads small on slow phone
// connections and means the server never has to process images.

import {
  fitWithin,
  looksLikeHeic,
  type Size,
  VARIANTS,
  type Variant,
} from "./sizing";

export type ProcessedImage = Size & Record<Variant, Blob>;

export class UnreadableImageError extends Error {
  constructor() {
    super(
      "This file isn't a photo we can read. Please choose a JPEG, PNG or HEIC photo.",
    );
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // "from-image" applies the EXIF orientation, so sideways phone photos
    // come out the right way up.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (!looksLikeHeic(file)) throw new UnreadableImageError();
  }

  // Most browsers other than Safari can't open iPhone HEIC photos, so convert
  // them first. The converter is large, so it's only loaded when needed.
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.95,
    });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return await createImageBitmap(jpeg, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadableImageError();
  }
}

async function encode(
  bitmap: ImageBitmap,
  size: Size,
  quality: number,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the image");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await decode(file);
  try {
    const source = { width: bitmap.width, height: bitmap.height };
    const sizes = {
      original: fitWithin(source, VARIANTS.original),
      display: fitWithin(source, VARIANTS.display),
      thumb: fitWithin(source, VARIANTS.thumb),
    };
    const [original, display, thumb] = await Promise.all(
      (["original", "display", "thumb"] as const).map((variant) =>
        encode(bitmap, sizes[variant], VARIANTS[variant].quality),
      ),
    );
    return { ...sizes.original, original, display, thumb };
  } finally {
    bitmap.close();
  }
}
