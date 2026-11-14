import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  test.each([
    ["/", "/"],
    ["/recipes/42", "/recipes/42"],
    ["/recipes?tag=christmas", "/recipes?tag=christmas"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  test.each<[unknown, string]>([
    ["https://evil.example", "absolute URL"],
    ["//evil.example", "protocol-relative URL"],
    ["/\\evil.example", "backslash trick"],
    ["recipes", "relative path"],
    ["", "empty string"],
    [null, "missing"],
    ["/sign-in", "the sign-in page itself"],
  ])("falls back to home for %s (%s)", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });
});
