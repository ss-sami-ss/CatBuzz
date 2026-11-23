import { authHandlers } from "@/server/auth/handlers";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return authHandlers().reviewCredential(request, context);
}
