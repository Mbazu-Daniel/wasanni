import {
  OrganizationExport,
  OrganizationIdParams,
  OrganizationLogo,
  OrganizationLogoUploadTicketSingle,
  PERMISSION,
  RequestOrganizationLogoUpload,
  SetOrganizationLogo,
} from "@wasanni/contracts";
import type { ObjectStorage } from "@wasanni/kit";
import type { Db } from "@wasanni/db";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ExportService } from "./types.ts";
import { organizationLogoPrefix, setOrganizationLogo } from "./logo.service.ts";
import { createImageUploadTicket } from "../image/index.ts";

export const createOrganizationRoutes = <T extends PrincipalApi>(
  api: T,
  { exporter, storage, db }: { exporter: ExportService; storage: ObjectStorage; db: Db },
) =>
  api.post(
    "/api/v1/organizations/:organizationId/export",
    async ({ principal, set }) => {
      const data = await exporter.exportOrganizationData(principal.organizationId);
      const date = new Date().toISOString().slice(0, 10);

      set.headers["content-type"] = "application/json";
      set.headers["content-disposition"] =
        `attachment; filename="wasanni-${data.organization.slug}-${date}.json"`;

      return data;
    },
    {
      organizationAuth: PERMISSION.organizationUpdate,
      params: OrganizationIdParams,
      response: { 200: OrganizationExport },
      detail: { tags: ["organization"], summary: "Export all organization data as JSON" },
    },
  )
    .post(
      "/api/v1/organizations/:organizationId/logo",
      async ({ principal, body }) => {
        const ticket = await createImageUploadTicket(
          storage,
          organizationLogoPrefix(principal.organizationId),
          body.contentType,
        );

        return { upload: ticket };
      },
      {
        organizationAuth: PERMISSION.organizationUpdate,
        params: OrganizationIdParams,
        body: RequestOrganizationLogoUpload,
        response: { 200: OrganizationLogoUploadTicketSingle },
        detail: { tags: ["organizations"], summary: "Request a presigned url to upload this organization's logo" },
      },
    )
    .put(
      "/api/v1/organizations/:organizationId/logo",
      async ({ principal, body }) => {
        const logo = await setOrganizationLogo(db, storage, principal.organizationId, body.key);

        return { logo };
      },
      {
        organizationAuth: PERMISSION.organizationUpdate,
        params: OrganizationIdParams,
        body: SetOrganizationLogo,
        response: { 200: OrganizationLogo },
        detail: { tags: ["organizations"], summary: "Attach an uploaded organization logo" },
      },
    );
