import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TextAreaField, TextField } from "./fields";

describe("TextField", () => {
  test("is labelled, so screen readers announce what it's for", () => {
    render(<TextField label="Your email address" name="email" />);
    expect(screen.getByLabelText("Your email address").tagName).toBe("INPUT");
  });

  test("links its hint and error to the input and marks it invalid", () => {
    render(
      <TextField
        label="Sign-in code"
        hint="Check your email"
        error="That code didn't work"
      />,
    );
    const input = screen.getByLabelText("Sign-in code");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    const descriptions = describedBy.map(
      (id) => document.getElementById(id)?.textContent,
    );
    expect(descriptions).toEqual(["Check your email", "That code didn't work"]);
    expect(screen.getByRole("alert").textContent).toBe("That code didn't work");
  });

  test("without an error, it isn't marked invalid and has no alert", () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText("Name").hasAttribute("aria-invalid")).toBe(
      false,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TextAreaField", () => {
  test("renders a labelled text area", () => {
    render(<TextAreaField label="Story" name="story" />);
    expect(screen.getByLabelText("Story").tagName).toBe("TEXTAREA");
  });
});
