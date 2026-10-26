import type { OpenAPIV3_1 } from "openapi-types";
import { AUTH_ROUTE_PREFIX } from "./constants.ts";
import type { Auth } from "./auth.ts";

export type AuthApiDocument = Pick<OpenAPIV3_1.Document, "paths" | "components">;

export async function authApiDocument(auth: Auth): Promise<AuthApiDocument> {
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
