import type { CatCardData } from "../model/cat.types";
import styles from "./cat-placeholder.module.css";

/** Stand-in until real moderated media exists (T13); clearly labeled as a sample image. */
export function CatPlaceholder({ tone, label, className }: { tone: CatCardData["tone"]; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={[styles.frame, styles[tone], className].filter(Boolean).join(" ")}>
      <svg viewBox="0 0 120 120" className={styles.cat} aria-hidden="true" focusable="false">
        <path
          d="M30 104c0-22 10-38 30-38s30 16 30 38zM38 30l10 20M82 30L72 50M40 62c-6-20 0-36 4-40l12 14h8l12-14c4 4 10 20 4 40"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="52" cy="50" r="3" className={styles.eye} />
        <circle cx="68" cy="50" r="3" className={styles.eye} />
      </svg>
      <span className={styles.tag}>نمونه</span>
    </div>
  );
}
