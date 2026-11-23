import type { Capability, MeDto } from "@/shared/contracts/users";
import type { ErrorEnvelope } from "@/shared/contracts/errors";

type Failure = ErrorEnvelope["error"];
type Account = { me: MeDto; capabilities: Capability[] };
type Challenge = { challengeId: string; expiresAt: string };
type Screen =
  | { kind: "loading" }
  | { kind: "retry" }
  | { kind: "email" }
  | { kind: "code"; challenge: Challenge; email: string }
  | { kind: "account"; account: Account };

export type Model = { screen: Screen; busy: boolean; error?: Failure; notice?: string };
type Intent =
  | { type: "start" }
  | { type: "show"; screen: Screen; notice?: string }
  | { type: "error"; error: Failure; screen?: Screen };

export const initialModel: Model = { screen: { kind: "loading" }, busy: false };

export function reduceAccount(model: Model, intent: Intent): Model {
  switch (intent.type) {
    case "start":
      return { screen: model.screen, busy: true };
    case "show":
      return { screen: intent.screen, busy: false, notice: intent.notice };
    case "error":
      return { screen: intent.screen ?? model.screen, busy: false, error: intent.error };
  }
}

class AccountError extends Error {
  constructor(readonly failure: Failure) {
    super(failure.message);
  }
}

export function accountFailure(error: unknown): Failure {
  if (error instanceof AccountError) return error.failure;
  return { code: "INTERNAL", message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.", fieldErrors: {} };
}

async function request<T>(path: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    cache: "no-store",
    ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new AccountError(result.error);
  return result.data as T;
}

export const accountApi = {
  async load(): Promise<Account> {
    const [me, { capabilities }] = await Promise.all([
      request<MeDto>("/me"),
      request<{ capabilities: Capability[] }>("/me/capabilities"),
    ]);
    return { me, capabilities };
  },
  challenge(email: string, purpose: "sign_in" | "sign_up") {
    return request<Challenge>("/auth/challenges", "POST", { contact: { kind: "email", value: email }, purpose });
  },
  verify(challengeId: string, code: string) {
    return request<MeDto>("/auth/verify", "POST", { challengeId, code });
  },
  updateProfile(profile: { version: number; username: string; firstName: string; lastName: string }) {
    return request<MeDto>("/me", "PATCH", profile);
  },
  updateCapabilities(capabilities: Capability[]) {
    return request<{ capabilities: Capability[] }>("/me/capabilities", "PUT", { capabilities });
  },
  logout() {
    return request<void>("/auth/logout", "POST");
  },
};
