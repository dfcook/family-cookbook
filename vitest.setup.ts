import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered components between tests (Vitest has no globals here, so
// Testing Library can't register this itself).
afterEach(() => cleanup());
