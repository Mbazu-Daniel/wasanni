import type { ObjectStorage } from "@wasanni/kit";
import type { createMemberService } from "./service.ts";

export type MemberRow = {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  displayName: string | null;
  joinedAt: Date;
};

export type MemberService = ReturnType<typeof createMemberService>;

export type MemberDeps = {
  service: MemberService;
  storage: ObjectStorage;
};
