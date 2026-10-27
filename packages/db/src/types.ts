import type { GameSessionStatus } from "@wasanni/contracts";
import type { createDb } from "./client.ts";

export type Db = ReturnType<typeof createDb>["db"];

export type ApiKeyCredential = {
  id: string;
  organizationId: string;
  platformId: string;
  permissions: string | null;
};

export type MembershipRow = {
  memberId: string;
  role: string;
  displayName: string | null;
};

export type GameSessionCredential = {
  id: string;
  organizationId: string;
  platformId: string;
  gameId: string;
  externalUserId: string;
  mode: string | null;
  status: GameSessionStatus;
  expiresAt: Date;
};
