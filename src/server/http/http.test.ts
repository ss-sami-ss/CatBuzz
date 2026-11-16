import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ErrorEnvelope } from "@/shared/contracts/errors";
import { ApiError } from "./api-error";
import { decodeCursor, encodeCursor } from "./cursor";
import { buildOpenApiDocument } from "./openapi";
import { ok, parseJson, parseQuery, withApi } from "./respond";

const SECRET = "test-only-cursor-secret";

describe("cursor", () => {
  const position = { sortKey: "2026-11-14T08:00:00.000Z", id: "3f1c2a64-8c1e-4d6b-9f3a-2b7e5c4d1a90" };

  it("round-trips a keyset position", () => {
    expect(decodeCursor(encodeCursor(position, SECRET), SECRET)).toEqual(position);
  });

  it("rejects tampered, foreign and malformed cursors", () => {
    const cursor = encodeCursor(position, SECRET);
    const [payload, signature] = cursor.split(".");
    const forged = Buffer.from(JSON.stringify(["2030-01-01", position.id])).toString("base64url");
    for (const bad of [`${forged}.${signature}`, encodeCursor(position, "other-secret"), `${payload}`, "a.b.c", "", "%%%.%%%"]) {
      expect(() => decodeCursor(bad, SECRET)).toThrowError(ApiError);
    }
  });
});

describe("responses", () => {
  const request = (init?: RequestInit, url = "http://localhost/api/v1/x") => new Request(url, init);

  it("wraps data with meta and disables caching by default", async () => {
    const res = ok({ requestId: "req-12345678" }, { id: 1 }, { nextCursor: null });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ data: { id: 1 }, meta: { requestId: "req-12345678", nextCursor: null } });
  });

  it("returns 422 with Persian field errors in the documented envelope", async () => {
    const handler = withApi(async (req) => {
      await parseJson(req, z.object({ name: z.string().min(2) }));
      return new Response("unreachable");
    });
    const res = await handler(request({ method: "POST", body: JSON.stringify({ name: "a" }) }));
    expect(res.status).toBe(422);
    const body = ErrorEnvelope.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.fieldErrors.name?.[0]).toMatch(/[؀-ۿ]/);
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
  });

  it("maps broken JSON to 400 and bad queries to 422", async () => {
    const handler = withApi(async (req) => {
      if (req.method === "POST") await parseJson(req, z.object({}));
      else parseQuery(req, z.object({ limit: z.coerce.number().max(100) }));
      return new Response("unreachable");
    });
    expect((await handler(request({ method: "POST", body: "{oops" }))).status).toBe(400);
    expect((await handler(request(undefined, "http://localhost/api/v1/x?limit=500"))).status).toBe(422);
  });

  it("hides internal errors behind INTERNAL with the request id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApi(() => {
      throw new Error("db password is hunter2");
    });
    const res = await handler(request({ headers: { "x-request-id": "trace-abcdef12" } }));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text)).toMatchObject({ error: { code: "INTERNAL" }, requestId: "trace-abcdef12" });
    spy.mockRestore();
  });

  it("maps domain conflicts to 409", async () => {
    const handler = withApi(() => {
      throw new ApiError("CAREGIVER_CAPACITY_FULL");
    });
    const res = await handler(request());
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe("ظرفیت نگهدارنده در این بازه تکمیل است.");
  });
});

describe("OpenAPI document", () => {
  const doc = buildOpenApiDocument();

  it("is OpenAPI 3.1 with the core public schemas", () => {
    expect(doc.openapi).toBe("3.1.0");
    for (const name of ["PublicCatSummary", "PublicMapItem", "PublicCaregiverSummary", "ErrorEnvelope", "MeDto"]) {
      expect(doc.components.schemas).toHaveProperty(name);
    }
  });

  it("resolves every $ref", () => {
    const refs = JSON.stringify(doc).match(/"\$ref":"([^"]+)"/g) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    for (const raw of refs) {
      const name = raw.replace(/^"\$ref":"#\/components\/schemas\//, "").replace(/"$/, "");
      expect(doc.components.schemas, raw).toHaveProperty(name);
    }
  });

  it("documents the Idempotency-Key header on placement mutations", () => {
    const op = doc.paths["/placement-requests"]?.post as { parameters: { name: string; required: boolean }[] };
    expect(op.parameters).toContainEqual(expect.objectContaining({ name: "Idempotency-Key", required: true }));
  });
});
