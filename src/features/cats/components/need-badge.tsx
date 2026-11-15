import type { CatNeed } from "../model/cat.types";
import styles from "./need-badge.module.css";

const LABELS: Record<CatNeed, string> = {
  urgent: "فوری",
  medical: "نیاز به درمان",
  food_water: "غذا و آب",
  adoption: "واگذاری",
};

/** Status is carried by text and icon, never color alone (N02). */
export function NeedBadge({ need }: { need: CatNeed }) {
  return (
    <span className={`${styles.badge} ${need === "urgent" || need === "medical" ? styles.alert : styles.calm}`}>
      <NeedIcon need={need} />
      {LABELS[need]}
    </span>
  );
}

function NeedIcon({ need }: { need: CatNeed }) {
  const common = { width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true, focusable: false } as const;
  switch (need) {
    case "urgent":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5v4.2M8 11h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "medical":
      return (
        <svg {...common}>
          <path d="M6 2.5h4v3.5h3.5v4H10v3.5H6V10H2.5V6H6z" fill="currentColor" />
        </svg>
      );
    case "food_water":
      return (
        <svg {...common}>
          <path d="M2 8.5h12c0 2.5-2.7 4.5-6 4.5s-6-2-6-4.5zM4 6.5c1-1 2.4-1.5 4-1.5s3 .5 4 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "adoption":
      return (
        <svg {...common}>
          <path d="M2.5 7.5L8 3l5.5 4.5V13h-11z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
  }
}
