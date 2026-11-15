import { describe, expect, it } from "vitest";
import { shouldShowPlaceholder } from "./delayed-visibility";

describe("shouldShowPlaceholder", () => {
  it("stays hidden for fast loads under the delay", () => {
    expect(shouldShowPlaceholder({ loading: true, sinceLoadingStart: 150, sinceShown: null })).toBe(false);
  });

  it("appears once loading outlasts the delay", () => {
    expect(shouldShowPlaceholder({ loading: true, sinceLoadingStart: 200, sinceShown: null })).toBe(true);
  });

  it("stays visible for the minimum time even after data arrives", () => {
    expect(shouldShowPlaceholder({ loading: false, sinceLoadingStart: null, sinceShown: 250 })).toBe(true);
  });

  it("hides after the minimum time once loading is done", () => {
    expect(shouldShowPlaceholder({ loading: false, sinceLoadingStart: null, sinceShown: 400 })).toBe(false);
  });

  it("never shows when nothing is loading", () => {
    expect(shouldShowPlaceholder({ loading: false, sinceLoadingStart: null, sinceShown: null })).toBe(false);
  });
});
