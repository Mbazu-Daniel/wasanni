import { toast } from "sonner";

export type AuthError = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
};

const COPY: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  INVALID_PASSWORD: "The current password is not right",
  PASSWORD_TOO_SHORT: "That password is too short: use at least 8 characters",
  PASSWORD_TOO_LONG: "That password is too long",
  USER_ALREADY_EXISTS: "An account with this email already exists: sign in instead",
  USER_NOT_FOUND: "No account with that email",
  INVALID_EMAIL: "That email is not valid",
  INVALID_TOKEN: "That link or token is no longer valid",
  SESSION_NOT_FOUND: "Your session expired: sign in again",
  FAILED_TO_CREATE_USER: "Could not create your account",
  FAILED_TO_CREATE_SESSION: "Could not sign you in",
  OAUTH_NOT_CONFIGURED: "This provider is not configured yet: sign in with email",
  PROVIDER_NOT_FOUND: "This provider is not configured yet: sign in with email",
  FAILED_TO_GET_USER_INFO: "The provider did not return your profile: try again",
  ORGANIZATION_NOT_FOUND: "That organization does not exist",
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: "This organization is at its member limit",
  INVITATION_LIMIT_REACHED: "The invitation limit for this organization is reached",
  INVITATION_NOT_FOUND: "That invitation does not exist",
  INVALID_INVITATION: "That invitation is no longer valid",
  MEMBER_NOT_FOUND: "That member does not exist",
  ROLE_NOT_FOUND: "That role does not exist",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "That user is already a member",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "That user is already invited",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS: "You are not allowed to invite members",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: "You cannot invite with that role",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_INVITATION: "You cannot cancel this invitation",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_MEMBER: "You cannot change this member",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_MEMBER: "You cannot remove this member",
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION: "You are not a member of this organization",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "This invitation is for a different email",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
    "You are the only owner: transfer ownership first",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: "The organization needs an owner first",
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
    "Verify your email before accepting the invitation",
  EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION: "Verify your email before accepting the invitation",
};

export function authErrorMessage(error: AuthError | null | undefined, fallback: string): string {
  if (error?.status === 0) {
    return "Can't reach the server: check your connection and try again.";
  }
  const code = error?.code;
  if (typeof code === "string" && COPY[code] !== undefined) return COPY[code];
  if (error?.message) return error.message;
  if (typeof code === "string" && code !== "") {
    const humanized = code.toLowerCase().split("_").join(" ");
    return `${humanized.slice(0, 1).toUpperCase()}${humanized.slice(1)}`;
  }
  return fallback;
}

export function toastAuthError(error: AuthError | null | undefined, fallback: string): void {
  toast.error(authErrorMessage(error, fallback));
}
