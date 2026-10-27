import type { PrincipalApi } from "../../plugins/types.ts";
import { createTemplateBundleService } from "./template-bundle.service.ts";
import { createTemplateRoutes } from "./template.routes.ts";
import { createTemplateService } from "./template.service.ts";
import type { TemplatesDeps } from "./types.ts";

export const createTemplatesRoutes = <T extends PrincipalApi>(
  api: T,
  deps: TemplatesDeps,
) => {
  const service = createTemplateService(deps.db, deps.storage);
  const bundle = createTemplateBundleService(deps.db, deps.storage, deps.config);

  createTemplateRoutes(api, { service, bundle });

  return api;
};
