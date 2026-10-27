import { STATUS } from "@wasanni/contracts";
import type { ErrorCode, ErrorSource } from "@wasanni/contracts";
import { AppError } from "@wasanni/kit";

export type Failure = { status: number; source: ErrorSource };

type DelegatedError = {
  name?: string;
  body?: { code?: string; message?: string };
};

const DELEGATED: Readonly<Record<string, ErrorCode>> = {
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION: "conflict",
  EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION: "conflict",
  INVITATION_LIMIT_REACHED: "conflict",
  INVITATION_NOT_FOUND: "not_found",
  MEMBER_NOT_FOUND: "not_found",
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: "conflict",
  ORGANIZATION_NOT_FOUND: "not_found",
  ROLE_NOT_FOUND: "bad_request",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "conflict",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "conflict",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: "bad_request",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "forbidden",
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION: "forbidden",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "forbidden",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: "conflict",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: "conflict",
};

export function failureOf(error: unknown): Failure {
  if (error instanceof AppError) {
    return { status: error.status, source: { code: error.code, message: error.message } };
  }

  const delegated = error as DelegatedError | null;

  if (delegated?.name === "APIError") {
    const code = DELEGATED[delegated.body?.code ?? ""] ?? "bad_request";

    return {
      status: STATUS[code],
      source: { code, message: delegated.body?.message ?? "the request was refused" },
    };
  }

  return { status: 500, source: { code: "internal", message: "internal error" } };
}
