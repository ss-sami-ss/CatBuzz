import { z } from "zod";
import { AuthChallengeRequest, AuthChallengeResponse, AuthVerifyRequest } from "@/shared/contracts/auth";
import { CareLogReceipt, CareLogRequest, ConfirmHealthRequest, HealthConfirmation, HealthReportReceipt, HealthReportRequest, PrivateCareLog, PrivateHealthRecord, PublicHealthRecord } from "@/shared/contracts/care";
import { CaregiverListQuery, PublicCaregiverSummary } from "@/shared/contracts/caregivers";
import { CatListQuery, CreateCatRequest, CreateSightingRequest, PublicCatDetail, PublicCatSummary, SightingReceipt, UpdateCatRequest } from "@/shared/contracts/cats";
import { ChangeCaretakerRequest, ChangeMembershipRequest, CreateColonyRequest, PublicColony, UpdateColonyRequest } from "@/shared/contracts/colonies";
import { PublicClinic } from "@/shared/contracts/clinics";
import { ArchiveRequest, PageQuery } from "@/shared/contracts/common";
import { MergeReceipt, MergeRequest, SimilarCat } from "@/shared/contracts/duplicates";
import { ErrorEnvelope } from "@/shared/contracts/errors";
import { HelpReportDto, HelpRequestInput, ResolveHelpInput, TriageInput } from "@/shared/contracts/help";
import { AcceptanceDto, CreateMissionInput, MissionAcceptanceInput, MissionDto, MissionListItem, MissionQuery, MissionUpdateInput } from "@/shared/contracts/missions";
import { MapQuery, PublicMapItem } from "@/shared/contracts/map";
import { CreatePlacementRequest, PlacementDecisionRequest } from "@/shared/contracts/placements";
import { ReadyImageDto, SignedImageDto, UploadIntentDto, UploadIntentRequest } from "@/shared/contracts/uploads";
import { CapabilitiesDto, CredentialReviewRequest, CredentialStatusDto, MeDto, PublicUserSummary, PutCapabilitiesRequest, UpdateMeRequest } from "@/shared/contracts/users";

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

const REQUESTS = { CreateMissionInput, MissionAcceptanceInput, MissionUpdateInput, HelpRequestInput, TriageInput, ResolveHelpInput, MergeRequest, CareLogRequest, ConfirmHealthRequest, HealthReportRequest, UploadIntentRequest, ArchiveRequest, UpdateCatRequest, CreateSightingRequest, ChangeCaretakerRequest, ChangeMembershipRequest, CreateColonyRequest, UpdateColonyRequest, CredentialReviewRequest, AuthChallengeRequest, AuthVerifyRequest, UpdateMeRequest, PutCapabilitiesRequest, CreateCatRequest, CreatePlacementRequest, PlacementDecisionRequest };
const RESPONSES = { AcceptanceDto, MissionDto, MissionListItem, HelpReportDto, PublicClinic, MergeReceipt, SimilarCat, CareLogReceipt, HealthConfirmation, HealthReportReceipt, PrivateCareLog, PrivateHealthRecord, PublicHealthRecord, ReadyImageDto, SignedImageDto, UploadIntentDto, PublicCatDetail, PublicColony, SightingReceipt, AuthChallengeResponse, MeDto, CapabilitiesDto, CredentialStatusDto, PublicUserSummary, PublicCatSummary, PublicMapItem, PublicCaregiverSummary, ErrorEnvelope };

type Operation = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  task: string;
  auth: boolean;
  query?: z.ZodObject;
  body?: keyof typeof REQUESTS;
  idempotent?: boolean;
  imageBody?: boolean;
  success: { status: 200 | 201 | 204; data?: keyof typeof RESPONSES; list?: boolean; jpeg?: boolean };
  errors: number[];
};

const signedQuery = z.object({ token: z.string().min(1).max(512) });

