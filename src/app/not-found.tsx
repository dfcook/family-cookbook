import Link from "next/link";
import { PageLayout } from "@/components/page-layout";

export default function NotFound() {
  return (
    <PageLayout width="form">
      <h1 className="text-3xl">We couldn&apos;t find that page</h1>
      <p className="text-lg">
        It may have been moved or removed, or the link may be mistyped.
      </p>
      <p className="text-lg">
        <Link href="/" className="inline-flex min-h-tap items-center">
          Go to all recipes
        </Link>
      </p>
    </PageLayout>
  );
}
