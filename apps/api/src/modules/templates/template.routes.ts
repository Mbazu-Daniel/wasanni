import {
  CreateTemplateBody,
  DownloadUrlSingle,
  PERMISSION,
  TemplateIdParams,
  TemplateList,
  TemplateQuery,
  TemplateSingle,
  TemplateUpload,
  UpdateTemplateBody,
  UploadTemplateBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { TemplateRouteDeps } from "./types.ts";

export const createTemplateRoutes = <T extends PrincipalApi>(
  api: T,
  { service, bundle }: TemplateRouteDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/templates",
      async ({ principal, query }) => ({
        templates: await service.list(organizationScope(principal), query.kind),
      }),
      {
        organizationAuth: PERMISSION.templateRead,
        query: TemplateQuery,
        response: { 200: TemplateList },
        detail: { tags: ["templates"], summary: "List the organization's templates" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/templates",
      async ({ principal, body, status }) => {
        const created = await service.create(organizationScope(principal), { body });
        return status(201, { template: created });
      },
      {
        organizationAuth: PERMISSION.templateCreate,
        body: CreateTemplateBody,
        response: { 201: TemplateSingle },
        detail: { tags: ["templates"], summary: "Create a template" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/templates/:templateId",
      async ({ principal, params }) => ({
        template: await service.get(organizationScope(principal), params.templateId),
      }),
      {
        organizationAuth: PERMISSION.templateRead,
        params: TemplateIdParams,
        response: { 200: TemplateSingle },
        detail: { tags: ["templates"], summary: "Read one template" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/templates/:templateId",
      async ({ principal, params, body }) => ({
        template: await service.update(organizationScope(principal), {
          templateId: params.templateId,
          body,
        }),
      }),
      {
        organizationAuth: PERMISSION.templateUpdate,
        params: TemplateIdParams,
        body: UpdateTemplateBody,
        response: { 200: TemplateSingle },
        detail: { tags: ["templates"], summary: "Update a template" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/templates/:templateId/upload",
      async ({ principal, params, body, status }) => {
        const result = await bundle.createUpload(organizationScope(principal), {
          templateId: params.templateId,
          body,
        });
        return status(201, result);
      },
      {
        organizationAuth: PERMISSION.templateUpdate,
        params: TemplateIdParams,
        body: UploadTemplateBody,
        response: { 201: TemplateUpload },
        detail: { tags: ["templates"], summary: "Ask for an upload url for a template bundle" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/templates/:templateId/complete",
      async ({ principal, params }) => ({
        template: await bundle.completeUpload(
          organizationScope(principal),
          params.templateId,
        ),
      }),
      {
        organizationAuth: PERMISSION.templateUpdate,
        params: TemplateIdParams,
        response: { 200: TemplateSingle },
        detail: { tags: ["templates"], summary: "Confirm an uploaded template bundle" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/templates/:templateId/download-url",
      async ({ principal, params }) => ({
        url: await bundle.createDownloadUrl(
          organizationScope(principal),
          params.templateId,
        ),
      }),
      {
        organizationAuth: PERMISSION.templateRead,
        params: TemplateIdParams,
        response: { 200: DownloadUrlSingle },
        detail: { tags: ["templates"], summary: "Ask for a download url for a template bundle" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/templates/:templateId",
      async ({ principal, params, status }) => {
        await service.remove(organizationScope(principal), params.templateId);
        return status(204);
      },
      {
        organizationAuth: PERMISSION.templateDelete,
        params: TemplateIdParams,
        detail: { tags: ["templates"], summary: "Delete a template" },
      },
    );
