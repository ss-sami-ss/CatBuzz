import { authHandlers } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return authHandlers().me(request);
}
