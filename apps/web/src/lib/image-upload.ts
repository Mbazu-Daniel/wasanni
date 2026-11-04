import { apiFetch } from "@/lib/api-client";
import type { ImageUploadTicket } from "@wasanni/contracts";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage<T>(
  ticketUrl: string,
  attachUrl: string,
  file: File,
): Promise<T> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP or AVIF image.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error("Images need to stay under 5 MB.");
  }

  const { upload } = await apiFetch<{ upload: ImageUploadTicket }>(ticketUrl, {
    method: "POST",
    data: JSON.stringify({ contentType: file.type }),
  });

  const stored = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });

  if (!stored.ok) throw new Error("The image store refused the upload.");

  return apiFetch<T>(attachUrl, {
    method: "PUT",
    data: JSON.stringify({ key: upload.key }),
  });
}
