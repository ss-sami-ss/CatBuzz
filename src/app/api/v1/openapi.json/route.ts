import { buildOpenApiDocument } from "@/server/http/openapi";

export const dynamic = "force-static";

/**
 * Machine-readable contract, generated from the same zod schemas the routes validate with.
 * Served raw (no data/meta envelope) so OpenAPI tools can read it directly.
 */
export function GET() {
  return Response.json(buildOpenApiDocument());
}
