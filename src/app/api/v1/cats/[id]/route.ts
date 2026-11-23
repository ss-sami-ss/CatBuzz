import { catHandlers } from "@/server/cats/handlers";

export const dynamic = "force-dynamic";
export const GET = catHandlers.get;
export const PATCH = catHandlers.update;

export const DELETE = catHandlers.archive;
