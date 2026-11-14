"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { type SignInState, sendCode, verifyCode } from "./actions";

const inputClass =
  "w-full rounded-lg border-2 border-stone-400 bg-white px-4 py-3 text-xl focus:border-stone-800 focus:outline-none";
const buttonClass =
  "min-h-12 w-full rounded-lg bg-stone-800 px-6 py-3 text-lg font-semibold text-white disabled:opacity-60";
const linkButtonClass = "min-h-11 text-lg underline underline-offset-4";

export function SignInForm() {
  const next = useSearchParams().get("next") ?? "";
  const [restart, setRestart] = useState(0);

  return <SignInSteps key={restart} next={next} onRestart={() => setRestart((n) => n + 1)} />;
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
      <form action={sendAction} className="flex flex-col gap-4">
        <label htmlFor="email" className="text-lg font-semibold">
          Your email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailState.email}
          className={inputClass}
        />
        <ErrorMessage message={emailState.error} />
        <button type="submit" className={buttonClass} disabled={sending}>
          {sending ? "Sending…" : "Email me a sign-in code"}
        </button>
      </form>
    );
  }

  const email = emailState.email;
  const error = codeState.error ?? emailState.error;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg" role="status">
        {emailState.resent ? "We've sent a new code. " : ""}
        If <strong>{email}</strong> is on the family list, we&apos;ve emailed it
        a sign-in code. It can take a minute to arrive.
      </p>

      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="code" className="text-lg font-semibold">
          Sign-in code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 \-]*"
          maxLength={14}
          required
          autoFocus
          className={`${inputClass} tracking-[0.4em]`}
        />
        <ErrorMessage message={error} />
        <button type="submit" className={buttonClass} disabled={verifying}>
          {verifying ? "Checking…" : "Sign in"}
        </button>
      </form>

      <div className="flex flex-col items-start gap-2">
        <form action={sendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="resend" value="1" />
          <button type="submit" className={linkButtonClass} disabled={sending}>
            Send a new code
          </button>
        </form>
        <button type="button" className={linkButtonClass} onClick={onRestart}>
          Use a different email
        </button>
      </div>

      <p className="text-base">
        No email? Check your spam folder, or ask whoever invited you to check
        that your address is on the family list.
      </p>
    </div>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-lg font-semibold text-red-800">
      {message}
    </p>
  );
}
