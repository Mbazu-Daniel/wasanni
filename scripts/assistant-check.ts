import { createApp } from "../apps/api/src/app.ts";
import { appDeps, testEnv } from "../tests/api/app-deps.ts";

const question = process.argv[2] ?? "How does the realtime leaderboard connection work?";

const app = await createApp(
  appDeps({
    env: testEnv({
      AGENT_API_KEY: process.env.AGENT_API_KEY,
      AGENT_BASE_URL: process.env.AGENT_BASE_URL,
      AGENT_MODEL: process.env.AGENT_MODEL,
    }),
  }),
);

const response = await app.handle(
  new Request("http://localhost/api/v1/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: question }] }),
  }),
);

const text = await response.text();
let answer = "";

for (const block of text.split("\n\n")) {
  if (!block.startsWith("data: ")) continue;
  const event = JSON.parse(block.slice(6)) as { kind: string; text?: string; tool?: string; state?: string };
  if (event.kind === "tool") console.log(`[tool] ${event.tool} ${event.state}`);
  if (event.kind === "delta") answer += event.text ?? "";
}

console.log(`\n--- answer ---\n${answer}\n--- end ---`);
