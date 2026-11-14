"use client";

import { useRouter } from "next/navigation";
import { PhotoPickers } from "@/components/source-images/photo-pickers";
import { UploadList } from "@/components/source-images/upload-list";
import { usePhotoUploads } from "@/components/source-images/use-photo-uploads";

/** Adds photos of the original card to an existing recipe. */
export function SourceImageUploader({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { uploads, add, retry } = usePhotoUploads({
    onUploaded: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-4 rounded-card border border-dashed border-line bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl">Add photos of the original</h2>
        <p className="text-ink-muted">
          Photograph the card in good light, straight on, so the handwriting is
          easy to read. You can add several.
        </p>
      </div>
      <PhotoPickers onFiles={(files) => void add(recipeId, files)} />
      <UploadList uploads={uploads} onRetry={retry} />
    </div>
  );
}
