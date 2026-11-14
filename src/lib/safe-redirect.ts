/**
 * Where to send someone after sign-in. Only same-site paths are allowed, so a
 * crafted `?next=` link can't bounce a relative off to another website.
 */
export function safeRedirectPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  if (next.startsWith("/sign-in")) return "/";
  return next;
}
