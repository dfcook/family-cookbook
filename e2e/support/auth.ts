import { randomUUID } from "node:crypto";
import { type Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "contributor" | "reader";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} for end-to-end tests`);
  return value;
}

/** Service-role client for test setup only. Bypasses row-level security. */
function adminClient() {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** A fresh, unique email address, so parallel tests never share a code. */
export function uniqueEmail(label: string) {
  return `${label}-${randomUUID().slice(0, 8)}@example.test`;
}

export async function allowEmail(email: string, role: Role = "reader") {
  const { error } = await adminClient()
    .from("allowed_emails")
    .insert({ email, role });
  if (error) throw error;
}

type MailpitMessage = { ID: string; To: { Address: string }[] };

/**
 * Emails in the local test inbox sent to `email`, newest first. Lists recent
 * messages and filters here, because Mailpit's search index can lag behind
 * delivery right after the stack starts.
 */
export async function emailsTo(email: string): Promise<MailpitMessage[]> {
  const list = await fetch(`${env("MAILPIT_URL")}/api/v1/messages?limit=500`).then(
    (r) => r.json() as Promise<{ messages: MailpitMessage[] }>,
  );
  return list.messages.filter((m) =>
    m.To.some((to) => to.Address.toLowerCase() === email.toLowerCase()),
  );
}

/** Reads the 6-digit code from the newest email the local Supabase sent to `email`. */
export async function getSignInCode(email: string): Promise<string> {
  let code: string | undefined;

  await expect
    .poll(
      async () => {
        const [latest] = await emailsTo(email);
        if (!latest) return undefined;
        const message = await fetch(
          `${env("MAILPIT_URL")}/api/v1/message/${latest.ID}`,
        ).then((r) => r.json() as Promise<{ Text: string }>);
        code = message.Text.match(/\b\d{6}\b/)?.[0];
        return code;
      },
      { message: `waiting for sign-in email to ${email}`, timeout: 15_000 },
    )
    .toBeTruthy();

  return code!;
}

export async function countEmailsTo(email: string): Promise<number> {
  return (await emailsTo(email)).length;
}

export async function requestCode(page: Page, email: string) {
  await page.getByLabel("Your email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code")).toBeVisible();
}

/** Signs in through the real UI with a code read from the local test inbox. */
export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await requestCode(page, email);
  await page.getByLabel("Sign-in code").fill(await getSignInCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

export async function getProfileRole(email: string): Promise<string | undefined> {
  const { data, error } = await adminClient()
    .from("profiles")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data?.role;
}
