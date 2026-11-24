import { careHandlers } from "@/server/care/handlers";

export const dynamic = "force-dynamic";
export const GET = careHandlers.publicHealth;
export const POST = careHandlers.report;
