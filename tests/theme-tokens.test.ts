import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import tailwindConfig from "../tailwind.config";

const rootDir = process.cwd();

describe("platform theme tokens", () => {
  it("uses dark global defaults and product CSS tokens", () => {
    const css = readFileSync(join(rootDir, "src/app/globals.css"), "utf8");

    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("--bg: #030103");
    expect(css).toContain("--burgundy: #19040a");
    expect(css).toContain("--card: rgba(255, 255, 255, 0.055)");
    expect(css).toContain("--card-elevated: rgba(255, 255, 255, 0.08)");
    expect(css).toContain("--border: rgba(255, 255, 255, 0.12)");
    expect(css).toContain("--fg: #ffffff");
    expect(css).toContain("--secondary: #b9aeb5");
    expect(css).toContain("--muted: #7e747a");
    expect(css).toContain("--pink: #ff2d55");
    expect(css).toContain("--red: #ff174c");
    expect(css).toContain("--success: #39d98a");
    expect(css).toContain("--warning: #ffb020");
    expect(css).toContain("--danger: #ff4d6d");
    expect(css).not.toContain("background: #ffffff");
    expect(css).not.toContain("color: #000000");
  });

  it("exposes platform tokens through Tailwind while preserving legacy names", () => {
    const colors = tailwindConfig.theme?.extend?.colors;

    expect(colors).toMatchObject({
      platform: {
        bg: "var(--bg)",
        burgundy: "var(--burgundy)",
        card: "var(--card)",
        elevated: "var(--card-elevated)",
        border: "var(--border)",
        fg: "var(--fg)",
        secondary: "var(--secondary)",
        muted: "var(--muted)",
        pink: "var(--pink)",
        red: "var(--red)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)"
      },
      ink: "#000000",
      paper: "#ffffff"
    });
  });
});
