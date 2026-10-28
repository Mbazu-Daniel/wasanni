export type { MemberView as MemberRow } from "@wasanni/contracts";

export type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};
