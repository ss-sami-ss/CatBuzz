import type { CSSProperties } from "react";
import type { CatCardData } from "../model/cat.types";
import { CatPlaceholder } from "./cat-placeholder";
import { NeedBadge } from "./need-badge";
import styles from "./cat-card.module.css";

type CatCardProps = {
  cat: CatCardData;
  selected?: boolean;
  onSelect: (catId: string) => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Pure view: receives display-ready data and sends the select intent.
 * One interactive element (the button) stretched over the whole card.
 */
export function CatCard({ cat, selected = false, onSelect, className, style }: CatCardProps) {
  const headingId = `cat-${cat.id}-name`;
  return (
    <article
      className={[styles.card, selected ? styles.selected : undefined, className].filter(Boolean).join(" ")}
      style={style}
      aria-labelledby={headingId}
    >
      <div className={styles.body}>
        <h3 id={headingId} className={styles.name}>
          <PawIcon />
          {cat.name}
        </h3>
        <ul className={styles.needs} aria-label="نیازها">
          {cat.needs.map((need) => (
            <li key={need}>
              <NeedBadge need={need} />
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <CalendarIcon />
          آخرین مشاهده: {cat.lastSeenLabel}
        </p>
        <p className={styles.meta}>{cat.areaLabel}</p>
        <button type="button" className={styles.cta} aria-pressed={selected} onClick={() => onSelect(cat.id)}>
          مشاهدهٔ خلاصه
        </button>
      </div>
      <CatPlaceholder tone={cat.tone} label={`تصویر نمونهٔ ${cat.name}`} className={styles.photo} />
    </article>
  );
}

function PawIcon() {
  return (
    <svg className={styles.paw} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <ellipse cx="6" cy="9" rx="2.2" ry="2.8" fill="currentColor" />
      <ellipse cx="10" cy="5.5" rx="2.2" ry="2.8" fill="currentColor" />
      <ellipse cx="14.5" cy="5.5" rx="2.2" ry="2.8" fill="currentColor" />
      <ellipse cx="18.5" cy="9" rx="2.2" ry="2.8" fill="currentColor" />
      <path d="M12.2 11c3 0 5.8 3.4 5.8 6 0 1.9-1.6 2.6-3.2 2.2-1.1-.3-1.7-.7-2.6-.7s-1.5.4-2.6.7C8 19.6 6.4 18.9 6.4 17c0-2.6 2.8-6 5.8-6z" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
