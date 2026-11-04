import { eq } from "drizzle-orm";
import { member, organization, user } from "@wasanni/db/schema";
import { createFixture } from "../tests/db/fixture.ts";

const task = process.argv[2] ?? "plan";

const agent = {
  AGENT_API_KEY: process.env.AGENT_API_KEY,
  AGENT_BASE_URL: process.env.AGENT_BASE_URL,
  AGENT_MODEL: process.env.AGENT_MODEL,
};

if (agent.AGENT_API_KEY === undefined || agent.AGENT_BASE_URL === undefined || agent.AGENT_MODEL === undefined) {
  throw new Error("AGENT_API_KEY, AGENT_BASE_URL and AGENT_MODEL are required");
}

const fixture = await createFixture({ env: agent });
const callAs = fixture.callAs;

const ownerEmail = `grade+${Date.now()}@example.com`;
const ownerCookie = await fixture.signUp(ownerEmail);
const owner = await fixture.db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
if (owner === undefined) throw new Error("owner was not created");

const [org] = await fixture.db.insert(organization).values({ name: "Grade Gym", slug: `grade-${Date.now().toString(36)}` }).returning();
if (org === undefined) throw new Error("organization insert returned no row");
await fixture.db.insert(member).values({ organizationId: org.id, userId: owner.id, role: "owner" });

const platformRes = await callAs(ownerCookie, "POST", `/api/v1/organizations/${org.id}/platforms`, {
  name: "Grade Arcade",
  slug: `grade-arcade-${Date.now().toString(36)}`,
});
const platformBody = (await platformRes.json()) as { platform: { id: string; slug: string } };
if (platformRes.status !== 201) throw new Error(`platform create failed: ${JSON.stringify(platformBody)}`);

const gameRes = await callAs(ownerCookie, "POST", `/api/v1/organizations/${org.id}/games`, {
  name: "Grade Runner",
  slug: `grade-runner-${Date.now().toString(36)}`,
  hosting: "external",
});
const gameBody = (await gameRes.json()) as { game: { id: string; slug: string } };
if (gameRes.status !== 201) throw new Error(`game create failed: ${JSON.stringify(gameBody)}`);

const prompts: Record<string, Record<string, unknown>> = {
  plan: {
    prompt: "Plan the integration of the Grade Runner game with Wasanni so its players' scores land on the leaderboard.",
    mode: "plan",
    gameId: gameBody.game.id,
  },
  read: {
    prompt: `List our games and platforms, and tell me whether Grade Runner is assigned to the ${platformBody.platform.slug} platform.`,
    mode: "agent",
  },
};

const body = prompts[task];
if (body === undefined) throw new Error(`unknown task ${task}; want plan or read`);

const response = await callAs(ownerCookie, "POST", `/api/v1/organizations/${org.id}/agents/run`, body);
const text = await response.text();

const events = text
  .split("\n\n")
  .filter((block) => block.startsWith("data: "))
  .map((block) => JSON.parse(block.slice(6)) as Record<string, unknown>);

await Bun.write(`/tmp/grade-${task}.json`, `${JSON.stringify({ task, status: response.status, events }, null, 2)}\n`);

for (const event of events) {
  if (event.kind === "tool") {
    console.log(`[tool] ${event.tool} ${event.state} ok=${event.ok}`);
  } else if (event.kind === "done") {
    console.log(`[done] model=${event.model} durationMs=${event.durationMs}`);
  } else if (event.kind === "error") {
    console.log(`[error] ${event.code}: ${event.message}`);
  }
}

const deltas = events.filter((event) => event.kind === "delta").map((event) => event.text).join("");
console.log(`\n--- output ---\n${deltas}\n--- end ---`);

await fixture.end();
