"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { type SignInState, sendCode, verifyCode } from "./actions";

export function SignInForm() {
  const next = useSearchParams().get("next") ?? "";
  const [restart, setRestart] = useState(0);

  return (
    <SignInSteps
      key={restart}
      next={next}
      onRestart={() => setRestart((n) => n + 1)}
    />
  );
}

function SignInSteps({ next, onRestart }: { next: string; onRestart: () => void }) {
  const [emailState, sendAction, sending] = useActionState<SignInState, FormData>(
    sendCode,
    { step: "email" },
  );
  const [codeState, verifyAction, verifying] = useActionState<SignInState, FormData>(
    verifyCode,
    { step: "email" },
  );

  if (emailState.step === "email") {
    return (
      <form action={sendAction} className="flex flex-col gap-5">
        <TextField
          label="Your email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailState.email}
          error={emailState.error}
        />
        <Button type="submit" fullWidth disabled={sending}>
          {sending ? "Sending…" : "Email me a sign-in code"}
        </Button>
      </form>
    );
  }

  const email = emailState.email;

  return (
    <div className="flex flex-col gap-6">
      <p
        role="status"
        className="rounded-card border border-line bg-card p-4 text-lg"
      >
        {emailState.resent ? "We've sent a new code. " : ""}
        If <strong className="break-all">{email}</strong> is on the family list,
        we&apos;ve emailed it a sign-in code. It can take a minute to arrive.
      </p>

      <form action={verifyAction} className="flex flex-col gap-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Sign-in code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 \-]*"
          maxLength={14}
          required
          autoFocus
          className="font-semibold tracking-[0.3em]"
          error={codeState.error ?? emailState.error}
        />
        <Button type="submit" fullWidth disabled={verifying}>
          {verifying ? "Checking…" : "Sign in"}
        </Button>
      </form>

      <div className="flex flex-col items-start gap-1">
        <form action={sendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="resend" value="1" />
          <Button type="submit" variant="quiet" disabled={sending}>
            Send a new code
          </Button>
        </form>
        <Button variant="quiet" onClick={onRestart}>
          Use a different email
        </Button>
      </div>

      <p className="text-ink-muted">
        No email? Check your spam folder, or ask whoever invited you to check
        that your address is on the family list.
      </p>
    </div>
  );
}
