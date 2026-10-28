import { AUTH_ROUTE_PREFIX } from "../../constants.ts";
import type { BetterAuth } from "../../config/types.ts";
import type { AuthApiDocument } from "./types.ts";

export async function buildAuthApiDocument(auth: BetterAuth): Promise<AuthApiDocument> {
  const generated = await auth.api.generateOpenAPISchema();
  const separator = AUTH_ROUTE_PREFIX.endsWith("/") ? "" : "/";

  const paths = Object.fromEntries(
    Object.entries(generated.paths).map(([path, operations]) => [
      `${AUTH_ROUTE_PREFIX}${separator}${path.replace(/^\//, "")}`,
      operations,
    ]),
  );

  return { paths, components: generated.components } as AuthApiDocument;
}
