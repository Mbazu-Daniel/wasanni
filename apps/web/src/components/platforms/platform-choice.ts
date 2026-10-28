import type { SelectOption } from "@/components/ui/select";

export type PlatformSummary = { id: string; name: string };

export type PlatformTarget =
  | { kind: "fixed"; platformId: string }
  | { kind: "pick"; platforms: PlatformSummary[] };

export const singlePlatformId = (target: PlatformTarget): string =>
  target.kind === "pick" && target.platforms.length === 1
    ? target.platforms[0]?.id ?? ""
    : "";

export const resolvePlatformId = (target: PlatformTarget, picked: string): string =>
  target.kind === "fixed"
    ? target.platformId
    : picked !== ""
      ? picked
      : singlePlatformId(target);

export const platformPickOptions = (platforms: PlatformSummary[]): SelectOption[] => [
  { value: "", label: "Choose a platform" },
  ...platforms.map((platform) => ({ value: platform.id, label: platform.name })),
];
