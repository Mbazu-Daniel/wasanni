import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export type SocialProvider = "google" | "github";

export function useSocialProviders(): SocialProvider[] {
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () =>
      apiFetch<{ providers: string[] }>("/api/v1/auth/providers"),
    staleTime: Infinity,
    retry: false,
  });

  return (data?.providers ?? []).filter(
    (provider): provider is SocialProvider =>
      provider === "google" || provider === "github",
  );
}
