import {
  allowEmail,
  anonymousClient,
  emailsTo,
  uniqueEmail,
} from "./support/auth";

/**
 * On a freshly started local Supabase, the auth service can send its first
 * emails with the built-in magic-link template before our 6-digit-code
 * template has loaded. Send warm-up emails until one contains a code, so no
 * test sees the default template.
 */
export default async function globalSetup() {
  const supabase = anonymousClient();
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const email = uniqueEmail("warm-up");
    await allowEmail(email);
    await supabase.auth.signInWithOtp({ email });

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const [message] = await emailsTo(email);
      if (!message) continue;
      if (/\b\d{6}\b/.test(await messageText(message.ID))) return;
      break; // Sent with the default template; try again.
    }
  }

  throw new Error("Local Supabase never sent a sign-in code email");
}

async function messageText(id: string): Promise<string> {
  const message = await fetch(
    `${process.env.MAILPIT_URL}/api/v1/message/${id}`,
  ).then((r) => r.json() as Promise<{ Text: string }>);
  return message.Text;
}
