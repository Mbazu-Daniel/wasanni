import { OrganizationIdParams, PERMISSION } from "@wasanni/contracts";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ExportService } from "./types.ts";

export const createOrganizationRoutes = <T extends PrincipalApi>(
  api: T,
  { exporter }: { exporter: ExportService },
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
      detail: { tags: ["organization"], summary: "Export all organization data as JSON" },
    },
  );
