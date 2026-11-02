import { eq } from "drizzle-orm";
import { BadRequestError, newId, NotFoundError, type ObjectStorage } from "@wasanni/kit";
import { organization } from "@wasanni/db/schema";
import type { Db } from "@wasanni/db";
import type { OrganizationLogoUploadTicket } from "@wasanni/contracts";
import {
  ORGANIZATION_LOGO_EXTENSIONS,
  ORGANIZATION_LOGO_MAX_BYTES,
  ORGANIZATION_LOGO_TYPES,
  ORGANIZATION_LOGO_UPLOAD_TTL_SECONDS,
} from "./constants.ts";

export const ORGANIZATION_LOGO_KEY_PATTERN = /^[^/]+\/organizations\/[0-9a-f-]{36}\.[a-z0-9]+$/;

export function resolveOrganizationLogoKey(
  organizationId: string,
  contentType: string,
): string {
  const extension = ORGANIZATION_LOGO_EXTENSIONS[contentType];
  if (extension === undefined) throw new BadRequestError("unsupported logo content type");

  return `${organizationId}/organizations/${newId()}.${extension}`;
}

export function assertOrganizationLogoKey(
  key: string,
  organizationId: string,
): void {
  if (!ORGANIZATION_LOGO_KEY_PATTERN.test(key)) {
    throw new NotFoundError("that logo key is not one this api issued");
  }

  if (!key.startsWith(`${organizationId}/organizations/`)) {
    throw new NotFoundError("that logo key belongs to another organization");
  }
}

export async function createOrganizationLogoUploadTicket(
  storage: ObjectStorage,
  organizationId: string,
  contentType: string,
): Promise<OrganizationLogoUploadTicket> {
  if (!ORGANIZATION_LOGO_TYPES.includes(contentType as (typeof ORGANIZATION_LOGO_TYPES)[number])) {
    throw new BadRequestError("unsupported logo content type");
  }

  const key = resolveOrganizationLogoKey(organizationId, contentType);

  const target = await storage.createUploadTarget({
    key,
    contentType,
    expiresInSeconds: ORGANIZATION_LOGO_UPLOAD_TTL_SECONDS,
  });

  return {
    uploadUrl: target.url,
    key,
    expiresAt: target.expiresAt,
    maxBytes: ORGANIZATION_LOGO_MAX_BYTES,
    allowedTypes: [...ORGANIZATION_LOGO_TYPES],
  };
}

export async function setOrganizationLogo(
  db: Db,
  storage: ObjectStorage,
  organizationId: string,
  key: string,
): Promise<string> {
  assertOrganizationLogoKey(key, organizationId);

  const logo = storage.publicUrl(key);

  const [row] = await db
    .update(organization)
    .set({ logo })
    .where(eq(organization.id, organizationId))
    .returning();

  if (row === undefined) throw new NotFoundError("organization not found");

  return logo;
}
