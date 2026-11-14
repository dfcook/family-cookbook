import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Family Cookbook" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl">Family Cookbook</h1>
        <p className="text-lg">Sign in with a code sent to your email.</p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
