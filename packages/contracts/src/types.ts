import { ID_PREFIXES } from "./constants.ts";

export type IdPrefix = (typeof ID_PREFIXES)[number];

export type EnvelopeSource = {
  code: string;
  message: string;
  details?: unknown;
};
