import {
  MemberIdParams,
  MemberList,
  MemberSingle,
  OrganizationIdParams,
  SelfMemberBody,
  UpdateMemberBody,
} from "@wasanni/contracts";
import { PERMISSION } from "@wasanni/contracts";
import { notFound } from "@wasanni/kit";
import type { BetterAuth } from "../../config/better-auth.ts";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { MemberService } from "./service.ts";

type MemberDeps = {
  auth: BetterAuth;
  service: MemberService;
};

export const memberRoutes = <T extends PrincipalApi>(api: T, { auth, service }: MemberDeps) =>
  api
    .get("/api/v1/organizations/:organizationId/members", async ({ principal }) => {
      return { members: await service.getForOrganization(principal.organizationId) };
    }, {
      organizationAuth: PERMISSION.memberRead,
      params: OrganizationIdParams,
      response: { 200: MemberList },
      detail: { tags: ["members"], summary: "List organization members" },
    })
    .get("/api/v1/organizations/:organizationId/members/me", async ({ principal }) => {
      const member = await service.getForUser(principal.organizationId, principal.userId);
      if (!member) throw notFound("member not found");
      return { member };
    }, {
      organizationAuth: null,
      params: OrganizationIdParams,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Get the signed-in member record" },
    })
    .patch("/api/v1/organizations/:organizationId/members/me", async ({ principal, body }) => {
      await service.setDisplayName({
        organizationId: principal.organizationId,
        memberId: principal.memberId,
        displayName: body.displayName,
      });

      const member = await service.getForUser(principal.organizationId, principal.userId);
      if (!member) throw notFound("member not found");
      return { member };
    }, {
      organizationAuth: null,
      params: OrganizationIdParams,
      body: SelfMemberBody,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Update the signed-in member display name" },
    })
    .patch("/api/v1/organizations/:organizationId/members/:memberId", async ({
      params,
      body,
      request,
    }) => {
      if (body.role !== undefined) {
        await auth.api.updateMemberRole({
          body: { memberId: params.memberId, role: body.role, organizationId: params.organizationId },
          headers: request.headers,
        });
      }

      if (body.displayName !== undefined) {
        await service.setDisplayName({
          organizationId: params.organizationId,
          memberId: params.memberId,
          displayName: body.displayName,
        });
      }

      const member = await service.getById(params.organizationId, params.memberId);
      if (!member) throw notFound("member not found");
      return { member };
    }, {
      organizationAuth: PERMISSION.memberUpdate,
      params: MemberIdParams,
      body: UpdateMemberBody,
      response: { 200: MemberSingle },
      detail: { tags: ["members"], summary: "Update a member role or display name" },
    })
    .delete("/api/v1/organizations/:organizationId/members/:memberId", async ({
      principal,
      params,
      status,
    }) => {
      await service.remove(principal.organizationId, params.memberId);

      return status(204);
    }, {
      organizationAuth: PERMISSION.memberDelete,
      params: MemberIdParams,
      detail: { tags: ["members"], summary: "Remove a member" },
    })
    .delete("/api/v1/organizations/:organizationId/members/me", async ({ principal, status }) => {
      await service.remove(principal.organizationId, principal.memberId);

      return status(204);
    }, {
      organizationAuth: null,
      params: OrganizationIdParams,
      detail: { tags: ["members"], summary: "Leave the organization" },
    });
