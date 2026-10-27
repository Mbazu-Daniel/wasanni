import {
  AvatarUploadTicketSingle,
  MemberSingle,
  RequestAvatarUpload,
  SetMemberAvatar,
  UpdateMemberDisplayName,
} from "@wasanni/contracts";
import {
  avatarUrlFor,
  badRequest,
  notFound,
  organizationScope,
  presignAvatarUpload,
  storageFromEnv,
  type Env,
  type StorageConfig,
} from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import { assertMemberAvatarKey, type MemberService } from "./service.ts";

type MemberDeps = {
  service: MemberService;
  env: Env;
};

function storageOf(env: Env): StorageConfig {
  const storage = storageFromEnv(env);
  if (storage === undefined) throw badRequest("avatar uploads are not configured");
  return storage;
}

function keyBelongsTo(key: string, organizationId: string, memberId: string): boolean {
  return key.startsWith(`members/${organizationId}/${memberId}/`);
}

export const memberRoutes = <T extends PrincipalApi>(
  api: T,
  { service, env }: MemberDeps,
) =>
  api
    .get("/api/v1/organizations/:organizationId/members/me", async ({ principal }) => {
      const member = await service.readSelf(
        organizationScope(principal),
        principal.memberId,
      );

      if (member === null) throw notFound("member not found");
      return { member };
    }, {
      organizationAuth: null,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Get the signed-in member record" },
    })
    .patch("/api/v1/organizations/:organizationId/members/me", async ({
      principal,
      body,
    }) => {
      const member = await service.setDisplayName(
        organizationScope(principal),
        principal.memberId,
        body.displayName,
      );

      return { member };
    }, {
      organizationAuth: null,
      body: UpdateMemberDisplayName,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Update the signed-in member display name" },
    })
    .post("/api/v1/organizations/:organizationId/members/me/avatar", async ({
      principal,
      body,
    }) => {
      const storage = storageOf(env);

      const ticket = await presignAvatarUpload(storage, {
        organizationId: principal.organizationId,
        memberId: principal.memberId,
        contentType: body.contentType,
      });

      return { upload: ticket };
    }, {
      organizationAuth: null,
      body: RequestAvatarUpload,
      response: { 200: AvatarUploadTicketSingle },
      detail: {
        tags: ["members"],
        summary: "Request a presigned url to upload this member's avatar",
      },
    })
    .put("/api/v1/organizations/:organizationId/members/me/avatar", async ({
      principal,
      body,
    }) => {
      if (!keyBelongsTo(body.key, principal.organizationId, principal.memberId)) {
        throw notFound("that avatar key belongs to another member");
      }
      assertMemberAvatarKey(body.key);

      const member = await service.setAvatar(
        organizationScope(principal),
        principal.memberId,
        avatarUrlFor(storageOf(env), body.key),
      );

      return { member };
    }, {
      organizationAuth: null,
      body: SetMemberAvatar,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Attach an uploaded avatar to this member" },
    });
