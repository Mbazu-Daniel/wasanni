import type { Db } from "@wasanni/db";
import type { ObjectStorage, StorageLimits } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import { createTemplateBundleService } from "./template-bundle.service.ts";
import { createTemplateRoutes } from "./template.routes.ts";
import { createTemplateService } from "./template.service.ts";

type TemplateDeps = {
  db: Db;
  storage: ObjectStorage;
  config: StorageLimits;
};

export const createTemplatesRoutes = <T extends PrincipalApi>(
  api: T,
  deps: TemplateDeps,
) => {
  const service = createTemplateService(deps.db, deps.storage);
  const bundle = createTemplateBundleService(deps.db, deps.storage, deps.config);

  createTemplateRoutes(api, { service, bundle });

  return api;
};
