import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// Reads the colour tokens straight from the stylesheet, so this test always
// checks the colours the app actually uses.
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const colours = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(
    ([, name, hex]) => [name, hex],
  ),
);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 for text; 3 for control
// borders and focus rings (WCAG 1.4.11 non-text contrast).
const pairs: [string, string, number][] = [
  ["ink", "paper", 4.5],
  ["ink", "card", 4.5],
  ["ink-muted", "paper", 4.5],
  ["ink-muted", "card", 4.5],
  ["accent", "paper", 4.5],
  ["accent", "card", 4.5],
  ["accent-strong", "paper", 4.5],
  ["on-accent", "accent", 4.5],
  ["on-accent", "accent-strong", 4.5],
  ["danger", "paper", 4.5],
  ["danger", "card", 4.5],
  ["field", "paper", 3],
  ["field", "card", 3],
  ["focus", "paper", 3],
  ["focus", "card", 3],
];

describe("colour tokens meet WCAG 2.1 AA contrast", () => {
  test.each(pairs)("%s on %s is at least %s:1", (fg, bg, minimum) => {
    expect(colours[fg], `missing token --color-${fg}`).toBeDefined();
    expect(colours[bg], `missing token --color-${bg}`).toBeDefined();
    expect(contrast(colours[fg], colours[bg])).toBeGreaterThanOrEqual(minimum);
  });
});
