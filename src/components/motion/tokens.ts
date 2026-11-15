// JS mirror of tokens.css for values JavaScript needs (springs, stagger, skeleton timing).
// Source of truth: docs/18-MOTION-DESIGN.md. tokens.test.ts keeps the shared values in sync.

export const durationMs = {
  instant: 0,
  press: 140,
  fast: 160,
  base: 220,
  item: 200,
  modalIn: 250,
  modalOut: 200,
  shared: 300,
  progress: 400,
  drawerIn: 450,
  drawerOut: 300,
  toast: 400,
  pulse: 1400,
  celebrate: 700,
  shimmer: 1400,
  skeletonDelay: 200,
  skeletonMin: 400,
} as const;

export const easing = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

export const spring = {
  snap: { type: "spring", duration: 0.4, bounce: 0 },
  release: { type: "spring", duration: 0.45, bounce: 0.15 },
  playful: { type: "spring", duration: 0.5, bounce: 0.3 },
} as const;

/** Shrinking gaps so the group reads as a wave, not a metronome (choreograph). */
export const staggerDelaysMs = [0, 35, 65, 90, 110, 125] as const;

export const pulseIterations = 3;
