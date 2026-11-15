import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { durationMs, easing } from "./tokens";

const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

function cssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`--${name} missing from tokens.css`);
  return match[1].trim();
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

describe("motion tokens", () => {
  it.each(Object.entries(durationMs))("duration %s matches tokens.css", (key, ms) => {
    const name = key.startsWith("skeleton") ? kebab(key) : `duration-${kebab(key)}`;
    expect(cssVar(name)).toBe(`${ms}ms`);
  });

  it.each([
    ["out", "ease-out"],
    ["inOut", "ease-in-out"],
    ["drawer", "ease-drawer"],
  ] as const)("easing %s matches tokens.css", (key, name) => {
    expect(cssVar(name)).toBe(easing[key]);
  });

  it("keeps every UI duration except documented exceptions at or under 300ms", () => {
    const exceptions = new Set(["progress", "drawerIn", "toast", "pulse", "celebrate", "shimmer", "skeletonMin"]);
    for (const [key, ms] of Object.entries(durationMs)) {
      if (!exceptions.has(key)) expect(ms, key).toBeLessThanOrEqual(300);
    }
  });
});
