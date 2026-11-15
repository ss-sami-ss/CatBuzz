import { describe, expect, it } from "vitest";
import { initialSampleBrowserState as initial, sampleBrowserReducer as reduce } from "./sample-browser.reducer";

describe("sampleBrowserReducer", () => {
  it("opens and closes the details of a cat", () => {
    const opened = reduce(initial, { type: "cat/selected", catId: "sample-1" });
    expect(opened.selectedCatId).toBe("sample-1");
    expect(reduce(opened, { type: "details/closed" }).selectedCatId).toBeNull();
  });

  it("returns the same state when closing with nothing open", () => {
    expect(reduce(initial, { type: "details/closed" })).toBe(initial);
  });

  it("ignores a second reload while one is in flight", () => {
    const reloading = reduce(initial, { type: "reload/requested" });
    expect(reduce(reloading, { type: "reload/requested" })).toBe(reloading);
  });

  it("bumps the list version only when a reload completes", () => {
    const reloading = reduce({ ...initial, selectedCatId: "sample-2" }, { type: "reload/requested" });
    expect(reloading.selectedCatId).toBeNull();
    const done = reduce(reloading, { type: "reload/completed" });
    expect(done).toMatchObject({ status: "ready", listVersion: 1 });
    expect(reduce(done, { type: "reload/completed" })).toBe(done);
  });
});
