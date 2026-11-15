"use client";

import { useEffect, useRef, useState } from "react";
import { shouldShowPlaceholder } from "./delayed-visibility";
import { durationMs } from "./tokens";

/** Hook wrapper around shouldShowPlaceholder; schedules the next check with timers. */
export function useDelayedVisibility(loading: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const loadingStart = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading && loadingStart.current === null) loadingStart.current = performance.now();
    if (!loading) loadingStart.current = null;

    const evaluate = () => {
      const now = performance.now();
      const show = shouldShowPlaceholder({
        loading,
        sinceLoadingStart: loadingStart.current === null ? null : now - loadingStart.current,
        sinceShown: shownAt.current === null ? null : now - shownAt.current,
      });
      if (show && shownAt.current === null) shownAt.current = now;
      if (!show) shownAt.current = null;
      setVisible(show);
      return show;
    };

    const show = evaluate();
    if (!loading && !show) return;
    const wait = show && !loading ? durationMs.skeletonMin : durationMs.skeletonDelay;
    const timer = window.setTimeout(evaluate, wait);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return visible;
}
