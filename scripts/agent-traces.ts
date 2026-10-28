import { createDb } from "@wasanni/db";
import { readEnv } from "@wasanni/kit";

const schema = process.env.MASTRA_SCHEMA ?? "mastra";

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  spanType: string | null;
  error: string | null;
  seconds: number | null;
}

const arg = Bun.argv[2];
const { sql } = createDb(readEnv().DATABASE_URL, { max: 1 });

const qualified = /^[a-z_][a-z0-9_]*$/i.test(schema) ? `${schema}.mastra_ai_spans` : "mastra_ai_spans";

const located =
  arg === undefined
    ? sql`"error" is not null`
    : sql`("runId" = ${arg} or "traceId" = ${arg})`;

const rows = await sql<Span[]>`
  select
    "traceId", "spanId", "parentSpanId", "name", "spanType",
    case
      when "error" is null then null
      else coalesce("error"->>'message', "error"::text)
    end as error,
    case
      when "endedAtZ" is null then null
      else extract(epoch from ("endedAtZ" - "startedAtZ"))::float8
    end as seconds
    from ${sql.unsafe(qualified)}
   where "traceId" = (
     select "traceId" from ${sql.unsafe(qualified)}
      where ${located}
      order by "startedAtZ" desc limit 1
   )
   order by "startedAtZ" asc
`;

if (rows.length === 0) {
  console.log(
    arg === undefined
      ? "no failing span in this database yet — run the agent, then try again"
      : `no span matches ${arg}`,
  );

  await sql.end();
  process.exit(0);
}

const byParent = new Map<string | null, Span[]>();

for (const row of rows) {
  const siblings = byParent.get(row.parentSpanId);

  if (siblings === undefined) byParent.set(row.parentSpanId, [row]);
  else siblings.push(row);
}

const known = new Set(rows.map((row) => row.spanId));

const line = (row: Span): string =>
  `${row.error === null ? "" : "x "}${row.name} [${row.spanType ?? "-"}]${
    row.seconds === null ? "" : ` ${row.seconds.toFixed(2)}s`
  }`;

const render = (row: Span, depth: number): void => {
  const pad = "  ".repeat(depth);

  console.log(`${pad}${line(row)}`);

  if (row.error !== null) console.log(`${pad}  ${(row.error.split("\n")[0] ?? row.error).slice(0, 300)}`);

  for (const child of byParent.get(row.spanId) ?? []) render(child, depth + 1);
};

console.log(`trace ${rows[0]?.traceId ?? ""}  ${arg === undefined ? "(newest failing run)" : arg}`);

for (const row of rows) {
  if (row.parentSpanId === null || !known.has(row.parentSpanId)) render(row, 1);
}

await sql.end();
