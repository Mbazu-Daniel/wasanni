export async function sign(
  secret: string,
  message: string,
  encoding: "hex" | "base64url",
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );

  if (encoding === "hex") {
    return Array.from(signature)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
