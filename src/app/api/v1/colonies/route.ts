import { catHandlers } from "@/server/cats/handlers";

export const dynamic = "force-dynamic";
export const GET = catHandlers.listColonies;
export const POST = catHandlers.createColony;
