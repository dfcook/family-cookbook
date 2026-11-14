"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/fields";
import { type TrashActionState, trashRecipe } from "../actions";

/** "Delete this recipe", confirmed in a dialog that names the recipe. */
export function DeleteRecipe({
  recipeId,
  title,
}: {
  recipeId: string;
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, deleting] = useActionState<
    TrashActionState,
    FormData
  >(trashRecipe.bind(null, recipeId), {});

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => dialog.current?.showModal()}
        className="self-start"
      >
        Delete this recipe
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-form rounded-card border border-line bg-card p-6 text-ink backdrop:bg-ink/60"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id="delete-title" className="text-2xl">
            Delete &ldquo;{title}&rdquo;?
          </h2>
          <p>
            It will be hidden from everyone and moved to the trash. You can
            restore it from there.
          </p>
          <FormError message={state.error} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={deleting}>
              {deleting ? "Deleting…" : "Move to trash"}
            </Button>
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
