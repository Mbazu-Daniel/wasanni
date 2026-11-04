import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { agentProvider } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type {
  AgentProviderView,
  AgentSpecView,
  CreateAgentProviderBody,
  UpdateAgentProviderBody,
} from "@wasanni/contracts";
import type { Scope } from "@wasanni/kit";
import {
  BadRequestError,
  ConflictError,
  encryptSecret,
  newId,
  NotFoundError,
} from "@wasanni/kit";
import { listModels, resolveBaseUrl } from "./transport.ts";
import { loadAgentCatalog } from "./catalog.ts";
import { NO_KEY, type AgentInternals } from "./agent-internals.ts";
import type { AgentModuleDeps, ProviderRow } from "./types.ts";

const toView = (row: ProviderRow): AgentProviderView => ({
  id: row.id,
  name: row.name,
  spec: row.spec,
  baseUrl: row.baseUrl,
  model: row.model,
  hasKey: row.apiKeyCiphertext !== null,
  isDefault: row.isDefault,
  createdAt: row.createdAt.toISOString(),
});

const clearDefault = (
  organizationId: string,
  tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
) =>
  tx
    .update(agentProvider)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(agentProvider.organizationId, organizationId));

export function createAgentProviderService(deps: AgentModuleDeps, i: AgentInternals) {
  const { db, allowPrivateOutbound, encryptionKey } = deps;

  return {
    async specs(): Promise<AgentSpecView[]> {
      return (await loadAgentCatalog()).map((spec) => ({
        id: spec.id,
        label: spec.name,
        baseUrl: spec.baseUrl,
        models: spec.models,
      }));
    },

    async listProviders(scope: Scope): Promise<AgentProviderView[]> {
      const rows = await db
        .select()
        .from(agentProvider)
        .where(scopeTo(scope, agentProvider))
        .orderBy(desc(agentProvider.isDefault), asc(agentProvider.createdAt));

      return rows.map(toView);
    },

    async createProvider(
      scope: Scope,
      memberId: string,
      body: CreateAgentProviderBody,
    ): Promise<AgentProviderView> {
      const baseUrl = await resolveBaseUrl(body.spec, body.baseUrl, allowPrivateOutbound);

      try {
        return await db.transaction(async (tx) => {
          if (body.isDefault ?? false) await clearDefault(scope.organizationId, tx);

          const [row] = await tx
            .insert(agentProvider)
            .values({
              id: newId(),
              organizationId: scope.organizationId,
              name: body.name,
              spec: body.spec,
              baseUrl,
              model: body.model,
              apiKeyCiphertext:
                body.apiKey === undefined
                  ? null
                  : encryptSecret(body.apiKey, encryptionKey),
              isDefault: body.isDefault ?? false,
              createdByMemberId: memberId,
            })
            .returning();

          if (row === undefined) throw new NotFoundError("agent provider not found");

          return toView(row);
        });
      } catch (caught) {
        if (isUniqueViolation(caught)) {
          throw new ConflictError("this workspace already has a provider with that name");
        }
        throw caught;
      }
    },

    async updateProvider(
      scope: Scope,
      providerId: string,
      body: UpdateAgentProviderBody,
    ): Promise<AgentProviderView> {
      const current = await i.readProvider(scope, providerId);

      await db.transaction(async (tx) => {
        if (body.isDefault ?? false) await clearDefault(scope.organizationId, tx);

        await tx
          .update(agentProvider)
          .set({
            model: body.model,
            baseUrl:
              body.baseUrl === undefined
                ? undefined
                : await resolveBaseUrl(current.spec, body.baseUrl, allowPrivateOutbound),
            apiKeyCiphertext:
              body.apiKey === undefined
                ? undefined
                : encryptSecret(body.apiKey, encryptionKey),
            isDefault: body.isDefault,
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, agentProvider, eq(agentProvider.id, providerId)));
      });

      return toView(await i.readProvider(scope, providerId));
    },

    async deleteProvider(scope: Scope, providerId: string): Promise<void> {
      await i.readProvider(scope, providerId);

      await db
        .delete(agentProvider)
        .where(scopeTo(scope, agentProvider, eq(agentProvider.id, providerId)));
    },

    async models(
      scope: Scope,
      input: { spec?: string; baseUrl?: string; apiKey?: string; providerId?: string },
    ): Promise<string[]> {
      if (input.providerId !== undefined) {
        const row = await i.readProvider(scope, input.providerId);
        return listModels(i.endpointOf(row));
      }

      if (input.spec === undefined) {
        throw new BadRequestError("a provider or a provider spec is required");
      }

      return listModels(
        i.endpointFrom({
          spec: input.spec,
          baseUrl: await resolveBaseUrl(input.spec, input.baseUrl, allowPrivateOutbound),
          model: "",
          apiKey: input.apiKey ?? NO_KEY,
        }),
      );
    },
  };
}
