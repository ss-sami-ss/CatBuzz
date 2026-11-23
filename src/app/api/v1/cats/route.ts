import { catHandlers } from "@/server/cats/handlers";

export const dynamic = "force-dynamic";
export const GET = catHandlers.list;
export const POST = catHandlers.create;
