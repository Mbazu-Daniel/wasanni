import { t, type UnwrapSchema } from "elysia";

export const AssistantTurn = t.Object({
  role: t.Union([t.Literal("user"), t.Literal("assistant")]),
  text: t.String({ minLength: 1, maxLength: 8_000 }),
});
export type AssistantTurn = UnwrapSchema<typeof AssistantTurn>;

export const AssistantRunBody = t.Object({
  messages: t.Array(AssistantTurn, { minItems: 1, maxItems: 40 }),
});
export type AssistantRunBody = UnwrapSchema<typeof AssistantRunBody>;
