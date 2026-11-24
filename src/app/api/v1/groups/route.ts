import { groupHandlers } from "@/server/groups/handlers";

export const dynamic = "force-dynamic";
export const GET = groupHandlers.list;
export const POST = groupHandlers.create;
