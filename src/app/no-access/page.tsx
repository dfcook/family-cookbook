import type { Metadata } from "next";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "No access · Family Cookbook" };

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="font-serif text-4xl">Family Cookbook</h1>
      <p className="text-lg">
        You&apos;re signed in, but this account doesn&apos;t have access to the
        family cookbook. Please ask whoever invited you to check that your
        email is on the family list.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-12 w-full rounded-lg bg-stone-800 px-6 py-3 text-lg font-semibold text-white"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
