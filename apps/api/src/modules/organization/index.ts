import type { Db } from "@wasanni/db";
import type { PrincipalApi } from "../../plugins/types.ts";
import { createExportService } from "./export.service.ts";
import { createOrganizationRoutes } from "./organization.routes.ts";

export const createOrganizationModule = <T extends PrincipalApi>(
  api: T,
  db: Db,
) => {
  const exporter = createExportService(db);

  createOrganizationRoutes(api, { exporter });

  return api;
};
