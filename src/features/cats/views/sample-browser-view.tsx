"use client";

import { DetailsSurface } from "@/components/motion/details-surface";
import { staggerItemProps } from "@/components/motion/stagger";
import { useDelayedVisibility } from "@/components/motion/use-delayed-visibility";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSampleBrowserController } from "../application/use-sample-browser-controller";
import { CatCard } from "../components/cat-card";
import { NeedBadge } from "../components/need-badge";
import type { CatCardData } from "../model/cat.types";
import styles from "./sample-browser-view.module.css";

export function SampleBrowserView({ cats }: { cats: CatCardData[] }) {
  const { state, send } = useSampleBrowserController();
  const reloading = state.status === "reloading";
  const showSkeleton = useDelayedVisibility(reloading);
  const selected = cats.find((cat) => cat.id === state.selectedCatId) ?? null;
  // Stagger only for fresh results inside the page, not on first paint (docs/18 §4).
  const stagger = state.listVersion > 0;

  return (
    <main className={styles.page}>
      <p className={styles.sampleBanner} role="note">
        صفحهٔ نمونهٔ طراحی — همهٔ داده‌ها ساختگی‌اند و هیچ درخواستی به سرور فرستاده نمی‌شود.
      </p>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>گربه‌های نزدیک (نمونه)</h1>
          <p className={styles.subtitle}>کارت گربه، stagger، skeleton و bottom sheet / Dialog</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => send({ type: "reload/requested" })}
          disabled={reloading}
          aria-describedby="reload-hint"
        >
          شبیه‌سازی بارگذاری
        </Button>
        <p id="reload-hint" className={styles.visuallyHidden}>
          یک بارگذاری ساختگی ۱٫۲ ثانیه‌ای اجرا می‌شود تا skeleton و ورود کارت‌ها دیده شود.
        </p>
      </header>

      <section aria-label="فهرست گربه‌ها" aria-busy={reloading}>
        {showSkeleton ? (
          <ul className={styles.grid}>
            {cats.slice(0, 4).map((cat) => (
              <li key={cat.id} className={styles.skeletonCard}>
                <div className={styles.skeletonText}>
                  <Skeleton width="55%" height="1.25rem" />
                  <Skeleton width="40%" height="1.25rem" radius="var(--radius-pill)" />
                  <Skeleton width="70%" />
                  <Skeleton width="50%" height="2.5rem" radius="var(--radius-md)" />
                </div>
                <Skeleton width="112px" height="132px" radius="var(--radius-md)" />
              </li>
            ))}
          </ul>
        ) : (
          <ul key={state.listVersion} className={styles.grid}>
            {cats.map((cat, index) => {
              const motion = stagger ? staggerItemProps(index) : undefined;
              return (
                <li key={cat.id} className={motion?.className} style={motion?.style}>
                  <CatCard
                    cat={cat}
                    selected={cat.id === state.selectedCatId}
                    onSelect={(catId) => send({ type: "cat/selected", catId })}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className={styles.visuallyHidden} aria-live="polite">
        {state.listVersion > 0 && !reloading ? "فهرست به‌روز شد." : ""}
      </p>

      <DetailsSurface
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) send({ type: "details/closed" });
        }}
        title={selected?.name ?? ""}
        description={selected ? `${selected.areaLabel} — آخرین مشاهده: ${selected.lastSeenLabel}` : undefined}
      >
        {selected ? <CatDetails cat={selected} /> : null}
      </DetailsSurface>
    </main>
  );
}

function CatDetails({ cat }: { cat: CatCardData }) {
  return (
    <div className={styles.details}>
      <ul className={styles.detailNeeds} aria-label="نیازها">
        {cat.needs.map((need) => (
          <li key={need}>
            <NeedBadge need={need} />
          </li>
        ))}
      </ul>
      <dl className={styles.facts}>
        <div>
          <dt>آخرین مشاهده</dt>
          <dd>{cat.lastSeenLabel}</dd>
        </div>
        <div>
          <dt>محدوده</dt>
          <dd>{cat.areaLabel} (تقریبی)</dd>
        </div>
        <div>
          <dt>مراقبت</dt>
          <dd>{cat.careLabel}</dd>
        </div>
      </dl>
      <p className={styles.notice}>
        این کارت نمونه است. صفحهٔ پرونده و «کمک می‌کنم» هنوز ساخته یا به سرور متصل نشده‌اند.
      </p>
      <div className={styles.actions}>
        <Button block disabled>
          کمک می‌کنم
        </Button>
        <Button block variant="secondary" disabled>
          مشاهدهٔ پرونده
        </Button>
      </div>
    </div>
  );
}
