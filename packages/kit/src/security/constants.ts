export const ARGON = {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
} as const satisfies Bun.Password.Argon2Algorithm;

export const API_KEY_PREFIX = "wsk";
export const API_KEY_PREFIX_BYTES = 5;
export const API_KEY_SECRET_BYTES = 24;
