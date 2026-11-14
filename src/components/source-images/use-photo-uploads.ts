"use client";

import { useCallback, useRef, useState } from "react";
import {
  attachSourceImage,
  discardSourceImageUpload,
  prepareSourceImageUpload,
} from "@/app/recipes/source-image-actions";
import { processImage, UnreadableImageError } from "@/lib/images/process";
import type { Variant } from "@/lib/images/sizing";
import { uploadToSignedUrl } from "@/lib/images/upload";

export type PhotoUpload = {
  key: string;
  file: File;
  recipeId: string;
  status: "waiting" | "preparing" | "uploading" | "saving" | "done" | "failed";
  progress: number; // 0 to 1
  error?: string;
  /** Which step failed and why, shown under "Details" to help fix problems. */
  detail?: string;
  /** False when trying again can't help, e.g. the file isn't a photo. */
  retryable?: boolean;
};

const VARIANTS: Variant[] = ["original", "display", "thumb"];

/**
 * Adds photos of an original card to a recipe: prepares each photo in the
 * browser, uploads its three versions, then records it. Photos go one at a
 * time, which keeps memory use down on phones with large photos.
 */
export function usePhotoUploads({
  onUploaded,
}: {
  onUploaded?: () => void;
} = {}) {
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const update = useCallback((key: string, changes: Partial<PhotoUpload>) => {
    setUploads((current) =>
      current.map((u) => (u.key === key ? { ...u, ...changes } : u)),
    );
  }, []);

  const run = useCallback(
    async ({ key, file, recipeId }: PhotoUpload): Promise<boolean> => {
      update(key, {
        status: "preparing",
        progress: 0,
        error: undefined,
        detail: undefined,
      });
      let imageId: string | undefined;
      let step = "preparing the photo";
      try {
        const image = await processImage(file);
        step = "starting the upload";
        const prepared = await prepareSourceImageUpload(recipeId);
        if (!prepared.ok) throw new Error(prepared.error);
        imageId = prepared.imageId;

        step = "uploading";
        update(key, { status: "uploading" });
        const total = VARIANTS.reduce((n, v) => n + image[v].size, 0);
        const loaded: Record<Variant, number> = {
          original: 0,
          display: 0,
          thumb: 0,
        };
        await Promise.all(
          VARIANTS.map((variant) =>
            uploadToSignedUrl(
              prepared.urls[variant],
              image[variant],
              (bytes) => {
                loaded[variant] = bytes;
                update(key, {
                  progress: VARIANTS.reduce((n, v) => n + loaded[v], 0) / total,
                });
              },
            ),
          ),
        );

        step = "saving the photo";
        update(key, { status: "saving", progress: 1 });
        // Only the size: the files are already uploaded. (Passing the image
        // itself sent megabytes of photo through the server action, over its
        // 1 MB limit, so real phone photos failed.)
        const attached = await attachSourceImage(recipeId, prepared.imageId, {
          width: image.width,
          height: image.height,
        });
        if (!attached.ok) throw new Error(attached.error);

        update(key, { status: "done" });
        onUploaded?.();
        return true;
      } catch (error) {
        if (imageId) void discardSourceImageUpload(recipeId, imageId);
        const unreadable = error instanceof UnreadableImageError;
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`Photo upload failed while ${step}:`, error);
        update(key, {
          status: "failed",
          detail: `Failed while ${step}: ${reason}`,
          retryable: !unreadable,
          error: unreadable
            ? error.message
            : "The upload didn't finish. Check your connection and try again.",
        });
        return false;
      }
    },
    [update, onUploaded],
  );

  /** Queues photos for a recipe. Resolves with how many were added. */
  const add = useCallback(
    (recipeId: string, files: File[]): Promise<number> => {
      const added: PhotoUpload[] = files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        recipeId,
        status: "waiting",
        progress: 0,
      }));
      setUploads((current) => [...current, ...added]);

      let succeeded = 0;
      const done = added.reduce(
        (previous, upload) =>
          previous.then(async () => {
            if (await run(upload)) succeeded++;
          }),
        queue.current,
      );
      queue.current = done;
      return done.then(() => succeeded);
    },
    [run],
  );

  const retry = useCallback(
    (key: string) => {
      const upload = uploads.find((u) => u.key === key);
      if (upload) void run(upload);
    },
    [uploads, run],
  );

  const clear = useCallback(() => setUploads([]), []);

  return { uploads, add, retry, clear };
}
