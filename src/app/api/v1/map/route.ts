import { getDb } from "@/server/db/client";
import { createMapHandler } from "@/server/geo/map-handler";

export const dynamic = "force-dynamic";
export const GET = createMapHandler(getDb);
