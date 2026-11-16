import { z } from "zod";
import { AuthChallengeRequest, AuthChallengeResponse, AuthVerifyRequest } from "@/shared/contracts/auth";
import { CaregiverListQuery, PublicCaregiverSummary } from "@/shared/contracts/caregivers";
import { CatListQuery, CreateCatRequest, PublicCatSummary } from "@/shared/contracts/cats";
import { ErrorEnvelope } from "@/shared/contracts/errors";
import { MapQuery, PublicMapItem } from "@/shared/contracts/map";
import { CreatePlacementRequest, PlacementDecisionRequest } from "@/shared/contracts/placements";
import { MeDto, PublicUserSummary, UpdateMeRequest } from "@/shared/contracts/users";

/**
 * OpenAPI 3.1 document generated from the runtime zod contracts (T06), so the document and
 * the validators cannot drift. Each operation names the task that implements it; until then
 * it is a contract only and the route does not exist.
 */

type JsonSchema = Record<string, unknown>;

/** Inline every nested schema so components are self-contained and every $ref resolves. */
function toSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
  const json = z.toJSONSchema(schema, { io, unrepresentable: "any", reused: "inline", metadata: z.registry() }) as JsonSchema;
  delete json.$schema;
  return json;
}

const REQUESTS = { AuthChallengeRequest, AuthVerifyRequest, UpdateMeRequest, CreateCatRequest, CreatePlacementRequest, PlacementDecisionRequest };
const RESPONSES = { AuthChallengeResponse, MeDto, PublicUserSummary, PublicCatSummary, PublicMapItem, PublicCaregiverSummary, ErrorEnvelope };

type Operation = {
  method: "get" | "post" | "put" | "patch";
  path: string;
  summary: string;
  task: string;
  auth: boolean;
  query?: z.ZodObject;
  body?: keyof typeof REQUESTS;
  idempotent?: boolean;
  success: { status: 200 | 201; data?: keyof typeof RESPONSES; list?: boolean };
  errors: number[];
};

const OPERATIONS: Operation[] = [
  { method: "post", path: "/auth/challenges", summary: "ارسال کد فعال‌سازی", task: "T07", auth: false, body: "AuthChallengeRequest", success: { status: 201, data: "AuthChallengeResponse" }, errors: [422, 429] },
  { method: "post", path: "/auth/verify", summary: "تأیید کد و شروع نشست", task: "T07", auth: false, body: "AuthVerifyRequest", success: { status: 200, data: "MeDto" }, errors: [422, 429] },
  { method: "get", path: "/me", summary: "پروفایل خصوصی خود", task: "T08", auth: true, success: { status: 200, data: "MeDto" }, errors: [401] },
  { method: "patch", path: "/me", summary: "ویرایش پروفایل خود", task: "T08", auth: true, body: "UpdateMeRequest", success: { status: 200, data: "MeDto" }, errors: [401, 409, 422] },
  { method: "get", path: "/map", summary: "نشانگرهای عمومی نقشه", task: "T11", auth: false, query: MapQuery, success: { status: 200, data: "PublicMapItem", list: true }, errors: [422] },
  { method: "get", path: "/cats", summary: "فهرست عمومی گربه‌ها", task: "T12", auth: false, query: CatListQuery, success: { status: 200, data: "PublicCatSummary", list: true }, errors: [422] },
  { method: "post", path: "/cats", summary: "ثبت گربه", task: "T12", auth: true, body: "CreateCatRequest", success: { status: 201, data: "PublicCatSummary" }, errors: [401, 403, 422] },
  { method: "get", path: "/caregivers", summary: "جست‌وجوی نگهدارنده", task: "T28", auth: false, query: CaregiverListQuery, success: { status: 200, data: "PublicCaregiverSummary", list: true }, errors: [422] },
  { method: "post", path: "/placement-requests", summary: "درخواست نگهداری", task: "T28", auth: true, body: "CreatePlacementRequest", idempotent: true, success: { status: 201 }, errors: [401, 403, 409, 422] },
  { method: "post", path: "/placement-requests/{id}/decision", summary: "پذیرش یا رد درخواست", task: "T28", auth: true, body: "PlacementDecisionRequest", idempotent: true, success: { status: 200 }, errors: [401, 403, 404, 409, 422] },
];

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

function queryParameters(query: z.ZodObject) {
  return Object.entries(query.shape).map(([name, field]) => {
    const schema = field as z.ZodType;
    return { name, in: "query", required: !schema.safeParse(undefined).success, schema: toSchema(schema, "input") };
  });
}

function buildOperation(op: Operation) {
  const meta = { $ref: "#/components/schemas/Meta" };
  const dataSchema = op.success.data ? (op.success.list ? { type: "array", items: ref(op.success.data) } : ref(op.success.data)) : { type: "object" };
  const parameters = [
    ...(op.path.includes("{id}") ? [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }] : []),
    ...(op.query ? queryParameters(op.query) : []),
    ...(op.idempotent ? [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", minLength: 8, maxLength: 128 } }] : []),
  ];
  return {
    summary: op.summary,
    description: `پیاده‌سازی در ${op.task}؛ تا آن زمان فقط قرارداد است.`,
    "x-task": op.task,
    ...(op.auth ? { security: [{ session: [] }] } : { security: [] }),
    ...(parameters.length ? { parameters } : {}),
    ...(op.body ? { requestBody: { required: true, content: { "application/json": { schema: ref(op.body) } } } } : {}),
    responses: {
      [op.success.status]: {
        description: "موفق",
        content: { "application/json": { schema: { type: "object", required: ["data", "meta"], properties: { data: dataSchema, meta } } } },
      },
      ...Object.fromEntries(
        op.errors.map((status) => [status, { description: "خطا", content: { "application/json": { schema: ref("ErrorEnvelope") } } }]),
      ),
    },
  };
}

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of OPERATIONS) {
    paths[op.path] ??= {};
    paths[op.path]![op.method] = buildOperation(op);
  }
  const schemas: Record<string, JsonSchema> = {
    Meta: {
      type: "object",
      required: ["requestId"],
      properties: { requestId: { type: "string" }, nextCursor: { type: ["string", "null"] } },
    },
  };
  for (const [name, schema] of Object.entries(REQUESTS)) schemas[name] = toSchema(schema, "input");
  for (const [name, schema] of Object.entries(RESPONSES)) schemas[name] = toSchema(schema, "output");

  return {
    openapi: "3.1.0",
    info: { title: "CatBuzz API", version: "1.0.0-draft", description: "قرارداد /api/v1 (docs/07). عملیات بدون پیاده‌سازی با x-task مشخص شده‌اند." },
    servers: [{ url: "/api/v1" }],
    components: {
      schemas,
      securitySchemes: { session: { type: "apiKey", in: "cookie", name: "catbuzz_session" } },
    },
    paths,
  };
}
