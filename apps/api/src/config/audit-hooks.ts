import type { AuditService } from "../modules/audit/service.ts";
import type { AuditActor, AuditEvent } from "../modules/audit/types.ts";

type HookContext = {
  context?: { session?: { user?: { id?: string } } | null } | undefined;
  request?: { headers?: Headers } | undefined;
};

type HookUser = { id: string; email?: string; name?: string };
type HookSession = { id: string; userId: string };
type HookAccount = { id: string; userId: string; providerId: string };
type HookOrganization = { id: string; name?: string };
type HookMember = { id: string; userId: string; role?: string };
type HookInvitation = { id: string; email?: string; role?: string | null };

const actorOf = (ctx: HookContext | null): AuditActor => {
  const userId = ctx?.context?.session?.user?.id;
  return userId === undefined ? { type: "system" } : { type: "user", userId };
};

const contextOf = (ctx: HookContext | null): Pick<AuditEvent, "ipAddress" | "userAgent"> => {
  const headers = ctx?.request?.headers;

  if (headers === undefined) return { ipAddress: null, userAgent: null };

  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("cf-connecting-ip"),
    userAgent: headers.get("user-agent"),
  };
};

export function createDatabaseAuditHooks(audit: AuditService) {
  return {
    user: {
      create: {
        after: async (user: HookUser, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: actorOf(ctx),
            source: "auth",
            action: "user.created",
            resourceType: "user",
            resourceId: user.id,
            metadata: { email: user.email, name: user.name },
            ...contextOf(ctx),
          });
        },
      },
      update: {
        after: async (user: HookUser, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: actorOf(ctx),
            source: "auth",
            action: "user.updated",
            resourceType: "user",
            resourceId: user.id,
            ...contextOf(ctx),
          });
        },
      },
      delete: {
        after: async (user: HookUser, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: actorOf(ctx),
            source: "auth",
            action: "user.deleted",
            resourceType: "user",
            resourceId: user.id,
            ...contextOf(ctx),
          });
        },
      },
    },

    session: {
      create: {
        after: async (session: HookSession, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: { type: "user", userId: session.userId },
            source: "auth",
            action: "session.created",
            resourceType: "session",
            resourceId: session.id,
            ...contextOf(ctx),
          });
        },
      },
      delete: {
        after: async (session: HookSession, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: { type: "user", userId: session.userId },
            source: "auth",
            action: "session.revoked",
            resourceType: "session",
            resourceId: session.id,
            ...contextOf(ctx),
          });
        },
      },
    },

    account: {
      create: {
        after: async (account: HookAccount, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: { type: "user", userId: account.userId },
            source: "auth",
            action: "account.linked",
            resourceType: "account",
            resourceId: account.id,
            metadata: { provider: account.providerId },
            ...contextOf(ctx),
          });
        },
      },
      delete: {
        after: async (account: HookAccount, ctx: HookContext | null) => {
          await audit.record({
            organizationId: null,
            actor: { type: "user", userId: account.userId },
            source: "auth",
            action: "account.unlinked",
            resourceType: "account",
            resourceId: account.id,
            metadata: { provider: account.providerId },
            ...contextOf(ctx),
          });
        },
      },
    },
  };
}

export function createOrganizationAuditHooks(audit: AuditService) {
  return {
    afterCreateOrganization: async (ctx: {
      organization: HookOrganization;
      member: HookMember;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "organization.created",
        resourceType: "organization",
        resourceId: ctx.organization.id,
        metadata: { name: ctx.organization.name },
      });
    },

    afterUpdateOrganization: async (ctx: {
      organization: HookOrganization | null;
      user: HookUser;
      member: HookMember;
    }) => {
      if (ctx.organization === null) return;

      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "organization.updated",
        resourceType: "organization",
        resourceId: ctx.organization.id,
      });
    },

    afterDeleteOrganization: async (ctx: {
      organization: HookOrganization;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: null,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "organization.deleted",
        resourceType: "organization",
        resourceId: ctx.organization.id,
      });
    },

    afterAddMember: async (ctx: {
      organization: HookOrganization;
      member: HookMember;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "member.added",
        resourceType: "member",
        resourceId: ctx.member.id,
        metadata: { userId: ctx.member.userId, role: ctx.member.role },
      });
    },

    afterRemoveMember: async (ctx: {
      organization: HookOrganization;
      member: HookMember;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "member.removed",
        resourceType: "member",
        resourceId: ctx.member.id,
        metadata: { userId: ctx.member.userId },
      });
    },

    afterUpdateMemberRole: async (ctx: {
      organization: HookOrganization;
      member: HookMember;
      user: HookUser;
      previousRole: string;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "member.role_changed",
        resourceType: "member",
        resourceId: ctx.member.id,
        metadata: {
          userId: ctx.member.userId,
          previousRole: ctx.previousRole,
          role: ctx.member.role,
        },
      });
    },

    afterCreateInvitation: async (ctx: {
      organization: HookOrganization;
      invitation: HookInvitation;
      inviter: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.inviter.id },
        source: "organization",
        action: "invitation.created",
        resourceType: "invitation",
        resourceId: ctx.invitation.id,
        metadata: { email: ctx.invitation.email, role: ctx.invitation.role },
      });
    },

    afterAcceptInvitation: async (ctx: {
      organization: HookOrganization;
      invitation: HookInvitation;
      member: HookMember;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "invitation.accepted",
        resourceType: "invitation",
        resourceId: ctx.invitation.id,
        metadata: { memberId: ctx.member.id },
      });
    },

    afterCancelInvitation: async (ctx: {
      organization: HookOrganization;
      invitation: HookInvitation;
      cancelledBy: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.cancelledBy.id },
        source: "organization",
        action: "invitation.cancelled",
        resourceType: "invitation",
        resourceId: ctx.invitation.id,
      });
    },

    afterRejectInvitation: async (ctx: {
      organization: HookOrganization;
      invitation: HookInvitation;
      user: HookUser;
    }) => {
      await audit.record({
        organizationId: ctx.organization.id,
        actor: { type: "user", userId: ctx.user.id },
        source: "organization",
        action: "invitation.rejected",
        resourceType: "invitation",
        resourceId: ctx.invitation.id,
      });
    },
  };
}