const OPERATIONS: Operation[] = [
  { method: "post", path: "/auth/challenges", summary: "ارسال کد فعال‌سازی", task: "T07", auth: false, body: "AuthChallengeRequest", success: { status: 201, data: "AuthChallengeResponse" }, errors: [422, 429] },
  { method: "post", path: "/auth/verify", summary: "تأیید کد و شروع نشست", task: "T07", auth: false, body: "AuthVerifyRequest", success: { status: 200, data: "MeDto" }, errors: [422, 429] },
  { method: "post", path: "/auth/logout", summary: "خروج (all=1 برای همهٔ دستگاه‌ها)", task: "T07", auth: true, success: { status: 204 }, errors: [403] },
  { method: "get", path: "/me", summary: "پروفایل خصوصی خود", task: "T07", auth: true, success: { status: 200, data: "MeDto" }, errors: [401] },
  { method: "patch", path: "/me", summary: "ویرایش پروفایل خود", task: "T08", auth: true, body: "UpdateMeRequest", success: { status: 200, data: "MeDto" }, errors: [401, 403, 409, 422] },
  { method: "get", path: "/me/capabilities", summary: "توانمندی‌های خود", task: "T08", auth: true, success: { status: 200, data: "CapabilitiesDto" }, errors: [401] },
  { method: "put", path: "/me/capabilities", summary: "تعیین توانمندی‌ها (صلاحیت دامپزشکی از این مسیر نیست)", task: "T08", auth: true, body: "PutCapabilitiesRequest", success: { status: 200, data: "CapabilitiesDto" }, errors: [401, 403, 422] },
  { method: "get", path: "/me/credentials", summary: "وضعیت صلاحیت‌های حرفه‌ای خود", task: "T09", auth: true, success: { status: 200, data: "CredentialStatusDto", list: true }, errors: [401] },
  { method: "post", path: "/credentials/{id}/review", summary: "ثبت تصمیم بازبین صلاحیت", task: "T09", auth: true, body: "CredentialReviewRequest", success: { status: 200, data: "CredentialStatusDto" }, errors: [400, 401, 403, 404, 409, 422] },
  { method: "get", path: "/map", summary: "نشانگرهای عمومی نقشه", task: "T11", auth: false, query: MapQuery, success: { status: 200, data: "PublicMapItem", list: true }, errors: [422] },
  { method: "get", path: "/cats", summary: "فهرست عمومی گربه‌ها", task: "T12", auth: false, query: CatListQuery, success: { status: 200, data: "PublicCatSummary", list: true }, errors: [422] },
  { method: "post", path: "/cats", summary: "ثبت گربه", task: "T12", auth: true, body: "CreateCatRequest", success: { status: 201, data: "PublicCatDetail" }, errors: [401, 403, 422] },
  { method: "get", path: "/cats/{id}", summary: "پروندهٔ عمومی گربه", task: "T12", auth: false, success: { status: 200, data: "PublicCatDetail" }, errors: [404] },
  { method: "patch", path: "/cats/{id}", summary: "ویرایش نسخه‌دار گربه", task: "T12", auth: true, body: "UpdateCatRequest", success: { status: 200, data: "PublicCatDetail" }, errors: [401, 403, 404, 409, 422] },
  { method: "delete", path: "/cats/{id}", summary: "بایگانی گربه", task: "T12", auth: true, body: "ArchiveRequest", success: { status: 204 }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/cats/{id}/sightings", summary: "ثبت مشاهدهٔ خصوصی", task: "T12", auth: true, body: "CreateSightingRequest", success: { status: 201, data: "SightingReceipt" }, errors: [401, 403, 404, 422] },
  { method: "get", path: "/colonies", summary: "فهرست عمومی کلونی‌ها", task: "T12", auth: false, query: PageQuery, success: { status: 200, data: "PublicColony", list: true }, errors: [422] },
  { method: "post", path: "/colonies", summary: "ایجاد کلونی", task: "T12", auth: true, body: "CreateColonyRequest", success: { status: 201, data: "PublicColony" }, errors: [401, 403, 422] },
  { method: "get", path: "/colonies/{id}", summary: "کلونی عمومی", task: "T12", auth: false, success: { status: 200, data: "PublicColony" }, errors: [404] },
  { method: "patch", path: "/colonies/{id}", summary: "ویرایش نسخه‌دار کلونی", task: "T12", auth: true, body: "UpdateColonyRequest", success: { status: 200, data: "PublicColony" }, errors: [401, 403, 404, 409, 422] },
  { method: "delete", path: "/colonies/{id}", summary: "بایگانی کلونی", task: "T12", auth: true, body: "ArchiveRequest", success: { status: 204 }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/colonies/{id}/memberships", summary: "ثبت شروع یا پایان عضویت گربه", task: "T12", auth: true, body: "ChangeMembershipRequest", success: { status: 200, data: "PublicColony" }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/colonies/{id}/caretakers", summary: "تعیین یا لغو مراقب کلونی", task: "T12", auth: true, body: "ChangeCaretakerRequest", success: { status: 200, data: "PublicColony" }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/uploads/intents", summary: "ایجاد مجوز آپلود عکس خصوصی", task: "T13", auth: true, body: "UploadIntentRequest", success: { status: 201, data: "UploadIntentDto" }, errors: [401, 403, 422, 429, 503] },
  { method: "put", path: "/uploads/{id}/content", summary: "بارگذاری بایت عکس در قرنطینه", task: "T13", auth: true, query: signedQuery, imageBody: true, success: { status: 204 }, errors: [401, 403, 404, 409, 422, 429, 503] },
  { method: "post", path: "/uploads/{id}/complete", summary: "بررسی و پاک‌سازی عکس", task: "T13", auth: true, success: { status: 200, data: "ReadyImageDto" }, errors: [401, 403, 404, 409, 422, 429, 503] },
  { method: "get", path: "/uploads/{id}/access", summary: "دریافت پیوند امضاشدهٔ عکس آماده", task: "T13", auth: true, success: { status: 200, data: "SignedImageDto" }, errors: [401, 403, 404] },
  { method: "get", path: "/uploads/{id}/content", summary: "دریافت عکس خصوصی پاک‌سازی‌شده", task: "T13", auth: true, query: signedQuery, success: { status: 200, jpeg: true }, errors: [401, 403, 404, 503] },
  { method: "get", path: "/public-images/{id}", summary: "عکس پاک‌سازی‌شدهٔ پروندهٔ عمومی", task: "T14", auth: false, success: { status: 200, jpeg: true }, errors: [404, 503] },
  { method: "get", path: "/cats/{id}/health-records", summary: "خلاصهٔ عمومی سوابق تأییدشده", task: "T15", auth: false, success: { status: 200, data: "PublicHealthRecord", list: true }, errors: [404] },
  { method: "post", path: "/cats/{id}/health-records", summary: "ثبت گزارش یا اصلاح سابقه", task: "T15", auth: true, body: "HealthReportRequest", success: { status: 201, data: "HealthReportReceipt" }, errors: [401, 403, 404, 422] },
  { method: "get", path: "/cats/{id}/health-records/private", summary: "سوابق پزشکی با کنترل دسترسی", task: "T15", auth: true, success: { status: 200, data: "PrivateHealthRecord", list: true }, errors: [401, 403, 404] },
  { method: "post", path: "/health-records/{id}/confirm", summary: "تأیید و انتخاب انتشار توسط دامپزشک مرتبط", task: "T15", auth: true, body: "ConfirmHealthRequest", success: { status: 200, data: "HealthConfirmation" }, errors: [401, 403, 404, 409, 422] },
  { method: "get", path: "/cats/{id}/care-logs", summary: "یادداشت‌های مجاز مراقبت", task: "T15", auth: true, success: { status: 200, data: "PrivateCareLog", list: true }, errors: [401, 403, 404] },
  { method: "post", path: "/cats/{id}/care-logs", summary: "ثبت مراقبت غیرپزشکی", task: "T15", auth: true, body: "CareLogRequest", success: { status: 201, data: "CareLogReceipt" }, errors: [401, 403, 404, 422] },
  { method: "get", path: "/cats/{id}/similar", summary: "پرونده‌های همسایه برای مقایسهٔ دستی", task: "T16", auth: false, success: { status: 200, data: "SimilarCat", list: true }, errors: [404] },
  { method: "post", path: "/cats/{id}/merge-requests", summary: "ثبت درخواست بررسی ادغام", task: "T16", auth: true, body: "MergeRequest", success: { status: 201, data: "MergeReceipt" }, errors: [401, 403, 404, 409, 422] },
  { method: "get", path: "/clinics", summary: "فهرست عمومی کلینیک‌ها", task: "T17", auth: false, query: PageQuery, success: { status: 200, data: "PublicClinic", list: true }, errors: [422] },
  { method: "get", path: "/clinics/{id}", summary: "پروفایل عمومی کلینیک", task: "T17", auth: false, success: { status: 200, data: "PublicClinic" }, errors: [404] },
  { method: "get", path: "/help-requests", summary: "فهرست گزارش‌های مجاز", task: "T18", auth: true, success: { status: 200, data: "HelpReportDto", list: true }, errors: [401, 403] },
  { method: "post", path: "/help-requests", summary: "ثبت گزارش با شواهد خصوصی", task: "T18", auth: true, body: "HelpRequestInput", success: { status: 201, data: "HelpReportDto" }, errors: [401, 403, 404, 422, 429, 503] },
  { method: "get", path: "/help-requests/{id}", summary: "خواندن گزارش مجاز", task: "T18", auth: true, success: { status: 200, data: "HelpReportDto" }, errors: [401, 403, 404] },
  { method: "post", path: "/help-requests/{id}/triage", summary: "تعیین شدت، مسئول و مهلت", task: "T18", auth: true, body: "TriageInput", success: { status: 200, data: "HelpReportDto" }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/help-requests/{id}/resolve", summary: "پایان رسیدگی با پاسخ ثبت‌شده", task: "T18", auth: true, body: "ResolveHelpInput", success: { status: 200, data: "HelpReportDto" }, errors: [401, 403, 404, 409, 422] },
  { method: "get", path: "/help-requests/{id}/evidence/{mediaId}", summary: "خواندن عکس خصوصی گزارش", task: "T18", auth: true, success: { status: 200, jpeg: true }, errors: [401, 403, 404, 503] },
  { method: "get", path: "/missions", summary: "فهرست مأموریت‌ها", task: "T19", auth: true, query: MissionQuery, success: { status: 200, data: "MissionListItem", list: true }, errors: [401, 403, 422] },
  { method: "post", path: "/missions", summary: "ایجاد مأموریت توسط مسئول گزارش", task: "T19", auth: true, body: "CreateMissionInput", success: { status: 201, data: "MissionDto" }, errors: [401, 403, 404, 409, 422] },
  { method: "post", path: "/missions/{id}/acceptances", summary: "پذیرش اتمیک مأموریت", task: "T19", auth: true, body: "MissionAcceptanceInput", idempotent: true, success: { status: 201, data: "AcceptanceDto" }, errors: [400, 401, 403, 404, 409, 422] },
  { method: "post", path: "/missions/{id}/updates", summary: "انصراف، ثبت نتیجه یا تأیید پایان مأموریت", task: "T19", auth: true, body: "MissionUpdateInput", success: { status: 200, data: "MissionDto" }, errors: [401, 403, 404, 409, 422] },
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
    ...Array.from(op.path.matchAll(/\{(\w+)\}/g), ([, name]) => ({
      name, in: "path", required: true, schema: { type: "string", format: "uuid" },
    })),
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
    ...(op.imageBody ? { requestBody: { required: true, content: Object.fromEntries(
      ["image/jpeg", "image/png", "image/webp"].map((type) => [type, { schema: { type: "string", format: "binary" } }]),
    ) } } : {}),
    responses: {
      [op.success.status]:
        op.success.status === 204
          ? { description: "موفق، بدون بدنه" }
          : {
              description: "موفق",
              content: op.success.jpeg
                ? { "image/jpeg": { schema: { type: "string", format: "binary" } } }
                : { "application/json": { schema: { type: "object", required: ["data", "meta"], properties: { data: dataSchema, meta } } } },
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
