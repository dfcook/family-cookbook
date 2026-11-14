"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { processImage, UnreadableImageError } from "@/lib/images/process";
import type { Variant } from "@/lib/images/sizing";
import { uploadToSignedUrl } from "@/lib/images/upload";
import {
  attachSourceImage,
  discardSourceImageUpload,
  prepareSourceImageUpload,
} from "../source-image-actions";

type Upload = {
  key: string;
  file: File;
  status: "preparing" | "uploading" | "saving" | "done" | "failed";
  progress: number; // 0 to 1
  error?: string;
  /** False when trying again can't help, e.g. the file isn't a photo. */
  retryable?: boolean;
};

const VARIANTS: Variant[] = ["original", "display", "thumb"];

/** Adds photos of the original card to a recipe, one upload per photo. */
export function SourceImageUploader({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const inputId = useId();
  const cameraId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);

  function update(key: string, changes: Partial<Upload>) {
    setUploads((current) =>
      current.map((u) => (u.key === key ? { ...u, ...changes } : u)),
    );
  }

  async function run(key: string, file: File) {
    update(key, { status: "preparing", progress: 0, error: undefined });
    let imageId: string | undefined;
    try {
      const image = await processImage(file);
      const prepared = await prepareSourceImageUpload(recipeId);
      if (!prepared.ok) throw new Error(prepared.error);
      imageId = prepared.imageId;

      update(key, { status: "uploading" });
      const total = VARIANTS.reduce((n, v) => n + image[v].size, 0);
      const loaded: Record<Variant, number> = {
        original: 0,
        display: 0,
        thumb: 0,
      };
      await Promise.all(
        VARIANTS.map((variant) =>
          uploadToSignedUrl(prepared.urls[variant], image[variant], (bytes) => {
            loaded[variant] = bytes;
            update(key, {
              progress: VARIANTS.reduce((n, v) => n + loaded[v], 0) / total,
            });
          }),
        ),
      );

      update(key, { status: "saving", progress: 1 });
      const attached = await attachSourceImage(
        recipeId,
        prepared.imageId,
        image,
      );
      if (!attached.ok) throw new Error(attached.error);

      update(key, { status: "done" });
      router.refresh();
    } catch (error) {
      if (imageId) void discardSourceImageUpload(recipeId, imageId);
      const unreadable = error instanceof UnreadableImageError;
      update(key, {
        status: "failed",
        retryable: !unreadable,
        error: unreadable
          ? error.message
          : "The upload didn't finish. Check your connection and try again.",
      });
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map((file) => ({
      key: crypto.randomUUID(),
      file,
      status: "preparing" as const,
      progress: 0,
    }));
    setUploads((current) => [...current, ...added]);
    // One at a time keeps memory use down on phones with large photos.
    void added.reduce(
      (previous, upload) => previous.then(() => run(upload.key, upload.file)),
      Promise.resolve(),
    );
  }

  const inputProps = {
    type: "file",
    accept: "image/*,.heic,.heif",
    className: "sr-only",
    // The buttons below open these; keep the hidden inputs out of tab order.
    tabIndex: -1,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(event.target.files);
      event.target.value = "";
    },
  } as const;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-dashed border-line bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl">Add photos of the original</h2>
        <p className="text-ink-muted">
          Photograph the card in good light, straight on, so the handwriting is
          easy to read. You can add several.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          ref={cameraInput}
          id={cameraId}
          capture="environment"
          aria-label="Take a photo"
          {...inputProps}
        />
        <Button onClick={() => cameraInput.current?.click()}>
          Take a photo
        </Button>
        <input
          ref={fileInput}
          id={inputId}
          multiple
          aria-label="Choose photos"
          {...inputProps}
        />
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          Choose photos
        </Button>
      </div>

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Photo uploads">
          {uploads.map((upload) => (
            <UploadRow
              key={upload.key}
              upload={upload}
              onRetry={() => run(upload.key, upload.file)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<Upload["status"], string> = {
  preparing: "Preparing…",
  uploading: "Uploading…",
  saving: "Saving…",
  done: "Added",
  failed: "Not added",
};

function UploadRow({
  upload,
  onRetry,
}: {
  upload: Upload;
  onRetry: () => void;
}) {
  const percent = Math.round(upload.progress * 100);
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">{upload.file.name}</span>
        <span
          className={
            upload.status === "failed"
              ? "font-semibold text-danger"
              : "text-ink-muted"
          }
        >
          {STATUS_TEXT[upload.status]}
          {upload.status === "uploading" ? ` ${percent}%` : ""}
        </span>
      </div>
      {upload.status !== "done" && upload.status !== "failed" && (
        <progress
          className="h-2 w-full accent-accent"
          max={100}
          value={upload.status === "preparing" ? undefined : percent}
          aria-label={`Uploading ${upload.file.name}`}
        />
      )}
      {upload.status === "failed" && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-danger">
            {upload.error}
          </p>
          {upload.retryable && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
