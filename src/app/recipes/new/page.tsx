import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth";
import { createRecipe } from "../actions";
import { RecipeForm } from "../recipe-form";

export const metadata: Metadata = { title: "Add a recipe · Family Cookbook" };

export default function NewRecipePage() {
  return (
    <PageLayout width="form">
      <Suspense>
        <AdminOnly />
      </Suspense>
    </PageLayout>
  );
}

async function AdminOnly() {
  await requireAdmin();
  return (
    <>
      <h1 className="text-3xl">Add a recipe</h1>
      <RecipeForm
        action={createRecipe}
        submitLabel="Save recipe"
        cancelHref="/"
      />
    </>
  );
}
