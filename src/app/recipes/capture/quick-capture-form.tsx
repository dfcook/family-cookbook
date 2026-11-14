"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { PhotoPickers } from "@/components/source-images/photo-pickers";
import { UploadList } from "@/components/source-images/upload-list";
import { usePhotoUploads } from "@/components/source-images/use-photo-uploads";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "@/components/ui/fields";
import { createQuickCapture } from "../actions";

type Chosen = { key: string; file: File; preview: string };

type Step =
  | { kind: "editing"; error?: string; titleError?: string }
  | { kind: "saving"; recipeId: string }
  | { kind: "saved"; recipeId: string; failed: number };

/**
 * Photograph a card and give it a name, nothing else. Built for working
 * through the whole binder in one sitting; typing up comes later.
 */
export function QuickCaptureForm() {
  const [round, setRound] = useState(0);
  // A fresh form for each card: "Capture another" just bumps the key.
  return (
    <CaptureOne key={round} onCaptureAnother={() => setRound((n) => n + 1)} />
  );
}

function CaptureOne({ onCaptureAnother }: { onCaptureAnother: () => void }) {
  const [title, setTitle] = useState("");
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [step, setStep] = useState<Step>({ kind: "editing" });
  const { uploads, add, retry } = usePhotoUploads();
  const photosHeadingId = useId();

  // Free the photo previews when they're no longer shown.
  useEffect(
    () => () => {
      for (const c of chosen) URL.revokeObjectURL(c.preview);
    },
    [chosen],
  );

  function choose(files: File[]) {
    setChosen((current) => [
      ...current,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  async function save(form: HTMLFormElement) {
    // Read the name from the form, not from typing events: anything typed
    // before the page finished loading on a slow phone still counts.
    const title = String(new FormData(form).get("title") ?? "").trim();
    setTitle(title);
    if (!title) {
      setStep({
        kind: "editing",
        titleError: "Please give the recipe a name.",
      });
      return;
    }
    if (chosen.length === 0) {
      setStep({
        kind: "editing",
        error: "Please add at least one photo of the card.",
      });
      return;
    }

    const created = await createQuickCapture(title);
    if (!created.ok) {
      setStep({ kind: "editing", error: created.error });
      return;
    }
    setStep({ kind: "saving", recipeId: created.recipeId });
    const added = await add(
      created.recipeId,
      chosen.map((c) => c.file),
    );
    setStep({
      kind: "saved",
      recipeId: created.recipeId,
      failed: chosen.length - added,
    });
  }

  if (step.kind !== "editing") {
    const saved = step.kind === "saved";
    return (
      <div className="flex flex-col gap-5">
        <p
          role="status"
          className="rounded-card border border-line bg-card p-4 text-lg"
        >
          {!saved && (
            <>
              Saving <strong>{title.trim()}</strong>…
            </>
          )}
          {saved && step.failed === 0 && (
            <>
              <strong>{title.trim()}</strong> is saved, ready to type up later.
            </>
          )}
          {saved && step.failed > 0 && (
            <>
              <strong>{title.trim()}</strong> is saved, but{" "}
              {step.failed === 1 ? "one photo" : `${step.failed} photos`}{" "}
              didn&apos;t upload. Try again below.
            </>
          )}
        </p>
        <UploadList uploads={uploads} onRetry={retry} />
        {saved && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onCaptureAnother}>Capture another</Button>
            <Link
              href={`/recipes/${step.recipeId}`}
              className="inline-flex min-h-tap items-center justify-center px-5"
            >
              View this recipe
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save(event.currentTarget);
      }}
    >
      <TextField
        label="Recipe name"
        hint="As it's written on the card, or what the family calls it."
        name="title"
        defaultValue={title}
        maxLength={200}
        autoComplete="off"
        error={step.titleError}
      />

      <section
        aria-labelledby={photosHeadingId}
        className="flex flex-col gap-3"
      >
        <h2 id={photosHeadingId} className="text-lg font-semibold">
          Photos of the card
        </h2>
        <PhotoPickers onFiles={choose} />
        {chosen.length > 0 && (
          <ul
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-label="Chosen photos"
          >
            {chosen.map((c, i) => (
              <li key={c.key} className="flex flex-col gap-1">
                <Image
                  src={c.preview}
                  alt={`Chosen photo ${i + 1}`}
                  width={240}
                  height={180}
                  unoptimized
                  className="aspect-4/3 w-full rounded-control border border-line object-cover"
                />
                <Button
                  variant="quiet"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() =>
                    setChosen((current) =>
                      current.filter((x) => x.key !== c.key),
                    )
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormError message={step.error} />
      <Button type="submit" fullWidth>
        Save
      </Button>
    </form>
  );
}
