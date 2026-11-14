import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  test("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(
      screen.getByRole("button", { name: "Cancel" }).getAttribute("type"),
    ).toBe("button");
  });

  test("can be a submit button", () => {
    render(<Button type="submit">Save</Button>);
    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("type"),
    ).toBe("submit");
  });

  test.each(["primary", "secondary", "quiet"] as const)(
    "the %s variant always has the minimum tap height",
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      expect(screen.getByRole("button").className).toContain("min-h-tap");
    },
  );
});
