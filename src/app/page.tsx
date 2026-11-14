import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./sign-in/actions";

export default function Home() {
  return (
    <>
      <header className="flex min-h-16 items-center justify-end px-4">
        <Suspense>
          <SignedInAs />
        </Suspense>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-serif text-4xl">Family Cookbook</h1>
        <p className="max-w-md text-lg">
          Our family&apos;s recipes, stories and original cards. Coming soon.
        </p>
      </main>
    </>
  );
}

async function SignedInAs() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-4 text-base">
      <span>
        Signed in as <strong>{user.name ?? user.email}</strong>
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-11 rounded-lg border-2 border-stone-800 px-4"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
