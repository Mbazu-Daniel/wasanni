import type { Db } from "@wasanni/db";
import type { ObjectStorage } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { createExportService } from "./export.service.ts";
import { createOrganizationRoutes } from "./organization.routes.ts";

export const createOrganizationModule = <T extends PrincipalApi>(
  api: T,
  db: Db,
  storage: ObjectStorage,
) => {
  const exporter = createExportService(db);

  createOrganizationRoutes(api, { exporter, storage, db });

  return api;
};
