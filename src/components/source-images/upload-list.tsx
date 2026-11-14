"use client";

import { Button } from "@/components/ui/button";
import type { PhotoUpload } from "./use-photo-uploads";

const STATUS_TEXT: Record<PhotoUpload["status"], string> = {
  waiting: "Waiting…",
  preparing: "Preparing…",
  uploading: "Uploading…",
  saving: "Saving…",
  done: "Added",
  failed: "Not added",
};

/** Each photo's progress, with "Try again" for uploads that failed. */
export function UploadList({
  uploads,
  onRetry,
}: {
  uploads: PhotoUpload[];
  onRetry: (key: string) => void;
}) {
  if (uploads.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3" aria-label="Photo uploads">
      {uploads.map((upload) => (
        <UploadRow
          key={upload.key}
          upload={upload}
          onRetry={() => onRetry(upload.key)}
        />
      ))}
    </ul>
  );
}

function UploadRow({
  upload,
  onRetry,
}: {
  upload: PhotoUpload;
  onRetry: () => void;
}) {
  const percent = Math.round(upload.progress * 100);
  const inProgress = upload.status !== "done" && upload.status !== "failed";
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
      {inProgress && (
        <progress
          className="h-2 w-full accent-accent"
          max={100}
          value={
            upload.status === "uploading" || upload.status === "saving"
              ? percent
              : undefined
          }
          aria-label={`Uploading ${upload.file.name}`}
        />
      )}
      {upload.status === "failed" && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-danger">
            {upload.error}
          </p>
          {upload.detail && (
            <details className="w-full text-sm text-ink-muted">
              <summary className="min-h-tap cursor-pointer content-center">
                Details
              </summary>
              <p className="break-words">{upload.detail}</p>
            </details>
          )}
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
