import type { CatCardData, PublicCatSummary } from "./cat.types";

const relative = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });

/** Persian relative "last seen" label; unknown stays explicit (docs/04 «نامشخص»). */
export function formatLastSeen(lastSeenAt: string, now: Date): string {
  const seen = new Date(lastSeenAt);
  if (Number.isNaN(seen.getTime())) return "نامشخص";
  const minutes = Math.round((seen.getTime() - now.getTime()) / 60_000);
  if (minutes > -60) return relative.format(Math.min(minutes, 0), "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

const CARE_LABELS: Record<PublicCatSummary["careStatus"], string> = {
  has_caretaker: "مراقب دارد",
  no_caretaker: "مراقب ندارد",
  unknown: "وضعیت مراقبت نامشخص",
};

export function toCatCardData(
  cat: PublicCatSummary,
  now: Date,
  tone: CatCardData["tone"],
  isSample: boolean,
): CatCardData {
  return {
    id: cat.id,
    name: cat.name ?? "بی‌نام",
    needs: cat.needs,
    lastSeenLabel: formatLastSeen(cat.lastSeenAt, now),
    areaLabel: cat.publicArea.label,
    careLabel: CARE_LABELS[cat.careStatus],
    isSample,
    tone,
  };
}
