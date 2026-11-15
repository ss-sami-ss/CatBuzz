import type { CSSProperties } from "react";
import { staggerDelaysMs } from "./tokens";
import styles from "./stagger.module.css";

/**
 * Props for one item of a staggered group entrance (docs/18 §4).
 * Only the first six items get their own delay; the rest arrive with the sixth.
 * The first item is the lead and travels slightly further.
 */
export function staggerItemProps(index: number): { className: string; style: CSSProperties } {
  const last = staggerDelaysMs.length - 1;
  const delay = staggerDelaysMs[Math.min(Math.max(index, 0), last)] ?? 0;
  return {
    className: styles.item ?? "",
    style: {
      "--stagger-delay": `${delay}ms`,
      "--enter-from": index === 0 ? "var(--enter-distance-lead)" : "var(--enter-distance)",
    } as CSSProperties,
  };
}
