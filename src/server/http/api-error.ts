import { API_ERRORS, type ApiErrorCode } from "@/shared/contracts/errors";

/** Thrown inside handlers; withApi turns it into the error envelope. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fieldErrors: Record<string, string[]>;

  constructor(code: ApiErrorCode, options: { message?: string; fieldErrors?: Record<string, string[]> } = {}) {
    super(options.message ?? API_ERRORS[code].message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = options.fieldErrors ?? {};
  }

  get status() {
    return API_ERRORS[this.code].status;
  }
}
