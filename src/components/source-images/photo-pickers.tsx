"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Take a photo" opens the phone's camera directly; "Choose photos" opens the
 * file picker and allows several at once.
 */
export function PhotoPickers({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const inputProps = {
    type: "file",
    accept: "image/*,.heic,.heif",
    className: "sr-only",
    // The buttons open these; keep the hidden inputs out of the tab order.
    tabIndex: -1,
    disabled,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length > 0) onFiles(files);
    },
  } as const;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <input
        ref={cameraInput}
        capture="environment"
        aria-label="Take a photo"
        {...inputProps}
      />
      <Button disabled={disabled} onClick={() => cameraInput.current?.click()}>
        Take a photo
      </Button>
      <input
        ref={fileInput}
        multiple
        aria-label="Choose photos"
        {...inputProps}
      />
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => fileInput.current?.click()}
      >
        Choose photos
      </Button>
    </div>
  );
}
