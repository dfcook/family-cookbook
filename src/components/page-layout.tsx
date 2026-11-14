import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { signOut } from "@/app/sign-in/actions";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "./ui/button";
import { cx } from "./ui/class-names";

type PageLayoutProps = {
  children: ReactNode;
  /** Show who's signed in and a sign-out button. Off for sign-in pages. */
  showAccount?: boolean;
  /** A narrow column, for forms and short messages. */
  width?: "page" | "form";
};

/** Every page's frame: the site header and a centred content column. */
export function PageLayout({
  children,
  showAccount = true,
  width = "page",
}: PageLayoutProps) {
  return (
    <>
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex min-h-16 w-full max-w-page flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
          <Link
            href="/"
            className="inline-flex min-h-tap items-center font-heading text-xl font-semibold text-ink no-underline hover:text-ink"
          >
            Family Cookbook
          </Link>
          {showAccount && (
            <Suspense>
              <Account />
            </Suspense>
          )}
        </div>
      </header>
      <main
        className={cx(
          "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8",
          width === "form" ? "max-w-form" : "max-w-page",
        )}
      >
        {children}
      </main>
    </>
  );
}

async function Account() {
  const user = await getCurrentUser();
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3 text-sm sm:w-auto sm:justify-end">
      <span className="min-w-0 truncate text-ink-muted">
        Signed in as{" "}
        <strong className="text-ink">{user.name ?? user.email}</strong>
      </span>
      <form action={signOut} className="shrink-0">
        <Button type="submit" variant="secondary" className="whitespace-nowrap">
          Sign out
        </Button>
      </form>
    </div>
  );
}
