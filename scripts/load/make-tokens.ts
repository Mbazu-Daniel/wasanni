const [, , apiUrl, apiKey, gameId, count = "100"] = Bun.argv;

if (apiUrl === undefined || apiKey === undefined || gameId === undefined) {
  console.error(
    "usage: bun scripts/load/make-tokens.ts <api-url> <api-key> <game-id> [count]",
  );
  process.exit(1);
}

const sessions: { sessionId: string; sessionToken: string }[] = [];

for (let index = 0; index < Number(count); index += 1) {
  const response = await fetch(`${apiUrl}/api/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ gameId, externalUserId: `load_${index}` }),
  });

  if (!response.ok) {
    console.error(`session ${index} failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const body = (await response.json()) as { session: { id: string }; sessionToken: string };

  sessions.push({ sessionId: body.session.id, sessionToken: body.sessionToken });
}

await Bun.write("scripts/load/tokens.txt", JSON.stringify(sessions, null, 2));

console.log(`wrote ${sessions.length} session tokens to scripts/load/tokens.txt`);
