import { describe, expect, it } from "vitest";
import {
  isPlatformDocumentPath,
  VITE_DEV_UI_SOURCE
} from "../src/platform-dev-server.ts";

describe("platform dev server helpers", () => {
  it("matches manager document routes", () => {
    expect(isPlatformDocumentPath("/")).toBe(true);
    expect(isPlatformDocumentPath("/projects")).toBe(true);
    expect(isPlatformDocumentPath("/projects/landing-a")).toBe(true);
    expect(isPlatformDocumentPath("/projects/landing-a/workspace")).toBe(true);
    expect(isPlatformDocumentPath("/p/landing-a")).toBe(false);
    expect(isPlatformDocumentPath("/assets/index.js")).toBe(false);
  });

  it("marks the latest dev source explicitly", () => {
    expect(VITE_DEV_UI_SOURCE).toBe("vite-dev");
  });
});
