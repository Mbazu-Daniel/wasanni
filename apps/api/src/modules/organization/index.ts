import { notFound } from "@wasanni/kit";
import {
  InvitationIdParams,
  InvitationList,
  InviteMemberBody,
  OrganizationIdParams,
  OrganizationSingle,
  OrganizationSummaryList,
  PERMISSION,
} from "@wasanni/contracts";
import type { BetterAuth } from "../../config/better-auth.ts";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { OrganizationService } from "./service.ts";

type OrganizationDeps = {
  auth: BetterAuth;
  service: OrganizationService;
};

export const organizationRoutes = <T extends PrincipalApi>(
  api: T,
  { auth, service }: OrganizationDeps,
) =>
  api
    .get("/api/v1/organizations", async ({ user }) => ({
      organizations: await service.getForMember(user.id),
    }), {
      auth: true,
      response: { 200: OrganizationSummaryList },
      detail: { tags: ["organizations"], summary: "List my organizations" },
    })
    .get("/api/v1/organizations/:organizationId", async ({ principal }) => {
      const organizations = await service.getForMember(principal.userId);
      const found = organizations.find((o) => o.id === principal.organizationId);
      if (!found) throw notFound("organization not found");
      return { organization: found };
    }, {
      organizationAuth: PERMISSION.organizationRead,
      params: OrganizationIdParams,
      response: { 200: OrganizationSingle },
      detail: { tags: ["organizations"], summary: "Get one organization" },
    })
    .get("/api/v1/organizations/:organizationId/invitations", async ({ principal }) => ({
      invitations: await service.getInvitationsForOrganization(principal.organizationId),
    }), {
      organizationAuth: PERMISSION.invitationRead,
      params: OrganizationIdParams,
      response: { 200: InvitationList },
      detail: { tags: ["invitations"], summary: "List organization invitations" },
    })
    .post("/api/v1/organizations/:organizationId/invitations", async ({
      principal,
      body,
      request,
    }) => {
      await auth.api.createInvitation({
        body: { email: body.email, role: body.role, organizationId: principal.organizationId },
        headers: request.headers,
      });
      return { invitations: await service.getInvitationsForOrganization(principal.organizationId) };
    }, {
      organizationAuth: PERMISSION.invitationCreate,
      body: InviteMemberBody,
      response: { 200: InvitationList },
      detail: { tags: ["invitations"], summary: "Invite a member by email" },
    })
    .delete("/api/v1/organizations/:organizationId/invitations/:invitationId", async ({
      params,
      request,
      status,
    }) => {
      await auth.api.cancelInvitation({
        body: { invitationId: params.invitationId },
        headers: request.headers,
      });
      return status(204);
    }, {
      organizationAuth: PERMISSION.invitationCancel,
      params: InvitationIdParams,
      detail: { tags: ["invitations"], summary: "Cancel an invitation" },
    });
