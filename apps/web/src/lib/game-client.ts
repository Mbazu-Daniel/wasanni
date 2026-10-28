import { apiBaseURL } from "./auth-client";
import type { CreatedGameSession } from "@wasanni/contracts";

const PLAYER_IDS_KEY = "wasanni:player-ids";

type PlayerIds = Record<string, string>;

const normalizedEmailOf = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  if (normalized === "") throw new Error("an email is required");
  return normalized;
};

const readPlayerIds = (): PlayerIds => {
  if (typeof window === "undefined") return {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PLAYER_IDS_KEY) ?? "{}");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([email, id]) => typeof email === "string" && typeof id === "string",
      ),
    );
  } catch {
    return {};
  }
};

export function playerIdForEmail(email: string): string {
  if (typeof window === "undefined") throw new Error("player identity requires a browser");
  const normalizedEmail = normalizedEmailOf(email);
  const playerIds = readPlayerIds();
  const existing = playerIds[normalizedEmail];
  if (existing !== undefined) return existing;

  const id = crypto.randomUUID();
  playerIds[normalizedEmail] = id;
  window.localStorage.setItem(PLAYER_IDS_KEY, JSON.stringify(playerIds));
  return id;
}

export async function createGameSession(input: {
  apiKey: string;
  gameId: string;
  email: string;
  name?: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}): Promise<CreatedGameSession> {
  const response = await fetch(`${apiBaseURL}/api/v1/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.apiKey,
    },
    body: JSON.stringify({
      gameId: input.gameId,
      externalUserId: playerIdForEmail(input.email),
      ...(input.name === undefined ? {} : { externalUserName: input.name }),
      ...(input.mode === undefined ? {} : { mode: input.mode }),
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? `session creation failed with ${response.status}`);
  }

  return response.json();
}
