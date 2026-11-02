import {
  AvatarUploadTicketSingle,
  MemberIdParams,
  MemberList,
  MemberSingle,
  OrganizationIdParams,
  PERMISSION,
  RequestAvatarUpload,
  SetMemberAvatar,
  SetMemberRole,
  UpdateMemberName,
} from "@wasanni/contracts";
import { NotFoundError, organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { assertAvatarKey, assertAvatarUploaded, createAvatarUploadTicket } from "./avatar.ts";
import type { MemberDeps } from "./types.ts";

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

      if (member === null) throw new NotFoundError("member not found");
      return { member };
    }, {
      memberAuth: null,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Get the signed-in member record" },
    })
    .patch("/api/v1/organizations/:organizationId/members/me", async ({
      principal,
      body,
    }) => {
      const member = await service.setName(
        organizationScope(principal),
        principal.memberId,
        body.name,
      );

      return { member };
    }, {
      memberAuth: null,
      body: UpdateMemberName,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Update the signed-in member name" },
    })
    .put("/api/v1/organizations/:organizationId/members/:memberId/role", async ({
      principal,
      params,
      body,
    }) => {
      const member = await service.setRole(
        organizationScope(principal),
        params.memberId,
        body.role,
        principal.role,
      );

      return { member };
    }, {
      memberAuth: PERMISSION.memberUpdate,
      params: MemberIdParams,
      body: SetMemberRole,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Give a member a role" },
    })
    .get("/api/v1/organizations/:organizationId/members", async ({ principal }) => ({
      members: await service.list(organizationScope(principal)),
    }), {
      memberAuth: PERMISSION.memberRead,
      params: OrganizationIdParams,
      response: { 200: MemberList },
      detail: { tags: ["members"], summary: "List the members of an organization" },
    })
    .patch("/api/v1/organizations/:organizationId/members/:memberId", async ({
      principal,
      params,
      body,
    }) => {
      const member = await service.setName(
        organizationScope(principal),
        params.memberId,
        body.name,
      );

      return { member };
    }, {
      memberAuth: PERMISSION.memberUpdate,
      params: MemberIdParams,
      body: UpdateMemberName,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Rename a member of the organization" },
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
      memberAuth: null,
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
      await assertAvatarUploaded(storage, body.key);

      const member = await service.setAvatar(
        organizationScope(principal),
        principal.memberId,
        storage.publicUrl(body.key),
      );

      return { member };
    }, {
      memberAuth: null,
      body: SetMemberAvatar,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Attach an uploaded avatar to this member" },
    });
