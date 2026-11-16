import { describe, expect, it } from "vitest";
import { formatLastSeen, toCatCardData } from "./cat-card.mapper";

const now = new Date("2026-11-15T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("formatLastSeen", () => {
  it("uses minutes under an hour", () => {
    expect(formatLastSeen(ago(30), now)).toBe(new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" }).format(-30, "minute"));
  });

  it("uses hours under a day", () => {
    expect(formatLastSeen(ago(5 * 60), now)).toBe(new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" }).format(-5, "hour"));
  });

  it("uses days beyond a day", () => {
    expect(formatLastSeen(ago(50 * 60), now)).toBe(new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" }).format(-2, "day"));
  });

  it("says unknown for invalid timestamps", () => {
    expect(formatLastSeen("not-a-date", now)).toBe("نامشخص");
  });
});

describe("toCatCardData", () => {
  it("labels unnamed cats explicitly", () => {
    const card = toCatCardData(
      { id: "c1", name: null, needs: [], lastSeenAt: ago(10), publicArea: { cellId: "cell-1", label: "محله", approximate: true }, careStatus: "unknown", thumbnailUrl: null },
      now,
      "smoke",
      true,
    );
    expect(card.name).toBe("بی‌نام");
    expect(card.careLabel).toBe("وضعیت مراقبت نامشخص");
    expect(card.isSample).toBe(true);
  });
});
