"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/fields";
import { restoreRecipe, type TrashActionState } from "../actions";

export function RestoreRecipe({
  recipeId,
  title,
}: {
  recipeId: string;
  title: string;
}) {
  const [state, formAction, restoring] = useActionState<
    TrashActionState,
    FormData
  >(restoreRecipe.bind(null, recipeId), {});

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button
        type="submit"
        variant="secondary"
        disabled={restoring}
        aria-label={`Restore ${title}`}
      >
        {restoring ? "Restoring…" : "Restore"}
      </Button>
      <FormError message={state.error} />
    </form>
  );
}
