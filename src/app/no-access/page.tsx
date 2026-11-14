import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "No access · Family Cookbook" };

export default function NoAccessPage() {
  return (
    <PageLayout showAccount={false} width="form">
      <h1 className="text-3xl">No access</h1>
      <p className="text-lg">
        You&apos;re signed in, but this account doesn&apos;t have access to the
        family cookbook. Please ask whoever invited you to check that your email
        is on the family list.
      </p>
      <form action={signOut}>
        <Button type="submit" fullWidth>
          Sign out
        </Button>
      </form>
    </PageLayout>
  );
}
