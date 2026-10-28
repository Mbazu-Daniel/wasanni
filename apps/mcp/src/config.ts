export type McpConfig = {
  readonly baseUrl: string;
  readonly apiKey: string;
};

export const readConfig = (env: Record<string, string | undefined>): McpConfig => {
  const apiKey = env.WASANNI_API_KEY ?? "";
  const baseUrl = env.WASANNI_BASE_URL ?? "";

  if (apiKey === "") {
    throw new Error(
      "WASANNI_API_KEY is required. Create a platform key with POST /api/v1/organizations/{organizationId}/platforms/{platformId}/keys and paste the secret it returns.",
    );
  }

  if (baseUrl === "") {
    throw new Error("WASANNI_BASE_URL is required, for example http://localhost:8088.");
  }

  const url = new URL(baseUrl);

  return { baseUrl: url.href.replace(/\/$/, ""), apiKey };
};
