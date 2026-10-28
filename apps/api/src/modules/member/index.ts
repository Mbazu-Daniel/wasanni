import {
  AvatarUploadTicketSingle,
  MemberSingle,
  RequestAvatarUpload,
  SetMemberAvatar,
  UpdateMemberDisplayName,
} from "@wasanni/contracts";
import { notFound, organizationScope, type ObjectStorage } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import { assertAvatarKey, createAvatarUploadTicket } from "./avatar.ts";
import type { MemberService } from "./service.ts";

type MemberDeps = {
  service: MemberService;
  storage: ObjectStorage;
};

export const createMemberRoutes = <T extends PrincipalApi>(
  api: T,
  { service, storage }: MemberDeps,
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
      const ticket = await createAvatarUploadTicket(
        storage,
        principal.organizationId,
        principal.memberId,
        body.contentType,
      );

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
      assertAvatarKey(body.key, principal.organizationId, principal.memberId);

      const member = await service.setAvatar(
        organizationScope(principal),
        principal.memberId,
        storage.publicUrl(body.key),
      );

      return { member };
    }, {
      organizationAuth: null,
      body: SetMemberAvatar,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Attach an uploaded avatar to this member" },
    });
