import type { ComponentProps } from "react";
import { cx } from "./class-names";

type Variant = "primary" | "secondary" | "danger" | "quiet";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent font-semibold hover:bg-accent-strong active:bg-accent-strong",
  secondary:
    "border-2 border-ink bg-card text-ink font-semibold hover:bg-paper",
  danger: "bg-danger text-on-accent font-semibold hover:bg-ink active:bg-ink",
  quiet:
    "-mx-1 px-1 text-accent underline underline-offset-4 hover:text-accent-strong",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  /** Stretch to the width of its container, e.g. the main action on a form. */
  fullWidth?: boolean;
};

/**
 * The app's one button. Always at least 44px tall, so it's easy to tap.
 * Defaults to type="button"; pass type="submit" for form submits.
 */
export function Button({
  variant = "primary",
  fullWidth = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex min-h-tap items-center justify-center gap-2 rounded-control text-base",
        variant !== "quiet" && "px-5 py-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
