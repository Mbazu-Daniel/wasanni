import type { CreateTemplateBody, UpdateTemplateBody, UploadTemplateBody } from "@wasanni/contracts";

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
