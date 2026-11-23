import { catHandlers } from "@/server/cats/handlers";

export const dynamic = "force-dynamic";
export const GET = catHandlers.getColony;
export const PATCH = catHandlers.updateColony;

export const DELETE = catHandlers.archiveColony;
