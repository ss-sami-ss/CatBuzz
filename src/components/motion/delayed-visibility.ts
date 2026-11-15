import { durationMs } from "./tokens";

export type DelayedVisibilityInput = {
  loading: boolean;
  /** ms since loading started, or null when not loading */
  sinceLoadingStart: number | null;
  /** ms since the placeholder became visible, or null when hidden */
  sinceShown: number | null;
};

/**
 * Skeleton visibility rule (docs/18 §7): appear only if loading outlasts
 * skeletonDelay, and once visible stay at least skeletonMin so it never flashes.
 */
export function shouldShowPlaceholder(
  { loading, sinceLoadingStart, sinceShown }: DelayedVisibilityInput,
  delay = durationMs.skeletonDelay,
  min = durationMs.skeletonMin,
): boolean {
  if (sinceShown !== null) {
    return loading || sinceShown < min;
  }
  return loading && sinceLoadingStart !== null && sinceLoadingStart >= delay;
}
