import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "contributor" | "reader";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

/**
 * The signed-in user and their role, or a redirect to sign-in.
 * Reads the request's cookies, so call it inside a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .single();
  // Signed in but no profile (e.g. removed from the family list): show a
  // clear page rather than bouncing between home and sign-in.
  if (!profile) redirect("/no-access");

  return profile as CurrentUser;
});
