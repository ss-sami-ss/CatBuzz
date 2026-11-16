import { authHandlers } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return authHandlers().verify(request);
}
