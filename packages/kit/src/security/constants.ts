export const ARGON = {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
} as const satisfies Bun.Password.Argon2Algorithm;
