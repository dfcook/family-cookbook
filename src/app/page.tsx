import { PageLayout } from "@/components/page-layout";

export default function Home() {
  return (
    <PageLayout>
      <div className="flex flex-col gap-3 py-12 text-center">
        <h1 className="text-4xl">Family Cookbook</h1>
        <p className="mx-auto max-w-form text-lg text-ink-muted">
          Our family&apos;s recipes, stories and original cards. Coming soon.
        </p>
      </div>
    </PageLayout>
  );
}
