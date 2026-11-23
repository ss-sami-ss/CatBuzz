import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  // Serve the pinned worker from our own origin so Turbopack can bundle the client separately.
  const script = await readFile(join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs"), "utf8");
  return new Response(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
