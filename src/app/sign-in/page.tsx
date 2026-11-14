import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Family Cookbook" };

export default function SignInPage() {
  return (
    <PageLayout showAccount={false} width="form">
      <div className="flex flex-col gap-2 pt-4">
        <h1 className="text-3xl">Sign in</h1>
        <p className="text-lg text-ink-muted">
          We&apos;ll email you a code. No password needed.
        </p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </PageLayout>
  );
}
