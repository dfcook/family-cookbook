"use server";

import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type SignInState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string; resent?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendCode(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const resend = formData.get("resend") === "1";

  if (!EMAIL_PATTERN.test(email)) {
    return {
      step: "email",
      email,
      error: "Please enter your email address, like name@example.com.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error?.status === 429) {
    return {
      step: resend ? "code" : "email",
      email,
      error: "Too many tries. Please wait a minute, then try again.",
    };
  }

  // Any other error, including an email that isn't on the family list, gets
  // the same answer as success, so the page never reveals who is on the list.
  if (error) console.warn("sendCode: sign-in email not sent", error.status);

  return { step: "code", email, resent: resend };
}

export async function verifyCode(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");

  if (!/^\d{6}$/.test(token)) {
    return { step: "code", email, error: "The code is 6 numbers." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return {
      step: "code",
      email,
      error:
        error.status === 429
          ? "Too many tries. Please wait a minute, then try again."
          : "That code didn't work. Check it against the email, or send a new code.",
    };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
