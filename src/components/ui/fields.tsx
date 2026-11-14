"use client";

import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "./class-names";

const controlClass =
  "w-full rounded-control border-2 border-field bg-card px-4 py-3 text-lg text-ink placeholder:text-ink-muted aria-invalid:border-danger";

type FieldFrameProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
};

/** Label, optional hint and error message, wired up for screen readers. */
function FieldFrame({ label, hint, error, children }: FieldFrameProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-base text-ink-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy })}
      {error && (
        <p id={errorId} role="alert" className="text-lg font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cx(controlClass, "min-h-tap", className)}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  className,
  rows = 6,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cx(controlClass, "leading-relaxed", className)}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

/** A form-level message, e.g. "That code didn't work", not tied to one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-lg font-semibold text-danger">
      {message}
    </p>
  );
}
