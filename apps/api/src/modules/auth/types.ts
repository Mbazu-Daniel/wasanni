import type { OpenAPIV3_1 } from "openapi-types";

export type AuthApiDocument = Pick<OpenAPIV3_1.Document, "paths" | "components">;
