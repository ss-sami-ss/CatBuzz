/** MVI model for the dev design sample: which cat is open and whether a reload is in flight. */
export type SampleBrowserState = {
  selectedCatId: string | null;
  status: "ready" | "reloading";
  /** Bumped when fresh results arrive so the list re-enters (stagger). */
  listVersion: number;
};

export type SampleBrowserIntent =
  | { type: "cat/selected"; catId: string }
  | { type: "details/closed" }
  | { type: "reload/requested" }
  | { type: "reload/completed" };

export const initialSampleBrowserState: SampleBrowserState = {
  selectedCatId: null,
  status: "ready",
  listVersion: 0,
};

export function sampleBrowserReducer(state: SampleBrowserState, intent: SampleBrowserIntent): SampleBrowserState {
  switch (intent.type) {
    case "cat/selected":
      return { ...state, selectedCatId: intent.catId };
    case "details/closed":
      return state.selectedCatId === null ? state : { ...state, selectedCatId: null };
    case "reload/requested":
      return state.status === "reloading" ? state : { ...state, status: "reloading", selectedCatId: null };
    case "reload/completed":
      return state.status === "reloading" ? { ...state, status: "ready", listVersion: state.listVersion + 1 } : state;
  }
}
