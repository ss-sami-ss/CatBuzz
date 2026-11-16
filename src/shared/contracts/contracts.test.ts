import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toAsciiDigits } from "../validation/digits";
import { AuthVerifyRequest } from "./auth";
import { PublicCaregiverSummary } from "./caregivers";
import { PublicCatSummary } from "./cats";
import { BboxParam, PageQuery } from "./common";
import { MapQuery, PublicMapItem } from "./map";
import { CreatePlacementRequest, PlacementDecisionRequest } from "./placements";
import { PublicUserSummary } from "./users";

const UUID = "3f1c2a64-8c1e-4d6b-9f3a-2b7e5c4d1a90";

/** Keys that must never exist anywhere in a public DTO (docs/07, docs/09). */
const FORBIDDEN_PUBLIC_KEYS = ["exactLocation", "location", "lat", "lng", "address", "phone", "ownerPhone", "realName", "firstName", "lastName", "email", "rawExif", "distance", "distanceMeters"];

function collectKeys(schema: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) schema.forEach((item) => collectKeys(item, keys));
  else if (schema && typeof schema === "object") {
    for (const [key, value] of Object.entries(schema)) {
      if (key === "properties" && value && typeof value === "object") Object.keys(value).forEach((k) => keys.add(k));
      collectKeys(value, keys);
    }
  }
  return keys;
}

describe("public DTOs leak nothing private", () => {
  it.each([
    ["PublicCatSummary", PublicCatSummary],
    ["PublicMapItem", PublicMapItem],
    ["PublicCaregiverSummary", PublicCaregiverSummary],
    ["PublicUserSummary", PublicUserSummary],
  ])("%s has no private keys", (_name, schema) => {
    const keys = collectKeys(z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }));
    expect(FORBIDDEN_PUBLIC_KEYS.filter((key) => keys.has(key))).toEqual([]);
  });

  it("strips private fields a buggy query might return", () => {
    const parsed = PublicCatSummary.parse({
      id: UUID,
      name: "نارنج",
      needs: ["medical"],
      lastSeenAt: "2026-11-14T08:00:00Z",
      publicArea: { cellId: "c1", label: "محلهٔ نمونه", approximate: true },
      careStatus: "unknown",
      thumbnailUrl: null,
      exactLocation: { lat: 35.7, lng: 51.4 },
      ownerPhone: "0912",
    });
    expect(parsed).not.toHaveProperty("exactLocation");
    expect(parsed).not.toHaveProperty("ownerPhone");
  });
});

describe("caregiver trust (D21)", () => {
  const base = {
    id: UUID,
    username: "sample_caregiver",
    publicArea: { cellId: "public-cell", label: "محلهٔ نمونه", approximate: true },
    serviceKinds: ["foster", "sitting"],
    modes: ["host_home"],
    capacity: 2,
    pricing: { type: "free" },
    home: { otherPets: false, children: false, postOpCare: true, medication: ["oral"] },
    trust: { source: "user_reviews", platformVerified: false, reviewsCount: 0, averageRating: null, completedPlacements: 0 },
  };

  it("accepts the docs/07 sample", () => {
    expect(PublicCaregiverSummary.safeParse(base).success).toBe(true);
  });

  it("rejects platformVerified: true — the platform never verifies caregivers", () => {
    expect(PublicCaregiverSummary.safeParse({ ...base, trust: { ...base.trust, platformVerified: true } }).success).toBe(false);
  });

  it("hides the average until three reviews exist", () => {
    const early = { ...base, trust: { ...base.trust, reviewsCount: 2, averageRating: 4.5 } };
    expect(PublicCaregiverSummary.safeParse(early).success).toBe(false);
    const enough = { ...base, trust: { ...base.trust, reviewsCount: 3, averageRating: 4.5 } };
    expect(PublicCaregiverSummary.safeParse(enough).success).toBe(true);
  });
});

describe("query validation", () => {
  it("defaults and caps the page size", () => {
    expect(PageQuery.parse({})).toEqual({ limit: 20 });
    expect(PageQuery.parse({ limit: "100" }).limit).toBe(100);
    expect(PageQuery.safeParse({ limit: "101" }).success).toBe(false);
    expect(PageQuery.safeParse({ limit: "0" }).success).toBe(false);
  });

  it("accepts a bounded bbox and rejects malformed or huge ones", () => {
    expect(BboxParam.parse("51.3,35.6,51.5,35.8")).toEqual({ minLng: 51.3, minLat: 35.6, maxLng: 51.5, maxLat: 35.8 });
    expect(BboxParam.safeParse("51.5,35.6,51.3,35.8").success).toBe(false);
    expect(BboxParam.safeParse("1,2,3").success).toBe(false);
    expect(BboxParam.safeParse("40,30,50,40").success).toBe(false);
  });

  it("parses map filters", () => {
    const query = MapQuery.parse({ bbox: "51.3,35.6,51.5,35.8", zoom: "14", needs: "urgent,medical" });
    expect(query.zoom).toBe(14);
    expect(query.needs).toEqual(["urgent", "medical"]);
    expect(MapQuery.safeParse({ bbox: "51.3,35.6,51.5,35.8", zoom: "14", needs: "unknown_need" }).success).toBe(false);
  });
});

describe("request bodies", () => {
  it("accepts verification codes typed with Persian digits", () => {
    expect(toAsciiDigits("۱۲۳٤٥٦")).toBe("123456");
    expect(AuthVerifyRequest.parse({ challengeId: UUID, code: "۱۲۳ ۴۵۶" }).code).toBe("123456");
    expect(AuthVerifyRequest.safeParse({ challengeId: UUID, code: "12345" }).success).toBe(false);
  });

  it("requires the placement end after its start and no duplicate cats", () => {
    const valid = { catIds: [UUID], caregiverId: UUID, kind: "sitting", mode: "host_home", from: "2026-12-01", to: "2026-12-05" };
    expect(CreatePlacementRequest.safeParse(valid).success).toBe(true);
    expect(CreatePlacementRequest.safeParse({ ...valid, to: "2026-11-30" }).success).toBe(false);
    expect(CreatePlacementRequest.safeParse({ ...valid, catIds: [UUID, UUID] }).success).toBe(false);
  });

  it("requires a reason only when declining", () => {
    expect(PlacementDecisionRequest.safeParse({ decision: "accept", version: 1 }).success).toBe(true);
    expect(PlacementDecisionRequest.safeParse({ decision: "decline", version: 1 }).success).toBe(false);
    expect(PlacementDecisionRequest.safeParse({ decision: "decline", version: 1, declineReason: "ظرفیت ندارم" }).success).toBe(true);
  });
});
