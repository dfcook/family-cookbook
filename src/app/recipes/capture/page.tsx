import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth";
import { QuickCaptureForm } from "./quick-capture-form";

export const metadata: Metadata = { title: "Quick capture · Family Cookbook" };

export default function QuickCapturePage() {
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">Quick capture</h1>
        <p className="text-lg text-ink-muted">
          Photograph a card and name it. You can type it up later.
        </p>
      </div>
      <QuickCaptureForm />
    </>
  );
}
