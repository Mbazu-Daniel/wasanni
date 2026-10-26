export const NODE_ENVS = ["development", "test", "production"] as const;

export const DEFAULT_NODE_ENV = "development";
export const DEFAULT_PORT = 3000;
export const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

export const PORT_RANGE = { min: 1, max: 65535 } as const;
export const SECRET_MIN_LENGTH = 32;
