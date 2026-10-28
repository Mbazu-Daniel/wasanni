import { apiFetch } from "@/lib/api-client";
import type { AvatarUploadTicket } from "@wasanni/contracts";
import type { MemberRow } from "@/lib/member-types";

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadMemberAvatar(
  organizationId: string,
  file: File,
): Promise<MemberRow> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Use a JPEG, PNG, WebP or AVIF image.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Images need to stay under 5 MB.");

  const { upload } = await apiFetch<{ upload: AvatarUploadTicket }>(
    `/api/v1/organizations/${organizationId}/members/me/avatar`,
    { method: "POST", data: JSON.stringify({ contentType: file.type }) },
  );

  const stored = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });

  if (!stored.ok) throw new Error("The image store refused the upload.");

  const { member } = await apiFetch<{ member: MemberRow }>(
    `/api/v1/organizations/${organizationId}/members/me/avatar`,
    { method: "PUT", data: JSON.stringify({ key: upload.key }) },
  );

  return member;
}
