import type {
  CreateTemplateBody,
  UpdateTemplateBody,
  UploadTemplateBody,
} from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import type { template } from "@wasanni/db/schema";
import type { ObjectStorage, StorageLimits } from "@wasanni/kit";
import type { createTemplateBundleService } from "./template-bundle.service.ts";
import type { createTemplateService } from "./template.service.ts";

export type TemplateCreateInput = {
  body: CreateTemplateBody;
};

export type TemplateUpdateInput = {
  templateId: string;
  body: UpdateTemplateBody;
};

export type TemplateUploadInput = {
  templateId: string;
  body: UploadTemplateBody;
};

export type TemplateRow = (typeof template.$inferSelect);

export type TemplateService = ReturnType<typeof createTemplateService>;

export type TemplateBundleService = ReturnType<typeof createTemplateBundleService>;

export type TemplatesDeps = {
  db: Db;
  storage: ObjectStorage;
  config: StorageLimits;
};

export type TemplateRouteDeps = {
  service: TemplateService;
  bundle: TemplateBundleService;
};
