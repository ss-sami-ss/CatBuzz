"use client";

import { useCallback, useEffect, useReducer } from "react";
import {
  initialSampleBrowserState,
  sampleBrowserReducer,
  type SampleBrowserIntent,
} from "../model/sample-browser.reducer";

/** Clearly simulated latency for the design sample only; no network request is made. */
const SIMULATED_RELOAD_MS = 1200;

export function useSampleBrowserController() {
  const [state, dispatch] = useReducer(sampleBrowserReducer, initialSampleBrowserState);

  useEffect(() => {
    if (state.status !== "reloading") return;
    const timer = window.setTimeout(() => dispatch({ type: "reload/completed" }), SIMULATED_RELOAD_MS);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  const send = useCallback((intent: SampleBrowserIntent) => dispatch(intent), []);
  return { state, send };
}
