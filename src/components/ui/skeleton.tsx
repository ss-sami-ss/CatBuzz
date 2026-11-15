import type { CSSProperties } from "react";
import styles from "./skeleton.module.css";

type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  className?: string;
};

/** Decorative placeholder; the loading state is announced by the container (aria-busy). */
export function Skeleton({ width = "100%", height = "1em", radius = "var(--radius-sm)", className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
